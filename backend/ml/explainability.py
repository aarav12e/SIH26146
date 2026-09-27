import logging
import numpy as np
from typing import Dict, Any, List
from backend.db.mongo_client import db_manager

logger = logging.getLogger("bitcoin_forensics.ml.explainability")

def generate_flag_explanations(
    anomaly_scores: Dict[str, float],
    risk_scores: Dict[str, float],
    wallet_peels: Dict[str, int],
    entity_ids: Dict[str, str],
    features_dict: Dict[str, Dict[str, float]]
) -> List[Dict[str, Any]]:
    """
    NTRO §6.6: Explainability Layer.
    Generates rule-driven, human-readable reason strings combining all 4 signals:
    - Anomalous feature thresholds (fan ratio, velocity, IP diversity)
    - Multi-input entity cluster membership
    - Peeling-chain sequential graph walk
    - Personalized PageRank guilt-by-association propagation
    """
    db_manager.flags.delete_many({})

    wallets = list(db_manager.wallets.find())
    flagged_records = []

    # Calculate feature percentiles for comparative explanation
    fan_ratios = [f.get("fan_ratio", 1.0) for f in features_dict.values()]
    velocities = [f.get("velocity", 0.0) for f in features_dict.values()]
    p90_fan = float(np.percentile(fan_ratios, 90)) if fan_ratios else 3.0
    p85_vel = float(np.percentile(velocities, 85)) if velocities else 2.0

    cluster_sizes = {}
    for cid in entity_ids.values():
        cluster_sizes[cid] = cluster_sizes.get(cid, 0) + 1

    for w in wallets:
        addr = w.get("wallet_address") or w.get("_id")
        r_score = risk_scores.get(addr, w.get("risk_score", 0.0))
        a_score = anomaly_scores.get(addr, w.get("anomaly_score", 0.0))
        plen = wallet_peels.get(addr, 0)
        cid = entity_ids.get(addr, w.get("entity_id", "1"))
        c_size = cluster_sizes.get(cid, 1)
        feats = features_dict.get(addr, w.get("features", {}))

        # Flag threshold: High risk score, anomaly score, or peel chain
        should_flag = (r_score >= 0.50) or (a_score >= 0.65) or (plen >= 3)
        if not should_flag:
            continue

        reasons = []

        # 1. Feature Anomaly Reasoning
        fan_ratio = feats.get("fan_ratio", 1.0)
        if fan_ratio >= p90_fan and fan_ratio > 2.5:
            reasons.append(
                f"Severe asymmetric fan-out ratio of {fan_ratio:.1f}:1 (top 10% percentile), indicating aggressive fund dispersal or layering."
            )

        vel = feats.get("velocity", 0.0)
        if vel >= p85_vel and vel > 1.5:
            reasons.append(
                f"Abnormal burst transaction velocity of {vel:.1f} events/hour, characteristic of programmatic bot or rapid hop script."
            )

        ip_div = feats.get("ip_diversity", 1.0)
        if ip_div >= 2:
            reasons.append(
                f"Multi-homed broadcast: transactions routed across {int(ip_div)} distinct network IPs, indicating VPN/Tor proxy rotation."
            )

        # 2. Peeling Chain Reasoning
        if plen >= 3:
            reasons.append(
                f"Identified as active node in a {plen}-hop sequential peeling chain with high-frequency asymmetric change outputs."
            )

        # 3. Entity Cluster Reasoning
        if c_size >= 3:
            reasons.append(
                f"Common-input clustering links this address to Entity Cluster #{cid} containing {c_size} co-signed wallet addresses."
            )

        # 4. Risk Propagation Reasoning
        if r_score >= 0.70:
            reasons.append(
                f"High-priority investigative lead: Personalized PageRank guilt-by-association score of {r_score:.2f} propagated from seed threat nodes."
            )

        # Fallback if specific conditions weren't met
        if not reasons:
            reasons.append(
                f"Isolation Forest identified multivariate anomaly profile (anomaly score: {a_score:.2f}, risk: {r_score:.2f})."
            )

        summary_sentence = (
            f"Wallet {addr[:10]}... flagged with risk score {r_score:.2f}: "
            f"{reasons[0]}"
        )

        flag_doc = {
            "flagged_id": addr,
            "entity_id": addr,
            "target_type": "wallet",
            "anomaly_score": a_score,
            "risk_score": r_score,
            "entity_cluster_id": cid,
            "cluster_id": cid,
            "is_peel": bool(plen >= 3),
            "peel_length": plen,
            "reasons": reasons,
            "summary": summary_sentence,
            "associated_ips": w.get("associated_ips", []),
            "associated_asns": w.get("associated_asns", [])
        }

        flagged_records.append(flag_doc)

        db_manager.wallets.update_one(
            {"wallet_address": addr},
            {"$set": {"is_flagged": True}}
        )

    # Sort descending by risk score
    flagged_records.sort(key=lambda x: x["risk_score"], reverse=True)

    if flagged_records:
        db_manager.flags.insert_many(flagged_records)

    logger.info(f"Explainability Engine generated {len(flagged_records)} prioritized threat leads.")
    return flagged_records
