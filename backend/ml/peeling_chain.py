import logging
import networkx as nx
from typing import Dict, Any, List, Tuple
from backend.db.mongo_client import db_manager
from backend.config import PEEL_RATIO_THRESHOLD, MIN_PEEL_CHAIN_LEN

logger = logging.getLogger("bitcoin_forensics.ml.peeling")

def detect_peeling_chains(G: nx.MultiDiGraph) -> Tuple[Dict[str, Dict[str, Any]], Dict[str, int]]:
    """
    NTRO §6.4: Peeling-Chain Detection via Sequential Graph-Walk.
    Identifies chains where a large balance is split into a small payment output
    and a large change output that feeds the subsequent transaction in succession.
    """
    tx_nodes = [n for n, d in G.nodes(data=True) if d.get("node_type") == "transaction"]
    wallet_peels = {}
    peel_flags_per_tx = {}

    for tx in tx_nodes:
        in_edges = G.in_edges(tx, data=True)
        out_edges = G.out_edges(tx, data=True)

        if len(in_edges) == 1 and len(out_edges) == 2:
            out_amounts = [d.get("amount", 1.0) for _, _, d in out_edges]
            total_out = sum(out_amounts)
            if total_out > 0:
                small_out = min(out_amounts)
                large_out = max(out_amounts)
                ratio = small_out / total_out

                if ratio <= PEEL_RATIO_THRESHOLD:
                    # Potential peeling hop detected
                    chain_len = 1
                    current_tx = tx
                    hops_wallets = []

                    # DFS forward hop exploration
                    for _ in range(MIN_PEEL_CHAIN_LEN + 3):
                        next_txs = []
                        for _, out_w, d in G.out_edges(current_tx, data=True):
                            hops_wallets.append(out_w)
                            for _, next_t, _ in G.out_edges(out_w, data=True):
                                if G.nodes[next_t].get("node_type") == "transaction" and next_t != current_tx:
                                    next_txs.append(next_t)
                        if next_txs:
                            current_tx = next_txs[0]
                            chain_len += 1
                        else:
                            break

                    is_confirmed_peel = chain_len >= MIN_PEEL_CHAIN_LEN
                    peel_flags_per_tx[tx] = {
                        "is_peel": is_confirmed_peel,
                        "peel_ratio": round(ratio, 3),
                        "chain_length": chain_len,
                        "peel_type": f"{round(ratio*100, 1)}% asymmetric peel"
                    }

                    if is_confirmed_peel:
                        for w in hops_wallets:
                            wallet_peels[w] = max(wallet_peels.get(w, 0), chain_len)

    # Persist peeling flags to database
    for tx, flag in peel_flags_per_tx.items():
        if flag["is_peel"]:
            db_manager.transactions.update_one(
                {"txid": tx},
                {"$set": {"chain_flag": flag}}
            )

    for w, plen in wallet_peels.items():
        db_manager.wallets.update_one(
            {"wallet_address": w},
            {"$set": {"is_peel": True, "peel_length": plen}}
        )

    logger.info(f"Peeling-Chain Detection: {len(wallet_peels)} wallets involved across {len([t for t, f in peel_flags_per_tx.items() if f['is_peel']])} hop transactions.")
    return peel_flags_per_tx, wallet_peels
