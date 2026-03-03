import os
import aiohttp
import asyncio
import smtplib
import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import UploadFile
import io

from database import AsyncSessionLocal
from models import DispatchJob, Project, Certificate
from services import generate_preview
from storage import upload_file_to_s3

SENDER_EMAIL = os.getenv("SENDER_EMAIL")
APP_PASSWORD = os.getenv("APP_PASSWORD")
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

async def download_font_bytes(font_url: str) -> bytes:
    if not font_url:
        return b""
    async with aiohttp.ClientSession() as session:
        async with session.get(font_url) as resp:
            return await resp.read()

def send_smtp_email_sync(recipient_email: str, subject: str, html_body: str):
    if not SENDER_EMAIL or not APP_PASSWORD:
        print("SMTP Credentials missing inside .env. Bypassing email dispatch.")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Credify Notifications <{SENDER_EMAIL}>"
    msg["To"] = recipient_email

    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, APP_PASSWORD)
            server.sendmail(SENDER_EMAIL, recipient_email, msg.as_string())
    except Exception as e:
        print(f"Failed to send email to {recipient_email}: {e}")
        raise e

async def process_dispatch_job(job_id: int, project_id: int, csv_data: list[dict]):
    """
    Background worker that iterates through the parsed CSV recipients, 
    generates their custom certificates natively in-memory, uploads to S3, 
    and dispatches the outbound email.
    """
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(DispatchJob).where(DispatchJob.id == job_id))
        job = result.scalars().first()
        
        result_proj = await db.execute(select(Project).where(Project.id == project_id))
        project = result_proj.scalars().first()
        
        if not job or not project or not project.mapping_data or not project.template_url:
            if job:
                job.status = "failed"
                await db.commit()
            return
            
        job.status = "processing"
        await db.commit()

        # Download the base certificate template bytes once to save network requests
        async with aiohttp.ClientSession() as session:
            async with session.get(project.template_url) as resp:
                template_bytes = await resp.read()

        # Pre-cache font binaries mapping
        font_cache = {}
        for ph in project.mapping_data:
            url = ph.get("fontUrl")
            if url and url not in font_cache:
                font_cache[url] = await download_font_bytes(url)

        for row in csv_data:
            recipient_email = None
            recipient_name = "Participant"
            
            for key, val in row.items():
                if not key:
                    continue
                k_clean = key.strip().lower()
                if k_clean == "email":
                    recipient_email = val
                elif k_clean == "name":
                    recipient_name = val
            
            if not recipient_email:
                job.failed_deliveries += 1
                job.processed_certificates += 1
                await db.commit()
                continue
            
            # 1. Create Certificate DB record to lock-in the UUID
            cert = Certificate(
                project_id=project.id,
                recipient_email=recipient_email,
                recipient_name=recipient_name
            )
            db.add(cert)
            await db.flush() # flush to get cert.id
            
            try:
                # 2. Iterate through mapping configuration and composite the image
                # In MVP, we iteratively stamp the template for each placeholder
                current_image_bytes = template_bytes
                
                for ph in project.mapping_data:
                    # Resolve the text from CSV row based on placeholder name
                    ph_name = ph.get("name", "")
                    text_value = row.get(ph_name, f"Sample {ph_name}")
                    
                    is_qr = (ph.get("type") == "qrcode")
                    qr_url = f"http://localhost:5173/verify/{cert.id}" if is_qr else None
                    
                    font_url = ph.get("fontUrl", "")
                    f_bytes = font_cache.get(font_url, b"")
                    
                    current_image_bytes = generate_preview(
                        template_bytes=current_image_bytes,
                        font_bytes=f_bytes,
                        text=text_value,
                        bbox_x=int(ph.get("x", 0)),
                        bbox_y=int(ph.get("y", 0)),
                        bbox_width=int(ph.get("w", 100)),
                        bbox_height=int(ph.get("h", 100)),
                        text_color=ph.get("fill", "#000000"),
                        initial_font_size=int(ph.get("fontSize", 120)),
                        format="PNG",
                        is_qrcode=is_qr,
                        qr_url=qr_url
                    )

                # 3. Upload composited bytes to S3
                upload_file = UploadFile(filename=f"{cert.id}.png", file=io.BytesIO(current_image_bytes))
                public_url = await upload_file_to_s3(upload_file, folder="certificates")
                
                cert.image_url = public_url
                
                # 4. Dispatch the SMTP Email
                # Run SMTP blocking call inside asyncio threadpool so it doesn't freeze the async worker
                html_body = f"""
                <html>
                    <body style="font-family: sans-serif; color: #334155;">
                        <h2 style="color: #0f172a;">Congratulations, {recipient_name}!</h2>
                        <p>Your verified digital certificate for <b>{project.name}</b> has been issued.</p>
                        <p>You can view, download, and verify your credential globally on the blockchain-secured ledger via the link below:</p>
                        
                        <div style="margin: 30px 0;">
                            <a href="http://localhost:5173/verify/{cert.id}" 
                               style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                               View Verified Credential
                            </a>
                        </div>
                        
                        <p>To add this certificate to your LinkedIn profile in one-click, use the badge link on the verification page.</p>
                        <br/>
                        <p style="color: #94a3b8; font-size: 12px;">Secured by Credify Trust Protocol.</p>
                    </body>
                </html>
                """
                await asyncio.to_thread(send_smtp_email_sync, recipient_email, f"Your Verified Certificate: {project.name}", html_body)
                
                job.successful_deliveries += 1
            except Exception as e:
                print(f"Error processing row for {recipient_email}: {e}")
                job.failed_deliveries += 1
                
            job.processed_certificates += 1
            await db.commit()

        job.status = "completed"
        job.completed_at = datetime.datetime.utcnow()
        await db.commit()
