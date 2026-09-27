import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from backend.db.mongo_client import db_manager
from backend.graph.persistence import get_wallet_subgraph

logger = logging.getLogger("bitcoin_forensics.api.wallets")
router = APIRouter()

@router.get("/wallets/{wallet_id}")
def get_wallet(wallet_id: str):
    """
    Returns wallet profile, behavioral features, entity cluster ID, and threat flags.
    """
    wallet = db_manager.wallets.find_one({"wallet_address": wallet_id})
    if not wallet:
        wallet = db_manager.wallets.find_one({"_id": wallet_id})

    if not wallet:
        raise HTTPException(status_code=404, detail=f"Wallet {wallet_id} not found in database.")

    flag = db_manager.flags.find_one({"flagged_id": wallet_id})
    return {
        "wallet_details": wallet,
        "flag": flag,
        "is_flagged": bool(flag or wallet.get("is_flagged", False))
    }

@router.get("/wallets/{wallet_id}/graph")
def get_wallet_graph_endpoint(
    wallet_id: str,
    hops: int = Query(2, ge=1, le=5),
    max_nodes: int = Query(60, ge=10, le=200)
):
    """
    Returns an N-hop directed neighborhood subgraph around target wallet formatted for react-force-graph.
    """
    subgraph = get_wallet_subgraph(wallet_id, hops=hops, max_nodes=max_nodes)
    return subgraph
