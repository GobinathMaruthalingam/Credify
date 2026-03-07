from pydantic import BaseModel
from typing import Optional, List, Any

class ProjectCreate(BaseModel):
    name: str
    template_url: str

class ProjectMappingUpdate(BaseModel):
    mapping_data: List[Any]
    name: Optional[str] = None

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
    is_qrcode: bool = False
    qr_url: Optional[str] = None

class TestEmailRequest(BaseModel):
    emails: List[str]
    subject: str
    body: str
    sample_data: Optional[dict] = None

class CertificateResponse(BaseModel):
    id: str
    project_id: int
    recipient_email: str
    recipient_name: str
    image_url: Optional[str] = None
    issued_at: Any
    is_revoked: bool
    
    class Config:
        from_attributes = True

class DispatchJobResponse(BaseModel):
    id: int
    project_id: int
    status: str
    total_certificates: int
    processed_certificates: int
    successful_deliveries: int
    failed_deliveries: int
    created_at: Any
    completed_at: Optional[Any] = None

    class Config:
        from_attributes = True
