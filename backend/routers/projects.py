import io
import aiohttp
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from database import get_db
from models import User, Project
from auth import get_current_user
from schemas import ProjectCreate, ProjectResponse, PreviewRequest
from storage import upload_file_to_s3
from services import generate_preview

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
        
        # Load font bytes. If not provided, we could use a default, 
        # but here we require a font URL for accurate previews.
        if not req.font_url:
             raise HTTPException(status_code=400, detail="font_url is required for preview")
                
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
            initial_font_size=req.font_size
        )
        
        return StreamingResponse(io.BytesIO(result_bytes), media_type="image/png")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=ProjectResponse)
async def create_project(project: ProjectCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Standard DB schema save (e.g., when they save their work)
    new_project = Project(name=project.name, owner_id=current_user.id)
    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)
    return new_project

@router.get("/", response_model=list[ProjectResponse])
async def list_projects(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.owner_id == current_user.id))
    projects = result.scalars().all()
    return projects
