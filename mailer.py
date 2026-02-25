import os
import time
import smtplib
from email.message import EmailMessage
import pandas as pd
import config

def send_emails():
    try:
        df = pd.read_csv(config.INPUT_CSV)
    except FileNotFoundError:
        print(f"Error: Could not find {config.INPUT_CSV}")
        return

    # Check if we have credentials
    if config.SENDER_EMAIL == "your_email@gmail.com" or config.APP_PASSWORD == "your_app_password":
        print("Error: Please update SENDER_EMAIL and APP_PASSWORD in config.py")
        return

    print("Connecting to SMTP server...")
    try:
        server = smtplib.SMTP(config.SMTP_SERVER, config.SMTP_PORT)
        server.starttls()
        server.login(config.SENDER_EMAIL, config.APP_PASSWORD)
    except Exception as e:
        print(f"Failed to connect to SMTP server: {e}")
        return

    print("Connected successfully. Starting email batching...")
    
    for index, row in df.iterrows():
        name = str(row['name'])
        email = str(row['email'])
        
        # Reconstruct the expected filename
        safe_email = email.replace('@', '_at_').replace('.', '_dot_')
        cert_filename = f"certificate_{safe_email}.pdf"
        cert_path = os.path.join(config.OUTPUT_DIR, cert_filename)
        
        if not os.path.exists(cert_path):
            print(f"Warning: Certificate for {email} not found at {cert_path}. Skipping.")
            continue
            
        msg = EmailMessage()
        msg['Subject'] = config.EMAIL_SUBJECT
        msg['From'] = config.SENDER_EMAIL
        msg['To'] = email
        msg.set_content(config.EMAIL_BODY.format(name=name))
        
        with open(cert_path, 'rb') as f:
            pdf_data = f.read()
            msg.add_attachment(pdf_data, maintype='application', subtype='pdf', filename=f"{name}_Certificate.pdf")
            
        try:
            server.send_message(msg)
            print(f"Sent email to {email}")
        except Exception as e:
            print(f"Failed to send email to {email}: {e}")
            
        # Batching delay to avoid rate limits
        if index < len(df) - 1:
            time.sleep(config.BATCH_DELAY_SECONDS)
            
    server.quit()
    print("Email batching complete!")

if __name__ == "__main__":
    send_emails()
