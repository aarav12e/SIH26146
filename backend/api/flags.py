import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from backend.db.mongo_client import db_manager

logger = logging.getLogger("bitcoin_forensics.api.flags")
router = APIRouter()

@router.get("/flags")
def list_flags(
    sort_by: str = Query("risk", enum=["risk", "anomaly"]),
    cluster_id: Optional[str] = Query(None),
    min_score: float = Query(0.0, ge=0.0, le=1.0),
    search: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0)
):
    """
    Returns prioritized list of explainable forensic threat leads, ranked by risk score.
    """
    query = {}
    if cluster_id:
        query["entity_cluster_id"] = cluster_id
    if min_score > 0:
        query["risk_score"] = {"$gte": min_score}

    sort_field = "risk_score" if sort_by == "risk" else "anomaly_score"
    cursor = db_manager.flags.find(query).sort(sort_field, -1)
    
    all_flags = list(cursor)
    if search:
        q = search.lower().strip()
        all_flags = [f for f in all_flags if q in str(f.get("flagged_id", "")).lower() or q in str(f.get("summary", "")).lower()]

    total = len(all_flags)
    paginated = all_flags[skip:skip + limit]

    return {
        "total": total,
        "flags": paginated,
        "sort_by": sort_by,
        "limit": limit,
        "skip": skip
    }

@router.get("/flags/{flag_id}")
def get_flag_evidence(flag_id: str):
    """
    Returns synthesized forensic reasoning, evidence dossier, and feature metrics for a specific flag.
    """
    flag = db_manager.flags.find_one({"flagged_id": flag_id})
    if not flag:
        flag = db_manager.flags.find_one({"_id": flag_id})

    wallet = db_manager.wallets.find_one({"wallet_address": flag_id}) or db_manager.wallets.find_one({"_id": flag_id})

    if not flag and not wallet:
        raise HTTPException(status_code=404, detail=f"Flagged lead {flag_id} not found.")

    return {
        "flag": flag,
        "wallet_details": wallet
    }
