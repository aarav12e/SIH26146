import sys
from pathlib import Path
import logging

CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent

for p in [str(PROJECT_ROOT), str(CURRENT_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api import api_router
from backend.db.mongo_client import db_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("bitcoin_forensics")

app = FastAPI(
    title="NTRO Bitcoin Traffic Intelligence API",
    description="AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic (SIH26146 - Phase 2)",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for local Vite dashboard and offline web access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all API routers
app.include_router(api_router, prefix="/api")

@app.on_event("startup")
def print_startup_status():
    if db_manager.is_live_mongo:
        logger.info("[DATABASE STATUS]: Connected to MongoDB (Live Server)")
    else:
        logger.info("[DATABASE STATUS]: Connected to Offline Zero-Dependency Embedded Document Store")

@app.get("/")
def root():
    return {
        "system": "NTRO AI-Powered Bitcoin Transaction Monitoring & Analysis System",
        "phase": "Phase 2 (Modular Architecture)",
        "problem_statement": "SIH26146",
        "status": "operational",
        "database_mode": "MongoDB (Native)" if db_manager.is_live_mongo else "Offline Embedded Document Store (Zero-Dependency)",
        "api_docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "mode": "offline-ready",
        "phase": "2.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
