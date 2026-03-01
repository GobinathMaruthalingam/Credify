import os
import uuid
import aiohttp
from fastapi import UploadFile
from dotenv import load_dotenv

# Explicitly load credentials from the root Credify directory's .env file
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_BUCKET_NAME = os.getenv("SUPABASE_BUCKET_NAME", "credify-assets")

async def upload_file_to_s3(file: UploadFile, folder: str = "uploads") -> str:
    """
    Uploads a file to Supabase Storage via REST APIs and returns the public URL.
    The function retains 's3' in its name to prevent breaking upstream dependencies.
    If Supabase is not configured in .env, it simulates a local upload for development.
    """
    file_extension = file.filename.split(".")[-1]
    unique_filename = f"{folder}/{uuid.uuid4()}.{file_extension}"
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        # Development mode fallback: save locally if Supabase not configured
        local_dir = os.path.join(os.getcwd(), "local_storage", folder)
        os.makedirs(local_dir, exist_ok=True)
        local_path = os.path.join(local_dir, unique_filename.split("/")[-1])
        
        contents = await file.read()
        with open(local_path, "wb") as f:
            f.write(contents)
        await file.seek(0)
        return f"http://localhost:8000/static/{folder}/{unique_filename.split('/')[-1]}"
    
    try:
        contents = await file.read()
        
        # Build Supabase REST URL
        # URL format: {SUPABASE_URL}/storage/v1/object/{bucket}/{filename}
        base_url = SUPABASE_URL.rstrip("/")
        upload_url = f"{base_url}/storage/v1/object/{SUPABASE_BUCKET_NAME}/{unique_filename}"
        
        headers = {
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "apikey": SUPABASE_KEY,
            "Content-Type": file.content_type or "application/octet-stream"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(upload_url, headers=headers, data=contents) as response:
                if response.status not in (200, 201):
                    error_msg = await response.text()
                    raise Exception(f"Supabase error {response.status}: {error_msg}")
        
        # Ensure we can read the file again if needed downstream
        await file.seek(0)
        
        # Construct the public URL
        public_url = f"{base_url}/storage/v1/object/public/{SUPABASE_BUCKET_NAME}/{unique_filename}"
        return public_url
        
    except Exception as e:
        raise Exception(f"Supabase Storage Upload Failed: {str(e)}")
