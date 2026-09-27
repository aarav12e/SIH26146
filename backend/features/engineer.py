import logging
import math
import numpy as np
import networkx as nx
from typing import Dict, Any, List, Tuple
from backend.db.mongo_client import db_manager

logger = logging.getLogger("bitcoin_forensics.features")

class FeatureEngineer:
    """
    Computes per-wallet forensic behavioral metrics for unsupervised ML:
    - fan-in, fan-out, fan-ratio
    - transaction velocity
    - amount mean, variance, sum
    - round number frequency (mixer indicator)
    - IP diversity (Tor / VPN indicator)
    - degree and betweenness centrality
    """
    def __init__(self):
        self.features_dict: Dict[str, Dict[str, float]] = {}

    def compute_all_features(self, G: nx.MultiDiGraph) -> Dict[str, Dict[str, float]]:
        self.features_dict.clear()

        wallet_nodes = [n for n, d in G.nodes(data=True) if d.get("node_type") == "wallet"]
        if not wallet_nodes:
            logger.warning("No wallet nodes found in graph to compute features.")
            return {}

        # 1. Graph Centralities (sampled if very large for performance)
        try:
            deg_centrality = nx.degree_centrality(G)
        except Exception:
            deg_centrality = {n: 0.0 for n in wallet_nodes}

        try:
            # Approximate betweenness centrality if graph > 200 nodes
            k_sample = min(len(G), 100) if len(G) > 200 else None
            bet_centrality = nx.betweenness_centrality(G, k=k_sample, normalized=True)
        except Exception:
            bet_centrality = {n: 0.0 for n in wallet_nodes}

        # 2. Iterate each wallet node
        for w in wallet_nodes:
            node_data = G.nodes[w]
            
            # Incoming (received from txs)
            in_edges = G.in_edges(w, data=True)
            fan_in = len(in_edges)
            in_amounts = [d.get("amount", 1.0) for _, _, d in in_edges]

            # Outgoing (sent to txs)
            out_edges = G.out_edges(w, data=True)
            fan_out = len(out_edges)
            out_amounts = [d.get("amount", 1.0) for _, _, d in out_edges]

            # Fan ratio
            fan_ratio = float(fan_out) / max(float(fan_in), 1.0)

            # Amount metrics
            all_amounts = in_amounts + out_amounts
            if all_amounts:
                amount_mean = float(np.mean(all_amounts))
                amount_var = float(np.var(all_amounts))
                amount_sum = float(np.sum(all_amounts))
                # Round number frequency (e.g. 0.1, 1.0, 5.0, 10.0 common in CoinJoin / laundering)
                round_count = sum(1 for a in all_amounts if abs(a - round(a, 2)) < 0.0001 or abs(a - round(a)) < 0.0001)
                round_freq = float(round_count) / len(all_amounts)
            else:
                amount_mean, amount_var, amount_sum, round_freq = 0.0, 0.0, 0.0, 0.0

            # IP diversity
            associated_ips = node_data.get("associated_ips", [])
            ip_diversity = len(set(associated_ips)) if associated_ips else 1

            # Transaction velocity (edges or transactions per hour)
            timestamps = []
            for _, _, d in list(in_edges) + list(out_edges):
                ts = d.get("timestamp")
                if isinstance(ts, (int, float)):
                    timestamps.append(float(ts))
                elif isinstance(ts, str) and ts:
                    try:
                        # Try parsing ISO timestamp or float string
                        t_val = pd.to_datetime(ts).timestamp()
                        timestamps.append(float(t_val))
                    except Exception:
                        try:
                            timestamps.append(float(ts))
                        except Exception:
                            pass
                elif hasattr(ts, "timestamp"):
                    try:
                        timestamps.append(float(ts.timestamp()))
                    except Exception:
                        pass
            
            total_activity = fan_in + fan_out
            if len(timestamps) >= 2:
                time_span_hours = (max(timestamps) - min(timestamps)) / 3600.0
                if time_span_hours > 0:
                    velocity = len(timestamps) / time_span_hours
                else:
                    velocity = float(len(timestamps) * 2.0)
            elif total_activity > 0:
                velocity = float(total_activity) * 0.75
            else:
                velocity = 0.5

            feat = {
                "fan_in": float(fan_in),
                "fan_out": float(fan_out),
                "fan_ratio": round(fan_ratio, 3),
                "velocity": round(velocity, 3),
                "amount_mean": round(amount_mean, 4),
                "amount_variance": round(amount_var, 4),
                "amount_sum": round(amount_sum, 4),
                "round_number_freq": round(round_freq, 3),
                "ip_diversity": float(ip_diversity),
                "degree_centrality": round(deg_centrality.get(w, 0.0), 5),
                "betweenness_centrality": round(bet_centrality.get(w, 0.0), 5)
            }

            self.features_dict[w] = feat

            # Update database
            db_manager.wallets.update_one(
                {"wallet_address": w},
                {"$set": {
                    "wallet_address": w,
                    "features": feat,
                    "associated_ips": associated_ips,
                    "associated_asns": node_data.get("associated_asns", [])
                }},
                upsert=True
            )

        logger.info(f"Engineered forensic features for {len(self.features_dict)} wallets.")
        return self.features_dict

feature_engine = FeatureEngineer()
