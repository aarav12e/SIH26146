import logging
import networkx as nx
from typing import Dict, Any, List, Optional
from backend.db.mongo_client import db_manager

logger = logging.getLogger("bitcoin_forensics.graph.persistence")

def persist_graph_edges(G: nx.MultiDiGraph) -> int:
    """
    Persists graph edges to the database graph_edges collection.
    """
    db_manager.graph_edges.delete_many({})
    records = []
    
    for u, v, k, data in G.edges(keys=True, data=True):
        records.append({
            "source": str(u),
            "target": str(v),
            "key": k,
            "type": data.get("type", "sent"),
            "amount": data.get("amount", 1.0),
            "weight": data.get("weight", 1.0),
            "timestamp": data.get("timestamp")
        })

    if records:
        db_manager.graph_edges.insert_many(records)
    logger.info(f"Persisted {len(records)} graph edges to database.")
    return len(records)

def load_graph_from_db(max_nodes: int = 250) -> Dict[str, Any]:
    """
    Loads nodes and links from database formatted for react-force-graph.
    """
    wallets = list(db_manager.wallets.find().limit(max_nodes))
    edges = list(db_manager.graph_edges.find())
    
    nodes_dict = {}
    for w in wallets:
        wid = w.get("wallet_address") or w.get("_id")
        nodes_dict[wid] = {
            "id": wid,
            "label": wid,
            "node_type": "wallet",
            "risk_score": w.get("risk_score", 0.0),
            "anomaly_score": w.get("anomaly_score", 0.0),
            "is_flagged": w.get("is_flagged", False),
            "is_peel": w.get("is_peel", False),
            "entity_id": w.get("entity_id", "1")
        }

    links = []
    for e in edges:
        s, t = e["source"], e["target"]
        if s in nodes_dict and t in nodes_dict:
            links.append({
                "source": s,
                "target": t,
                "type": e.get("type", "sent"),
                "weight": e.get("weight", 1.0),
                "amount": e.get("amount", 1.0)
            })

    return {
        "nodes": list(nodes_dict.values()),
        "links": links
    }

def get_wallet_subgraph(wallet_id: str, hops: int = 2, max_nodes: int = 60) -> Dict[str, Any]:
    """
    Extracts an N-hop neighborhood around a target wallet from stored edges.
    """
    edges = list(db_manager.graph_edges.find())
    
    adj = {}
    for e in edges:
        s, t = e["source"], e["target"]
        adj.setdefault(s, set()).add(t)
        adj.setdefault(t, set()).add(s)

    visited = {wallet_id}
    frontier = {wallet_id}

    for _ in range(hops):
        next_frontier = set()
        for node in frontier:
            for neighbor in adj.get(node, set()):
                if neighbor not in visited:
                    visited.add(neighbor)
                    next_frontier.add(neighbor)
                if len(visited) >= max_nodes:
                    break
            if len(visited) >= max_nodes:
                break
        frontier = next_frontier
        if len(visited) >= max_nodes:
            break

    # Build node models
    wallets_map = {w.get("wallet_address") or w.get("_id"): w for w in db_manager.wallets.find({"wallet_address": {"$in": list(visited)}})}
    
    nodes = []
    for nid in visited:
        w_data = wallets_map.get(nid, {})
        nodes.append({
            "id": nid,
            "label": nid,
            "node_type": "wallet" if not nid.startswith("tx_") else "transaction",
            "risk_score": w_data.get("risk_score", 0.0),
            "anomaly_score": w_data.get("anomaly_score", 0.0),
            "is_flagged": w_data.get("is_flagged", False),
            "is_peel": w_data.get("is_peel", False),
            "entity_id": w_data.get("entity_id", "1"),
            "is_center": (nid == wallet_id)
        })

    sub_links = []
    for e in edges:
        if e["source"] in visited and e["target"] in visited:
            sub_links.append({
                "source": e["source"],
                "target": e["target"],
                "type": e.get("type", "sent"),
                "weight": e.get("weight", 1.0)
            })

    return {
        "nodes": nodes,
        "links": sub_links,
        "center_node": wallet_id,
        "hops": hops
    }
