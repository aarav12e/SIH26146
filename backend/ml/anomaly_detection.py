import logging
import numpy as np
from typing import Dict, Any, List
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from backend.db.mongo_client import db_manager
from backend.config import ANOMALY_CONTAMINATION

logger = logging.getLogger("bitcoin_forensics.ml.anomaly")

FEATURE_KEYS = [
    "fan_in",
    "fan_out",
    "fan_ratio",
    "velocity",
    "amount_mean",
    "amount_variance",
    "amount_sum",
    "round_number_freq",
    "ip_diversity",
    "degree_centrality",
    "betweenness_centrality"
]

def run_anomaly_detection(wallets_filter: Optional[List[str]] = None) -> Dict[str, float]:
    """
    NTRO §6.3: Unsupervised Anomaly Detection using Isolation Forest.
    Fits IsolationForest on StandardScaler-normalized feature matrix.
    Computes anomaly_score in [0.0, 1.0] per wallet (higher = more anomalous).
    """
    if wallets_filter:
        filter_set = set(wallets_filter)
        wallets = [w for w in db_manager.wallets.find() if (w.get("wallet_address") or w.get("_id")) in filter_set]
    else:
        wallets = list(db_manager.wallets.find())

    if not wallets:
        logger.warning("No wallets to run anomaly detection.")
        return {}

    addresses = []
    matrix = []

    for w in wallets:
        addr = w.get("wallet_address") or w.get("_id")
        feats = w.get("features", {})
        row = [float(feats.get(k, 0.0) or 0.0) for k in FEATURE_KEYS]
        addresses.append(addr)
        matrix.append(row)

    X = np.array(matrix)
    if len(X) < 2:
        logger.warning("Insufficient samples for Isolation Forest.")
        return {addr: 0.1 for addr in addresses}

    # 1. Standardize Features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # 2. Fit Isolation Forest
    contamination = min(ANOMALY_CONTAMINATION, max(0.05, 1.0 / len(X)))
    iso_forest = IsolationForest(
        n_estimators=100,
        contamination=contamination,
        random_state=42,
        n_jobs=-1
    )
    iso_forest.fit(X_scaled)

    # 3. Decision Function: lower = more anomalous
    raw_scores = iso_forest.decision_function(X_scaled)

    # Invert and normalize to [0.0, 1.0]
    min_s = float(np.min(raw_scores))
    max_s = float(np.max(raw_scores))
    rng = max_s - min_s if max_s != min_s else 1.0

    anomaly_scores = {}
    for addr, raw in zip(addresses, raw_scores):
        norm_score = float(np.clip(1.0 - (raw - min_s) / rng, 0.0, 1.0))
        anomaly_scores[addr] = round(norm_score, 3)

        db_manager.wallets.update_one(
            {"wallet_address": addr},
            {"$set": {"anomaly_score": round(norm_score, 3)}}
        )

    logger.info(f"Isolation Forest evaluated {len(addresses)} wallets. Mean anomaly score: {np.mean(list(anomaly_scores.values())):.3f}")
    return anomaly_scores
