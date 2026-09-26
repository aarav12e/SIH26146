import datetime
import numpy as np
import scipy.stats as stats
import logging
from typing import Dict, Any, List
from backend.app.db import db_manager
from backend.app.config import FLAG_SCORE_THRESHOLD

logger = logging.getLogger("bitcoin_forensics.explainability")

class ExplainabilityEngine:
    def generate_flags_and_explanations(self, wallet_peels: Dict[str, List[int]], risk_attributions: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Combines all 4 official focus areas (Entity Clustering, Anomaly Detection, Peeling/Mixing, Risk Propagation)
        to generate prioritized, explainable lead dossiers matching the exact NTRO PRD template.
        """
        wallets = db_manager.wallets.find()
        if not wallets:
            return []

        clusters = {c.get("entity_id", c.get("cluster_id")): c for c in db_manager.clusters.find()}

        # Feature distributions for percentile computation
        all_fan_ratios = [w.get("features", {}).get("fan_ratio", 0.0) for w in wallets]
        all_velocities = [w.get("features", {}).get("velocity", 0.0) for w in wallets]
        all_ip_divs = [w.get("features", {}).get("ip_diversity", 0) for w in wallets]
        all_round_freqs = [w.get("features", {}).get("round_number_freq", 0.0) for w in wallets]
        all_bcs = [w.get("features", {}).get("betweenness_centrality", 0.0) for w in wallets]

        def get_top_percentile(val: float, distribution: List[float]) -> int:
            if not distribution or max(distribution) == 0:
                return 50
            pctile = stats.percentileofscore(distribution, val, kind="weak")
            top_p = max(1, int(round(100 - pctile)))
            return top_p

        flag_docs = []
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # Sort wallets by composite risk & anomaly score
        sorted_wallets = sorted(
            wallets, 
            key=lambda w: max(w.get("anomaly_score", 0.0), w.get("risk_score", 0.0)), 
            reverse=True
        )

        min_flag_count = max(4, int(len(sorted_wallets) * 0.25))

        for idx, w in enumerate(sorted_wallets):
            wid = w["_id"]
            anomaly_score = float(w.get("anomaly_score", 0.0))
            risk_info = risk_attributions.get(wid, {})
            risk_score = float(w.get("risk_score") or risk_info.get("risk_score", 0.0))

            is_peel = len(wallet_peels.get(wid, [])) > 0
            is_above_threshold = (anomaly_score >= FLAG_SCORE_THRESHOLD) or (risk_score >= 0.50) or is_peel
            is_top_cohort = idx < min_flag_count and (anomaly_score >= 0.40 or risk_score >= 0.35)

            if not (is_above_threshold or is_top_cohort):
                continue

            feats = w.get("features", {})
            entity_id = w.get("entity_id", 1)
            cluster_info = clusters.get(entity_id, {})
            co_spent_count = cluster_info.get("node_count", 1)
            embedding_neighbors = w.get("embedding_neighbors", [])

            fan_ratio = feats.get("fan_ratio", 1.0)
            velocity = feats.get("velocity", 1.0)
            ip_div = feats.get("ip_diversity", 1)
            round_freq = feats.get("round_number_freq", 0.0)
            bc = feats.get("betweenness_centrality", 0.0)
            ips = w.get("associated_ips", [])
            asns = w.get("associated_asns", [])

            reasons = []

            # 1. Behavioral: Fan-out ratio (Peeling Chain / Dispersal signal)
            fan_top_p = get_top_percentile(fan_ratio, all_fan_ratios)
            if fan_ratio >= 3.0 or fan_top_p <= 10:
                reasons.append(f"Fan-out ratio {fan_ratio:.1f}:1 (top {fan_top_p}% percentile)")

            # 2. Entity Clustering (Common-Input Union-Find)
            if co_spent_count > 1:
                reasons.append(f"Part of entity cluster #{entity_id} ({co_spent_count} co-spent addresses)")
            else:
                reasons.append(f"Part of entity cluster #{entity_id}")

            # 3. Soft Node2Vec grouping
            if embedding_neighbors:
                reasons.append(f"Node2Vec structural embedding neighbor to {len(embedding_neighbors)} un-joined wallets ({embedding_neighbors[0][:8]}...)")

            # 4. Peeling Chain pattern match
            if is_peel:
                max_peel_len = max(wallet_peels[wid])
                reasons.append(f"Matches peeling-chain pattern, length {max_peel_len}")

            # 5. Risk Propagation (Personalized PageRank & Hop attribution)
            seed_wallet = risk_info.get("seed_wallet", wid)
            hop_dist = risk_info.get("hop_distance", 0)
            if hop_dist > 0 and seed_wallet != wid:
                seed_short = f"{seed_wallet[:6]}...{seed_wallet[-4:]}" if len(seed_wallet) > 10 else seed_wallet
                reasons.append(f"Risk propagated from seed wallet {seed_short} at hop {hop_dist}")
            elif risk_score >= 0.70:
                reasons.append("Primary seed originator for graph risk propagation")

            # 6. Multi-IP / ASN Evasion
            if len(ips) >= 2 or len(asns) >= 2:
                reasons.append(f"{len(ips)} associated IPs across {len(asns)} ASNs (proxy evasion behavior)")

            # 7. Velocity / Round Number Structuring
            if velocity >= 5.0:
                vel_top_p = get_top_percentile(velocity, all_velocities)
                reasons.append(f"Rapid transaction velocity ({velocity:.1f} tx/hr, top {vel_top_p}% percentile)")
            if round_freq >= 0.40:
                reasons.append(f"Structured round-number amounts in {int(round_freq*100)}% of transactions")

            # Formulate the executive templated string matching the new PRD Section 6.6 format
            summary_statement = (
                f"Wallet {wid} flagged (risk_score {risk_score:.2f}): "
                f"{'; '.join(reasons)}."
            )

            flag_doc = {
                "_id": f"flag_{wid}",
                "flagged_id": wid,
                "entity_id": wid, # Backwards compatibility
                "entity_type": "wallet",
                "anomaly_score": anomaly_score,
                "risk_score": risk_score,
                "confidence": int(max(anomaly_score, risk_score) * 100),
                "entity_cluster_id": entity_id,
                "cluster_id": entity_id, # Backwards compatibility
                "summary": summary_statement,
                "reasons": reasons,
                "feature_snapshot": feats,
                "associated_ips": ips,
                "associated_asns": asns,
                "is_peel": is_peel,
                "embedding_neighbors": embedding_neighbors,
                "flagged_at": now_iso
            }
            flag_docs.append(flag_doc)

        db_manager.flags.delete_many({})
        if flag_docs:
            db_manager.flags.insert_many(flag_docs)

        logger.info(f"Generated {len(flag_docs)} prioritized explainable flags.")
        return flag_docs

explainability_engine = ExplainabilityEngine()
