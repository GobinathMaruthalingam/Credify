from pydantic import BaseModel
from typing import Optional, List, Any

class ProjectCreate(BaseModel):
    name: str
    template_url: str

class ProjectMappingUpdate(BaseModel):
    mapping_data: List[Any]

class ProjectResponse(BaseModel):
    id: int
    name: str
    template_url: Optional[str] = None
    mapping_data: Optional[List[Any]] = None
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
