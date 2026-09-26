import datetime
import numpy as np
import networkx as nx
import logging
from typing import Dict, Any, List
from collections import defaultdict
from backend.app.db import db_manager

logger = logging.getLogger("bitcoin_forensics.features")

def _is_suspiciously_round(amount: float) -> bool:
    """Checks if a Bitcoin amount is suspiciously round (structuring pattern)."""
    if amount <= 0:
        return False
    # Exact integers (1.0, 5.0, 10.0, 50.0, 100.0)
    if abs(amount - round(amount)) < 1e-5:
        return True
    # Half or quarter units (0.5, 0.25, 0.1, 0.05)
    for denom in [10.0, 5.0, 2.0, 1.0, 0.5, 0.1, 0.05, 0.01]:
        if abs(amount / denom - round(amount / denom)) < 1e-4:
            return True
    return False

class FeatureEngine:
    def compute_all_features(self, G: nx.DiGraph) -> Dict[str, Dict[str, Any]]:
        """Computes all per-wallet features defined in PRD Section 6.1 and writes to DB."""
        transactions = db_manager.transactions.find()
        if not transactions:
            return {}

        # 1. Centrality metrics on NetworkX Graph
        logger.info("Computing graph centralities...")
        # For betweenness, use k sampling if graph is large to maintain fast sub-second response
        num_nodes = G.number_of_nodes()
        k_sample = min(150, num_nodes) if num_nodes > 150 else None
        try:
            betweenness = nx.betweenness_centrality(G, k=k_sample, normalized=True)
        except Exception:
            betweenness = {n: 0.0 for n in G.nodes()}

        try:
            degree_cent = nx.degree_centrality(G)
        except Exception:
            degree_cent = {n: 0.0 for n in G.nodes()}

        # 2. Accumulate per-wallet transaction metadata
        wallet_stats = defaultdict(lambda: {
            "timestamps": [],
            "sent_amounts": [],
            "received_amounts": [],
            "input_counterparts": set(),
            "output_counterparts": set(),
            "ips": set(),
            "asns": set(),
            "tx_ids": set()
        })

        for tx in transactions:
            txid = tx["txid"]
            ts_str = tx.get("timestamp")
            try:
                ts_dt = datetime.datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            except Exception:
                ts_dt = datetime.datetime.now(datetime.timezone.utc)

            src_ip = tx.get("src_ip")
            asn = tx.get("asn")

            in_addrs = tx.get("input_addresses", [])
            in_amts = tx.get("input_amounts", [])
            out_addrs = tx.get("output_addresses", [])
            out_amts = tx.get("output_amounts", [])

            # Senders
            for i, addr in enumerate(in_addrs):
                if not addr:
                    continue
                amt = in_amts[i] if i < len(in_amts) else 0.0
                ws = wallet_stats[addr]
                ws["timestamps"].append(ts_dt)
                ws["sent_amounts"].append(amt)
                ws["tx_ids"].add(txid)
                if src_ip:
                    ws["ips"].add(src_ip)
                if asn:
                    ws["asns"].add(asn)
                # Counterparts are output addresses of this tx
                for out_a in out_addrs:
                    if out_a and out_a != addr:
                        ws["output_counterparts"].add(out_a)

            # Receivers
            for i, addr in enumerate(out_addrs):
                if not addr:
                    continue
                amt = out_amts[i] if i < len(out_amts) else 0.0
                ws = wallet_stats[addr]
                ws["timestamps"].append(ts_dt)
                ws["received_amounts"].append(amt)
                ws["tx_ids"].add(txid)
                if src_ip:
                    ws["ips"].add(src_ip)
                if asn:
                    ws["asns"].add(asn)
                # Counterparts are input addresses of this tx
                for in_a in in_addrs:
                    if in_a and in_a != addr:
                        ws["input_counterparts"].add(in_a)

        # 3. Compute per-wallet features
        wallet_docs = []
        wallet_feature_dict = {}

        for wallet_addr, st in wallet_stats.items():
            timestamps = sorted(st["timestamps"])
            first_seen = timestamps[0].isoformat() if timestamps else ""
            last_seen = timestamps[-1].isoformat() if timestamps else ""
            tx_count = len(st["tx_ids"])
            total_sent = float(sum(st["sent_amounts"]))
            total_received = float(sum(st["received_amounts"]))

            fan_in = len(st["input_counterparts"])
            fan_out = len(st["output_counterparts"])
            # fan_ratio: fan_out : fan_in (classic peeling-chain / structuring signal)
            fan_ratio = float(round(fan_out / max(fan_in, 1), 2))

            # Velocity: tx per hour
            if len(timestamps) > 1:
                duration_hours = max((timestamps[-1] - timestamps[0]).total_seconds() / 3600.0, 0.05)
                velocity = float(round(tx_count / duration_hours, 2))
            else:
                velocity = 1.0

            # Amount variance
            all_amounts = st["sent_amounts"] + st["received_amounts"]
            amount_var = float(round(np.var(all_amounts), 4)) if all_amounts else 0.0

            # Round number frequency
            round_count = sum(1 for a in all_amounts if _is_suspiciously_round(a))
            round_freq = float(round(round_count / max(len(all_amounts), 1), 3))

            # IP diversity (count of distinct IPs + distinct ASNs)
            ip_count = len(st["ips"])
            asn_count = len(st["asns"])
            ip_diversity = int(ip_count + asn_count)

            # Centrality
            bc = float(round(betweenness.get(wallet_addr, 0.0), 6))
            dc = float(round(degree_cent.get(wallet_addr, 0.0), 6))

            features = {
                "fan_in": fan_in,
                "fan_out": fan_out,
                "fan_ratio": fan_ratio,
                "velocity": velocity,
                "amount_variance": amount_var,
                "round_number_freq": round_freq,
                "ip_diversity": ip_diversity,
                "betweenness_centrality": bc,
                "degree_centrality": dc
            }

            doc = {
                "_id": wallet_addr,
                "wallet_address": wallet_addr,
                "first_seen": first_seen,
                "last_seen": last_seen,
                "total_sent": total_sent,
                "total_received": total_received,
                "tx_count": tx_count,
                "associated_ips": list(st["ips"]),
                "associated_asns": list(st["asns"]),
                "cluster_id": -1,  # Populated in clustering phase
                "features": features
            }
            wallet_docs.append(doc)
            wallet_feature_dict[wallet_addr] = doc

        # Save to wallets collection in DB
        db_manager.wallets.delete_many({})
        if wallet_docs:
            db_manager.wallets.insert_many(wallet_docs)

        logger.info(f"Computed features for {len(wallet_docs)} wallets.")
        return wallet_feature_dict


feature_engine = FeatureEngine()
