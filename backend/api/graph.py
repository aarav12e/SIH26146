import logging
from fastapi import APIRouter, Query
from backend.graph.persistence import load_graph_from_db

logger = logging.getLogger("bitcoin_forensics.api.graph")
router = APIRouter()

@router.get("/graph/full")
def get_full_graph(max_nodes: int = Query(250, ge=10, le=1000)):
    """
    Returns full multi-entity graph (nodes and links) for 2D link analysis visualizer.
    """
    return load_graph_from_db(max_nodes=max_nodes)
