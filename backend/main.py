from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import auth

app = FastAPI(title="Credify API", description="SaaS Backend for Credify Certificate Pipeline")

app.include_router(auth.router)

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
