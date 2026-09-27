from fastapi import APIRouter
from backend.api.ingest import router as ingest_router
from backend.api.wallets import router as wallets_router
from backend.api.flags import router as flags_router
from backend.api.clusters import router as clusters_router
from backend.api.graph import router as graph_router
from backend.api.analyze import router as analyze_router
from backend.api.stats import router as stats_router

api_router = APIRouter()
api_router.include_router(ingest_router, tags=["Ingestion"])
api_router.include_router(wallets_router, tags=["Wallets"])
api_router.include_router(flags_router, tags=["Flags"])
api_router.include_router(clusters_router, tags=["Clusters"])
api_router.include_router(graph_router, tags=["Graph"])
api_router.include_router(analyze_router, tags=["Analysis"])
api_router.include_router(stats_router, tags=["Stats & Transactions"])

__all__ = ["api_router"]
