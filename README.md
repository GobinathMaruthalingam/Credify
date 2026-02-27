# Credify 🚀

Credify is a scalable, full-stack SaaS platform that allows users to seamlessly design, generate, and email thousands of personalized certificates instantly. Users can upload their base template, visually drag-and-drop their dynamic data placeholders directly in the browser, and dispatch them flawlessly.

## System Architecture

- **Frontend:** React (Vite), TypeScript, TailwindCSS, and Konva (Interactive HTML5 Canvas)
- **Backend:** Python (FastAPI), SQLAlchemy (PostgreSQL)
- **Infrastructure:** S3 / Supabase (Cloud File Storage), Stripe (Coming soon)
- **Email Dispatch:** Designed for bulk SMTP / API providers (Resend, SendGrid)

## Core Features

- **Interactive Editor Canvas:** Fully functional React-layer canvas to drop placeholders. Features 4-corner resizing, center-anchored rotation, real-time font-scaling, and Live Undo/Redo.
- **RESTful Backend APIs:** FastAPI service configured for robust template storage, fast DB reads, and secure preview `.pdf` generations.
- **Dynamic Text Engines:** Automatically determines optimal font sizes to fit generated text cleanly inside the allocated user bounding boxes without overflowing.

## Local Development

### 1. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\Activate.ps1
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
fastapi dev main.py
```

### 3. Environment Config
Be sure to populate your local `backend/.env` with your desired PostgreSQL connection string, secret keys, and SMTP App Passwords (if actively sending mail).

## SaaS Roadmap (Actively in Development)
Credify is currently undergoing a rapid 7-day expansion sprint focused on shifting from a local Python generation tool to a cloud-native SaaS application capable of processing high-volume requests, storing user states globally, and processing Stripe payments for usage limits.

---
*Developed as a premium certificate management tool.*
