from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from database import get_db
import models
import schemas

router = APIRouter(prefix="/api/verify", tags=["verification"])

@router.get("/{certificate_id}", response_model=schemas.CertificateResponse)
async def verify_certificate(certificate_id: str, db: AsyncSession = Depends(get_db)):
    """
    Public endpoint to verify a certificate's authenticity.
    Validates UUID checks against the database and returns issuance parameters.
    """
    result = await db.execute(
        select(models.Certificate)
        .options(selectinload(models.Certificate.project))
        .where(models.Certificate.id == certificate_id)
    )
    cert = result.scalars().first()
    
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found or invalid.")
    
    if cert.is_revoked:
        raise HTTPException(status_code=400, detail="This credential has been permanently revoked by the issuer.")
        
    return cert
