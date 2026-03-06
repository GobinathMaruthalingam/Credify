import io
import os
import aiohttp
import smtplib
import base64
import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from database import get_db
from models import User, Project, DispatchJob, Certificate
from auth import get_current_user
from schemas import ProjectCreate, ProjectResponse, PreviewRequest, ProjectMappingUpdate, DispatchJobResponse
from storage import upload_file_to_s3
from services import generate_preview
from dispatch import process_dispatch_job
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

class DispatchRequest(BaseModel):
    csv_data: list[dict]
    email_subject: str
    email_body: str

router = APIRouter(prefix="/api/projects", tags=["projects"])

async def download_file(url: str) -> bytes:
    # If the URL is our mock local URL, we would normally handle it differently,
    # but for simplicity, we treat it as an honest HTTP fetch.
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status != 200:
                raise HTTPException(status_code=400, detail=f"Failed to fetch {url}")
            return await response.read()

@router.post("/upload")
async def upload_asset(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """
    Upload a template or font to Cloud Storage (or local mock block).
    Returns the public URL of the uploaded asset.
    """
    try:
        url = await upload_file_to_s3(file)
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/preview")
async def preview_certificate(req: PreviewRequest, current_user: User = Depends(get_current_user)):
    """
    Downloads the template and font, processes it using the backend generation service,
    and returns a live generated PNG image.
    """
    try:
        template_bytes = await download_file(req.template_url)
        
        if req.is_qrcode:
            font_bytes = b""
        else:
            if not req.font_url:
                raise HTTPException(status_code=400, detail="font_url is required for text rendering")
            font_bytes = await download_file(req.font_url)
                
        result_bytes = generate_preview(
            template_bytes=template_bytes,
            font_bytes=font_bytes,
            text=req.text,
            bbox_x=req.bbox_x,
            bbox_y=req.bbox_y,
            bbox_width=req.bbox_width,
            bbox_height=req.bbox_height,
            text_color=req.text_color,
            initial_font_size=req.font_size,
            is_qrcode=req.is_qrcode,
            qr_url=req.qr_url
        )
        
        return StreamingResponse(io.BytesIO(result_bytes), media_type="image/png")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=ProjectResponse)
async def create_project(project: ProjectCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Standard DB schema save 
    new_project = Project(
        name=project.name, 
        template_url=project.template_url,
        owner_id=current_user.id
    )
    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)
    return new_project

@router.put("/{project_id}/mapping", response_model=ProjectResponse)
async def update_project_mapping(project_id: int, payload: ProjectMappingUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.owner_id == current_user.id))
    project = result.scalars().first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    project.mapping_data = payload.mapping_data
    if payload.name:
        project.name = payload.name
        
    await db.commit()
    await db.refresh(project)
    return project

@router.get("/", response_model=list[ProjectResponse])
async def list_projects(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.owner_id == current_user.id))
    projects = result.scalars().all()
    return projects

@router.post("/{project_id}/dispatch", response_model=DispatchJobResponse)
async def dispatch_project(project_id: int, req: DispatchRequest, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.owner_id == current_user.id))
    project = result.scalars().first()
    
    if not project:
        logger.error(f"Dispatch failed: Project {project_id} not found for user {current_user.id}")
        raise HTTPException(status_code=404, detail="Project not found or access denied.")

    logger.info(f"Starting dispatch for project {project_id} with {len(req.csv_data)} rows")
    
    if not project.mapping_data or not project.template_url:
        logger.error(f"Dispatch failed for project {project_id}: Mapping data or template URL missing")
        raise HTTPException(status_code=400, detail="Project mapping or template is missing. Please save the canvas configuration first.")

    try:
        sender_email = os.getenv("SENDER_EMAIL")
        app_password = os.getenv("APP_PASSWORD")
        if not sender_email or not app_password:
            logger.error("Dispatch failed: SMTP Credentials missing")
            raise HTTPException(status_code=400, detail="SMTP Credentials (SENDER_EMAIL, APP_PASSWORD) missing in .env")
        
        logger.info(f"Verifying SMTP login for {sender_email} (Forcing IPv4 + Port 465)...")
        # Force IPv4 to avoid Render IPv6 routing issues
        import socket
        try:
            # Use smtp.googlemail.com as it sometimes has better routing
            with smtplib.SMTP_SSL("smtp.googlemail.com", 465, timeout=10) as server:
                server.login(sender_email, app_password)
            logger.info("SMTP login successful")
        except (socket.gaierror, socket.error, smtplib.SMTPConnectError) as e:
            if "101" in str(e) or "unreachable" in str(e).lower():
                logger.warning(f"SMTP is unreachable during pre-check: {e}. Allowing dispatch to background task anyway.")
            else:
                raise e
    except smtplib.SMTPAuthenticationError:
        logger.error("Dispatch failed: SMTP Authentication Error")
        raise HTTPException(status_code=400, detail="Invalid SMTP Application Password. Please check your Google App Passwords.")
    except Exception as e:
        logger.error(f"Dispatch failed: SMTP Connection Error: {e}")
        # We don't block the whole process if just the PRE-CHECK fails due to a timeout, 
        # but if it's a real connection error we should report it.
        if "timeout" in str(e).lower():
            logger.warning("SMTP pre-check timed out, but allowed to proceed to background task.")
        else:
            raise HTTPException(status_code=400, detail=f"SMTP Connection Error: {str(e)}")

    job = DispatchJob(
        project_id=project.id,
        total_certificates=len(req.csv_data),
        status="pending"
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    background_tasks.add_task(process_dispatch_job, job.id, project.id, req.csv_data, req.email_subject, req.email_body)
    return job

@router.get("/jobs/{job_id}", response_model=DispatchJobResponse)
async def get_dispatch_job(job_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DispatchJob).join(Project).where(
        DispatchJob.id == job_id, 
        Project.owner_id == current_user.id
    ))
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

from sqlalchemy import func

@router.get("/jobs", response_model=list[DispatchJobResponse])
async def list_user_jobs(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Fetch all dispatch jobs belonging to the current user's projects."""
    result = await db.execute(
        select(DispatchJob)
        .join(Project)
        .where(Project.owner_id == current_user.id)
        .order_by(DispatchJob.created_at.desc())
    )
    return result.scalars().all()

@router.get("/kpi")
async def get_user_kpis(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Calculate aggregate dashboard statistics for the logged-in user."""
    # Total certificates dispatched
    result = await db.execute(
        select(func.sum(DispatchJob.total_certificates))
        .join(Project)
        .where(Project.owner_id == current_user.id)
    )
    total_certs = result.scalar() or 0
    
    # Total projects created
    result_projects = await db.execute(
        select(func.count(Project.id))
        .where(Project.owner_id == current_user.id)
    )
    total_projects = result_projects.scalar() or 0
    
    # Track opened certificates
    result_opened = await db.execute(
        select(func.count(Certificate.id))
        .join(Project)
        .where(Project.owner_id == current_user.id)
        .where(Certificate.status == "Opened")
    )
    total_opened = result_opened.scalar() or 0

    hit_rate = (total_opened / total_certs * 100) if total_certs > 0 else 0
    
    return {
        "total_certificates": total_certs,
        "total_projects": total_projects,
        "total_opened": total_opened,
        "hit_rate_percentage": round(hit_rate, 1)
    }

# Minimal 1x1 transparent PNG pixel base64
TRANSPARENT_PNG_PIXEL = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)

@router.get("/track/{certificate_id}.png")
async def track_email_open(certificate_id: str, db: AsyncSession = Depends(get_db)):
    """
    Transparent 1x1 PNG tracking pixel.
    Registers 'Opened' status when the mail client loads the image.
    Using PNG instead of SVG for better compatibility with Gmail/Outlook.
    """
    try:
        result = await db.execute(select(Certificate).where(Certificate.id == certificate_id))
        cert = result.scalars().first()
        
        if cert and cert.status == "Sent":
            cert.status = "Opened"
            cert.opened_at = datetime.datetime.utcnow()
            await db.commit()
    except Exception as e:
        logger.error(f"Tracking failed for {certificate_id}: {e}")
        # We still return the pixel even if DB update fails
        
    return Response(
        content=TRANSPARENT_PNG_PIXEL, 
        media_type="image/png",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

