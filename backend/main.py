import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import logging

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from database import engine, Base
import auth
from routers import projects, verify, fonts

app = FastAPI(title="Credify API", description="SaaS Backend for Credify Certificate Pipeline")

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(verify.router)
app.include_router(fonts.router)

os.makedirs("local_storage/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="local_storage"), name="static")

# CORS Security Bridge
# Support multiple origins via comma-separated list in env var
default_origins = "https://credify.gnmlabs.com,https://www.credify.gnmlabs.com,http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"
frontend_urls_raw = os.getenv("FRONTEND_URL", default_origins)
origins = [url.strip().rstrip("/") for url in frontend_urls_raw.split(",") if url.strip()]

# Force include root and www variants of production domain just in case
production_domains = ["https://credify.gnmlabs.com", "https://www.credify.gnmlabs.com"]
for d in production_domains:
    if d not in origins:
        origins.append(d)

logger.info(f"Registered CORS Origins: {origins}")
logger.info(f"Backend URL set to: {os.getenv('BACKEND_URL', 'localhost')}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    logger.info("Application starting up...")
    try:
        async with engine.begin() as conn:
            # Create all tables explicitly in local DB (if not using migrations initially)
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database connection successful and tables verified.")
    except Exception as e:
        logger.error(f"CRITICAL STARTUP ERROR: Database connection failed: {e}")
        # In production, we might still want to start the app so we can serve health checks/logs
        # but we log the error clearly.
        pass

@app.get("/")
def read_root():
    return {
        "status": "ok", 
        "message": "Credify API is running",
        "version": "1.1.0",
        "environment": os.getenv("RENDER_EXTERNAL_URL", "development")
    }

@app.get("/health/db")
async def db_health_check():
    """Manually trigger a DB connection test to verify SSL/Driver config."""
    try:
        from sqlalchemy import text
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "connected", "database": "reachable"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
