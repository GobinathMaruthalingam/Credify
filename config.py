import os
from dotenv import load_dotenv

load_dotenv()

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_CSV = os.path.join(BASE_DIR, "participants.csv")
TEMPLATE_IMAGE = os.path.join(BASE_DIR, "template.png")
OUTPUT_DIR = os.path.join(BASE_DIR, "generated")

FONT_PATH = r"C:\Windows\Fonts\arial.ttf"

# Text Region Options
# Use mapper.py to select the exact bounding box for the text.
BBOX_X = 400     # Default value, replace with mapper output
BBOX_Y = 181     # Default value, replace with mapper output
BBOX_WIDTH = 203 # Default value, replace with mapper output
BBOX_HEIGHT = 45 # Default value, replace with mapper output
TEXT_COLOR = (0, 0, 0) # Black color (RGB)
MAX_FONT_SIZE = 80

# Email Settings
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "your_email@gmail.com")
APP_PASSWORD = os.getenv("APP_PASSWORD", "your_app_password")
EMAIL_SUBJECT = "Your Certificate of Completion"
EMAIL_BODY = "Hi {name},\n\nPlease find your certificate of completion attached.\n\nBest regards,\nThe Team"
BATCH_DELAY_SECONDS = 2.0
