"""
Font Library Router — Persistent shared font storage across all users.
Fonts are uploaded to Supabase under `fonts/{family}/{variant}.{ext}` paths,
stored in the font_assets DB table, grouped by family, and deduplicated.
"""
import re
import os
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from collections import defaultdict

from database import get_db
from models import FontAsset, User
from storage import upload_file_to_s3
from routers.auth import get_current_user

router = APIRouter(prefix="/api/fonts", tags=["fonts"])


def _parse_font_name(filename: str) -> tuple[str, str]:
    """
    Parse a font filename into (family, variant).
    Examples:
        SpaceGrotesk-Regular.ttf   → ("Space Grotesk", "Regular")
        PlayfairDisplay-Bold.otf   → ("Playfair Display", "Bold")
        Inter-MediumItalic.ttf     → ("Inter", "Medium Italic")
        RobotoMono.ttf             → ("Roboto Mono", "Regular")
    """
    stem = filename.rsplit(".", 1)[0]  # strip extension

    # Split on dash to separate family from variant
    if "-" in stem:
        raw_family, raw_variant = stem.split("-", 1)
    else:
        raw_family = stem
        raw_variant = "Regular"

    # Insert spaces before capital letters in CamelCase → "Space Grotesk"
    family = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", raw_family).strip()
    # Same for variant, plus "MediumItalic" → "Medium Italic"
    variant = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", raw_variant).strip()

    return family, variant


@router.get("")
async def list_fonts(db: AsyncSession = Depends(get_db)):
    """
    Returns all persisted fonts grouped by family.
    e.g. { "Space Grotesk": [ {variant, url}, ... ], ... }
    """
    result = await db.execute(select(FontAsset).order_by(FontAsset.family, FontAsset.variant))
    fonts = result.scalars().all()

    grouped: dict[str, list] = defaultdict(list)
    for f in fonts:
        grouped[f.family].append({
            "variant": f.variant,
            "url": f.storage_url,
            "fontName": f"{f.family} {f.variant}".strip(),
        })

    return dict(grouped)


@router.post("/upload")
async def upload_font(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a custom .ttf or .otf font to the shared persistent font library.
    - Parses the family & variant from the filename
    - Rejects duplicates with a clear message
    - Saves to Supabase under fonts/{family}/{variant}.{ext}
    - Returns the grouped font metadata
    """
    # Read the font bytes before upload
    font_bytes = await file.read()
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ("ttf", "otf"):
        raise HTTPException(status_code=400, detail="Only .ttf and .otf font files are supported.")

    family, variant = _parse_font_name(file.filename)

    # Check for an exact family+variant duplicate
    existing = await db.execute(
        select(FontAsset)
        .where(FontAsset.family == family)
        .where(FontAsset.variant == variant)
    )
    if existing.scalars().first():
        raise HTTPException(
            status_code=409,
            detail=f'"{family} — {variant}" already exists in the font library.'
        )

    # Also check by original filename for safety
    existing_by_name = await db.execute(
        select(FontAsset).where(FontAsset.file_name == file.filename)
    )
    if existing_by_name.scalars().first():
        raise HTTPException(
            status_code=409,
            detail=f'A font with filename "{file.filename}" already exists in the library.'
        )

    # Build a structured Supabase folder path: fonts/Space_Grotesk/Regular.ttf
    safe_family = family.replace(" ", "_")
    safe_variant = variant.replace(" ", "_")
    structured_filename = f"{safe_variant}.{ext}"

    # Reconstruct UploadFile with the structured name
    import io as _io
    structured_file = UploadFile(
        filename=structured_filename,
        file=_io.BytesIO(font_bytes),
    )
    storage_url = await upload_file_to_s3(structured_file, folder=f"fonts/{safe_family}")

    font_record = FontAsset(
        family=family,
        variant=variant,
        storage_url=storage_url,
        file_name=file.filename,
        uploaded_by=current_user.id,
    )
    db.add(font_record)
    await db.commit()
    await db.refresh(font_record)

    return {
        "family": family,
        "variant": variant,
        "fontName": f"{family} {variant}".strip(),
        "url": storage_url,
    }

