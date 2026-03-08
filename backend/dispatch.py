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
from models import DispatchJob, Project, Certificate, FontAsset
from services import generate_preview
from storage import upload_file_to_s3

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

async def download_font_bytes(font_url: str) -> bytes:
    if not font_url:
        return b""
    async with aiohttp.ClientSession() as session:
        async with session.get(font_url) as resp:
            return await resp.read()

def send_smtp_email_sync(recipient_email: str, subject: str, html_body: str):
    SENDER_EMAIL = os.getenv("SENDER_EMAIL")
    APP_PASSWORD = os.getenv("APP_PASSWORD")
    
    if not SENDER_EMAIL or not APP_PASSWORD:
        print("SMTP Credentials missing inside .env. Bypassing email dispatch.")
        raise ValueError("SMTP Credentials missing")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Credify Notifications <{SENDER_EMAIL}>"
    msg["To"] = recipient_email

    msg.attach(MIMEText(html_body, "html"))

    try:
        # Use SMTP_SSL on port 465 with alternative hostname
        with smtplib.SMTP_SSL("smtp.googlemail.com", 465) as server:
            server.login(SENDER_EMAIL, APP_PASSWORD)
            server.sendmail(SENDER_EMAIL, recipient_email, msg.as_string())
    except Exception as e:
        print(f"Failed to send email to {recipient_email}: {e}")
        raise e

async def process_dispatch_job(job_id: int, project_id: int, csv_data: list[dict], email_subject: str = "Your Verified Certificate", email_body: str = ""):
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

        # Pre-cache font binaries mapping — try saved fontUrl first, then look up persistent library
        font_cache: dict[str, bytes] = {}
        for ph in project.mapping_data:
            url = ph.get("fontUrl", "")
            family_name = ph.get("fontFamily", "")

            if url and url not in font_cache:
                # Direct URL from mapping — fetch it
                try:
                    font_cache[url] = await download_font_bytes(url)
                except Exception:
                    font_cache[url] = b""  # fallback handled in services.py

            elif not url and family_name:
                # fontUrl missing (stale config) — look up from persistent font library by fontFamily
                db_font = await db.execute(
                    select(FontAsset).where(
                        (FontAsset.family + " " + FontAsset.variant) == family_name
                    )
                )
                asset = db_font.scalars().first()
                if asset and asset.storage_url not in font_cache:
                    try:
                        font_cache[asset.storage_url] = await download_font_bytes(asset.storage_url)
                        # Patch the placeholder so below rendering code picks up the resolved URL
                        ph["fontUrl"] = asset.storage_url
                    except Exception:
                        font_cache[asset.storage_url] = b""

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
                    frontend_bg_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip('/')
                    qr_url = f"{frontend_bg_url}/verify/{cert.id}" if is_qr else None
                    
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
                
                frontend_bg_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip('/')
                button_html = f'''
                <div style="margin: 30px 0;">
                    <a href="{frontend_bg_url}/verify/{cert.id}" 
                       style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                       View Verified Credential
                    </a>
                </div>
                '''
                
                final_html = email_body
                final_subject = email_subject

                # Replace all CSV columns as {tags} in body and subject
                for key, val in row.items():
                    if not key:
                        continue
                    tag = f"{{{key.strip()}}}"
                    final_html = final_html.replace(tag, str(val))
                    final_subject = final_subject.replace(tag, str(val))

                # Also support general {project_name} replacement
                final_html = final_html.replace("{project_name}", project.name)
                final_subject = final_subject.replace("{project_name}", project.name)

                # Inject the credential button
                final_html = final_html.replace("{credential_button}", button_html)

                # Inject "Powered by Credify" footer with tracking
                backend_base_url = os.getenv("BACKEND_URL", "http://localhost:8000").rstrip('/')
                logo_url = f"{backend_base_url}/api/projects/track/{cert.id}.png"
                footer_html = f'''
                <br/>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 40px 0 20px;">
                <div style="text-align:center; color: #64748b; font-family: sans-serif; font-size: 12px; margin-bottom: 20px;">
                    <p style="margin: 0; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Powered by</p>
                    <a href="https://credify.gnmlabs.com" style="text-decoration: none; display: inline-block; margin-top: 10px;">
                        <img src="{logo_url}" alt="Credify" style="height:28px; width:auto; border:0;">
                    </a>
                </div>
                '''
                final_html += footer_html

                await asyncio.to_thread(send_smtp_email_sync, recipient_email, final_subject, final_html)
                
                job.successful_deliveries += 1
            except Exception as e:
                import traceback
                print(f"Error processing row for {recipient_email}: {e}")
                traceback.print_exc()
                job.failed_deliveries += 1
                
            job.processed_certificates += 1
            await db.commit()

        job.status = "completed"
        job.completed_at = datetime.datetime.utcnow()
        await db.commit()

async def send_test_email(emails: list[str], subject: str, body: str, project_name: str, sample_data: dict = None):
    """
    Sends a test email to a list of addresses with sample tag replacement.
    """
    frontend_bg_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip('/')
    button_html = f'''
    <div style="margin: 30px 0;">
        <a href="{frontend_bg_url}/verify/sample-test-id" 
           style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
           View Sample Credential
        </a>
    </div>
    '''
    
    final_body = body
    final_subject = subject
    
    # Use provided sample data or find potential tags in body to provide fallbacks
    data = sample_data or {}
    
    # Standard replacements
    data["project_name"] = project_name
    
    # Replace tags in body and subject
    # We regex find all {tags} and replace them with data or "Sample [Tag]"
    import re
    all_tags = set(re.findall(r"\{([A-Za-z0-9_ -]+)\}", final_body + final_subject))
    
    for tag in all_tags:
        if tag == "credential_button":
            continue
        val = data.get(tag, f"Sample {tag}")
        final_body = final_body.replace(f"{{{tag}}}", str(val))
        final_subject = final_subject.replace(f"{{{tag}}}", str(val))
        
    final_body = final_body.replace("{credential_button}", button_html)

    # Inject "Powered by Credify" footer for Branding Visibility
    logo_url = "https://rrjogdkgrszahxgucbfn.supabase.co/storage/v1/object/public/credify-assets/brand/official-logo.png"
    footer_html = f'''
    <br/>
    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 40px 0 20px;">
    <div style="text-align:center; color: #64748b; font-family: sans-serif; font-size: 12px; margin-bottom: 20px;">
        <p style="margin: 0; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Powered by</p>
        <a href="https://credify.gnmlabs.com" style="text-decoration: none; display: inline-block; margin-top: 10px;">
            <img src="{logo_url}" alt="Credify" style="height:28px; width:auto; border:0;">
        </a>
    </div>
    '''
    final_body += footer_html
    
    for email in emails:
        await asyncio.to_thread(send_smtp_email_sync, email, final_subject, final_body)
