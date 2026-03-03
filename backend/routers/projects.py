import io
import os
import aiohttp
import smtplib
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from database import get_db
from models import User, Project, DispatchJob
from auth import get_current_user
from schemas import ProjectCreate, ProjectResponse, PreviewRequest, ProjectMappingUpdate, DispatchJobResponse
from storage import upload_file_to_s3
from services import generate_preview
from dispatch import process_dispatch_job
from pydantic import BaseModel

class DispatchRequest(BaseModel):
    csv_data: list[dict]

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
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.mapping_data or not project.template_url:
        raise HTTPException(status_code=400, detail="Project mapping or template is missing. Please save the canvas configuration first.")

    try:
        sender_email = os.getenv("SENDER_EMAIL")
        app_password = os.getenv("APP_PASSWORD")
        if not sender_email or not app_password:
            raise HTTPException(status_code=400, detail="SMTP Credentials (SENDER_EMAIL, APP_PASSWORD) missing in .env")
        
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(sender_email, app_password)
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(status_code=400, detail="Invalid SMTP Application Password in .env. Please check your Google App Passwords.")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail=f"SMTP Connection Error: {str(e)}")

    job = DispatchJob(
        project_id=project.id,
        total_certificates=len(req.csv_data),
        status="pending"
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    background_tasks.add_task(process_dispatch_job, job.id, project.id, req.csv_data)

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

from fastapi import Response
import base64
import datetime
from models import Certificate

@router.get("/track/{certificate_id}.png")
async def track_email_open(certificate_id: str, db: AsyncSession = Depends(get_db)):
    """
    Transparent 1x1 pixel tracking endpoint injected into the outbound SMTP emails.
    Registers 'Opened' status and timestamp when the recipient's mail client natively auto-loads the image.
    """
    result = await db.execute(select(Certificate).where(Certificate.id == certificate_id))
    cert = result.scalars().first()
    
    if cert and cert.status == "Sent":
        cert.status = "Opened"
        cert.opened_at = datetime.datetime.utcnow()
        await db.commit()
        
    # 1x1 transparent PNG payload
    pixel_data = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=")
    return Response(content=pixel_data, media_type="image/png")

