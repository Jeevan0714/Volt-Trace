from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.database import engine, Base, SessionLocal
from app.db.seed_data import seed_database
from app.api import (
    routes_batteries,
    routes_documents,
    routes_diagnostics,
    routes_audit,
    routes_stats
)

# Initialize database schema
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="A Digital Battery Passport, Provenance Verification, and Triage Platform for EV Second-Life Applications",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed database on startup
@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

# Mount API Routers
app.include_router(routes_stats.router, prefix=settings.API_V1_STR)
app.include_router(routes_batteries.router, prefix=settings.API_V1_STR)
app.include_router(routes_documents.router, prefix=settings.API_V1_STR)
app.include_router(routes_diagnostics.router, prefix=settings.API_V1_STR)
app.include_router(routes_audit.router, prefix=settings.API_V1_STR)

@app.get(f"{settings.API_V1_STR}/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "VoltTrace API Gateway",
        "version": settings.PROJECT_VERSION,
        "standards": ["EU Regulation 2023/1542", "CIRPASS DPP", "India BWMR 2022"]
    }
