import logging
import networkx as nx
import numpy as np
from typing import Dict, Any, List
from backend.db.mongo_client import db_manager
from backend.config import PAGERANK_ALPHA, PAGERANK_MAX_ITER, RISK_DECAY_FACTOR

logger = logging.getLogger("bitcoin_forensics.ml.risk_propagation")

def propagate_risk_scores(G: nx.MultiDiGraph, anomaly_scores: Dict[str, float], wallet_peels: Dict[str, int]) -> Dict[str, float]:
    """
    NTRO §6.5: Guilt-by-Association Risk Scoring.
    1. Selects high-confidence seed threat wallets (high anomaly score or peeling chain).
    2. Runs Personalized PageRank / Random Walk with Restart to propagate risk.
    3. Normalizes resulting vector into [0.0, 1.0] risk scores per wallet.
    """
    wallet_nodes = [n for n, d in G.nodes(data=True) if d.get("node_type") == "wallet"]
    if not wallet_nodes:
        return {}

    # 1. Seed Identification
    personalization = {}
    for w in wallet_nodes:
        a_score = anomaly_scores.get(w, 0.0)
        is_peel = w in wallet_peels
        
        weight = 0.0
        if a_score >= 0.70:
            weight += (a_score * 2.0)
        if is_peel:
            weight += 2.5
        
        if weight > 0:
            personalization[w] = weight

    # If no strong seeds, use highest anomaly wallet
    if not personalization:
        top_w = max(wallet_nodes, key=lambda x: anomaly_scores.get(x, 0.0))
        personalization[top_w] = 1.0

    # Ensure all graph nodes have an entry for networkx.pagerank
    for n in G.nodes():
        if n not in personalization:
            personalization[n] = 0.001

    # 2. Run Personalized PageRank
    try:
        raw_pr = nx.pagerank(
            G,
            alpha=PAGERANK_ALPHA,
            personalization=personalization,
            max_iter=PAGERANK_MAX_ITER,
            weight="weight"
        )
    except Exception as e:
        logger.warning(f"PageRank fallback due to: {e}")
        raw_pr = {n: personalization.get(n, 0.1) for n in G.nodes()}

    # 3. Normalize into [0.0, 1.0] per wallet
    wallet_prs = [raw_pr.get(w, 0.0) for w in wallet_nodes]
    min_pr = min(wallet_prs) if wallet_prs else 0.0
    max_pr = max(wallet_prs) if wallet_prs else 1.0
    pr_range = max_pr - min_pr if max_pr != min_pr else 1.0

    risk_scores = {}
    for w in wallet_nodes:
        norm_pr = (raw_pr.get(w, 0.0) - min_pr) / pr_range
        # Combine normalized PageRank with direct anomaly score
        a_score = anomaly_scores.get(w, 0.0)
        is_peel = 1.0 if w in wallet_peels else 0.0

        final_risk = (0.50 * norm_pr) + (0.35 * a_score) + (0.15 * is_peel)
        final_risk = float(np.clip(final_risk, 0.0, 1.0))
        risk_scores[w] = round(final_risk, 3)

        db_manager.wallets.update_one(
            {"wallet_address": w},
            {"$set": {"risk_score": round(final_risk, 3)}}
        )

    logger.info(f"Risk Propagation: Computed PageRank risk scores for {len(risk_scores)} wallets.")
    return risk_scores
