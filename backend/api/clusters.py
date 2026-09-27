import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from backend.db.mongo_client import db_manager

logger = logging.getLogger("bitcoin_forensics.api.clusters")
router = APIRouter()

@router.get("/clusters")
def list_clusters():
    """
    Returns Louvain / Common-Input entity clusters with membership counts and density ratios.
    """
    clusters = list(db_manager.clusters.find().sort("node_count", -1))
    return {
        "total": len(clusters),
        "clusters": clusters
    }

@router.get("/clusters/{cluster_id}")
def get_cluster(cluster_id: str):
    """
    Returns specific entity community details, density metrics, and member wallets.
    """
    c = db_manager.clusters.find_one({"cluster_id": cluster_id})
    if not c:
        c = db_manager.clusters.find_one({"entity_id": cluster_id})

    if not c:
        raise HTTPException(status_code=404, detail=f"Cluster {cluster_id} not found.")

    members = c.get("all_members", [])
    wallets = list(db_manager.wallets.find({"wallet_address": {"$in": members}}))

    return {
        "cluster": c,
        "member_wallets": wallets
    }
