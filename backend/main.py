import sys
import types
from pathlib import Path
import logging

CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent

for p in [str(PROJECT_ROOT), str(CURRENT_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

if "backend" not in sys.modules:
    backend_pkg = types.ModuleType("backend")
    backend_pkg.__path__ = [str(CURRENT_DIR)]
    sys.modules["backend"] = backend_pkg

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from backend.api import api_router
    from backend.db.mongo_client import db_manager
except ImportError:
    from api import api_router
    from db.mongo_client import db_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
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
async def print_startup_status():
    if db_manager.is_live_mongo:
        logger.info("[DATABASE STATUS]: Connected to MongoDB (Live Server)")
    else:
        logger.info("[DATABASE STATUS]: Connected to Offline Zero-Dependency Embedded Document Store")

    # Verify Google Gemini API Key and output connection banner directly to terminal
    from backend.api.ai import verify_gemini_connection
    await verify_gemini_connection(print_banner=True)

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

# Mount built frontend SPA if available (for single-container/Render/Railway deployment)
frontend_dist = PROJECT_ROOT / "frontend" / "dist"
if frontend_dist.exists():
    from fastapi.staticfiles import StaticFiles
    from starlette.responses import FileResponse

    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            return None
        target_file = frontend_dist / full_path
        if target_file.is_file():
            return FileResponse(target_file)
        return FileResponse(frontend_dist / "index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
