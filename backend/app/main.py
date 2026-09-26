import sys
from pathlib import Path
import logging

CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR.parent
ROOT_DIR = BACKEND_DIR.parent

for p in [str(ROOT_DIR), str(BACKEND_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from backend.app.routes import router as api_router
    from backend.app.db import db_manager
except ImportError:
    from app.routes import router as api_router
    from app.db import db_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("bitcoin_forensics")

app = FastAPI(
    title="NTRO Bitcoin Traffic Forensics API",
    description="AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic (SIH26146)",
    version="1.0.0"
)

# Enable CORS for local Vite dashboard and offline web access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.on_event("startup")
def print_startup_db_status():
    if db_manager.is_live_mongo:
        print("\n" + "=" * 62)
        print(">>> [DATABASE STATUS]: db connected successfully! (MongoDB Atlas)")
        print(f">>> Mode: LIVE MONGODB | Database: 'bitcoin_forensics'")
        print("=" * 62 + "\n")
    else:
        print("\n" + "=" * 62)
        print(">>> [DATABASE STATUS]: not connected to MongoDB!")
        print(">>> Mode: OFFLINE ZERO-DEPENDENCY EMBEDDED STORE")
        print("=" * 62 + "\n")

@app.get("/")
def root():
    return {
        "system": "NTRO AI-Powered Bitcoin Transaction Monitoring & Analysis System",
        "theme": "Blockchain & Cybersecurity (SIH26146)",
        "status": "operational",
        "database_mode": "MongoDB (Native)" if db_manager.is_live_mongo else "Offline Embedded Document Store (Zero-Dependency)",
        "api_docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "mode": "offline-ready"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
