import os
import boto3
from botocore.exceptions import NoCredentialsError
from fastapi import UploadFile
import uuid

AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")

# Initialize S3 Client
s3_client = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY,
    region_name=AWS_REGION
)

async def upload_file_to_s3(file: UploadFile, folder: str = "uploads") -> str:
    """
    Uploads a file to S3 and returns the public URL.
    If S3 is not configured, it will simulate a local upload for development.
    """
    file_extension = file.filename.split(".")[-1]
    unique_filename = f"{folder}/{uuid.uuid4()}.{file_extension}"
    
    if not S3_BUCKET_NAME:
        # Development mode fallback: save locally if S3 not configured
        local_dir = os.path.join(os.getcwd(), "local_storage", folder)
        os.makedirs(local_dir, exist_ok=True)
        local_path = os.path.join(local_dir, unique_filename.split("/")[-1])
        
        contents = await file.read()
        with open(local_path, "wb") as f:
            f.write(contents)
        await file.seek(0)
        return f"http://localhost:8000/static/{folder}/{unique_filename.split('/')[-1]}"
    
    try:
        s3_client.upload_fileobj(
            file.file,
            S3_BUCKET_NAME,
            unique_filename,
            ExtraArgs={"ContentType": file.content_type}
        )
        url = f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{unique_filename}"
        return url
    except NoCredentialsError:
        raise Exception("S3 credentials not found.")
