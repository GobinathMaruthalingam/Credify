from pydantic import BaseModel
from typing import Optional

class ProjectCreate(BaseModel):
    name: str

class ProjectResponse(BaseModel):
    id: int
    name: str
    owner_id: int
    
    class Config:
        from_attributes = True

class PreviewRequest(BaseModel):
    template_url: str
    # If font_url is empty, we fallback to a default font (or we can require it)
    font_url: Optional[str] = None
    text: str
    bbox_x: int
    bbox_y: int
    bbox_width: int
    bbox_height: int
    text_color: str = "#000000"
    font_size: int = 120
