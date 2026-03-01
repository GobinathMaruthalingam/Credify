import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine, Base
import auth
from routers import projects

app = FastAPI(title="Credify API", description="SaaS Backend for Credify Certificate Pipeline")

app.include_router(auth.router)
app.include_router(projects.router)

os.makedirs("local_storage/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="local_storage"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        # Create all tables explicitly in local DB (if not using migrations initially)
        await conn.run_sync(Base.metadata.create_all)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Credify API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
