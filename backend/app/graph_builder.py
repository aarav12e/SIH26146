import networkx as nx
import logging
from typing import Dict, Any, List, Optional
from backend.app.db import db_manager

logger = logging.getLogger("bitcoin_forensics.graph")

class GraphBuilder:
    def __init__(self):
        self.G = nx.DiGraph()

    def build_from_transactions(self, transactions: Optional[List[Dict[str, Any]]] = None) -> nx.DiGraph:
        """Constructs NetworkX directed multi-entity graph and persists edges."""
        if transactions is None:
            transactions = db_manager.transactions.find()

        self.G.clear()
        edge_docs = []

        for tx in transactions:
            txid = tx["txid"]
            src_ip = tx.get("src_ip")
            dst_ip = tx.get("dst_ip")
            timestamp = tx.get("timestamp")
            geo_country = tx.get("geo_country", "Unknown")
            asn = tx.get("asn", "AS0")

            # Add Transaction Node
            in_sum = sum(tx.get("input_amounts", []))
            out_sum = sum(tx.get("output_amounts", []))
            tx_amount = max(in_sum, out_sum)
            
            self.G.add_node(
                txid,
                node_type="transaction",
                label=f"TX: {txid[:8]}...",
                amount=tx_amount,
                timestamp=timestamp,
                country=geo_country,
                asn=asn
            )

            # Add IP Nodes & originated_from edges
            if src_ip:
                self.G.add_node(
                    src_ip,
                    node_type="ip",
                    label=f"IP: {src_ip}",
                    country=geo_country,
                    asn=asn
                )
                self.G.add_edge(src_ip, txid, edge_type="originated_from", weight=1.0, txid=txid)
                edge_docs.append({
                    "source": src_ip,
                    "target": txid,
                    "type": "originated_from",
                    "weight": 1.0,
                    "txid": txid
                })

            if dst_ip and dst_ip != src_ip:
                self.G.add_node(
                    dst_ip,
                    node_type="ip",
                    label=f"IP: {dst_ip}",
                    country=tx.get("dst_geo", {}).get("geo_country", "Unknown"),
                    asn=tx.get("dst_geo", {}).get("asn", "AS0")
                )
                self.G.add_edge(txid, dst_ip, edge_type="broadcast_to", weight=1.0, txid=txid)
                edge_docs.append({
                    "source": txid,
                    "target": dst_ip,
                    "type": "broadcast_to",
                    "weight": 1.0,
                    "txid": txid
                })

            # Add Input Wallets (sent)
            in_addrs = tx.get("input_addresses", [])
            in_amts = tx.get("input_amounts", [])
            for i, addr in enumerate(in_addrs):
                if not addr:
                    continue
                amt = in_amts[i] if i < len(in_amts) else 0.0
                if not self.G.has_node(addr):
                    self.G.add_node(addr, node_type="wallet", label=f"W: {addr[:6]}...{addr[-4:] if len(addr)>10 else ''}", total_sent=0.0, total_received=0.0)
                self.G.nodes[addr]["total_sent"] = self.G.nodes[addr].get("total_sent", 0.0) + amt
                self.G.add_edge(addr, txid, edge_type="sent", weight=amt, txid=txid)
                edge_docs.append({
                    "source": addr,
                    "target": txid,
                    "type": "sent",
                    "weight": amt,
                    "txid": txid
                })

            # Add Output Wallets (received)
            out_addrs = tx.get("output_addresses", [])
            out_amts = tx.get("output_amounts", [])
            for i, addr in enumerate(out_addrs):
                if not addr:
                    continue
                amt = out_amts[i] if i < len(out_amts) else 0.0
                if not self.G.has_node(addr):
                    self.G.add_node(addr, node_type="wallet", label=f"W: {addr[:6]}...{addr[-4:] if len(addr)>10 else ''}", total_sent=0.0, total_received=0.0)
                self.G.nodes[addr]["total_received"] = self.G.nodes[addr].get("total_received", 0.0) + amt
                self.G.add_edge(txid, addr, edge_type="received", weight=amt, txid=txid)
                edge_docs.append({
                    "source": txid,
                    "target": addr,
                    "type": "received",
                    "weight": amt,
                    "txid": txid
                })

        # Persist to graph_edges collection
        db_manager.graph_edges.delete_many({})
        if edge_docs:
            db_manager.graph_edges.insert_many(edge_docs)

        logger.info(f"Built graph with {self.G.number_of_nodes()} nodes and {self.G.number_of_edges()} edges.")
        return self.G

    def get_subgraph(self, center_node: str, hops: int = 2, max_nodes: int = 60) -> Dict[str, Any]:
        """Returns ego-graph / N-hop neighborhood formatted for UI force-graph."""
        if not self.G.has_node(center_node):
            return {"nodes": [], "links": []}

        undirected_G = self.G.to_undirected()
        sub_nodes = set([center_node])
        current_layer = set([center_node])

        for _ in range(hops):
            next_layer = set()
            for node in current_layer:
                next_layer.update(undirected_G.neighbors(node))
            sub_nodes.update(next_layer)
            current_layer = next_layer
            if len(sub_nodes) >= max_nodes:
                break

        sub_nodes = list(sub_nodes)[:max_nodes]
        subgraph = self.G.subgraph(sub_nodes)
        return self.to_d3_format(subgraph, highlight_node=center_node)

    def get_full_graph_data(self, max_nodes: int = 250) -> Dict[str, Any]:
        """Returns graph data formatted for D3/react-force-graph."""
        if self.G.number_of_nodes() == 0:
            self.build_from_transactions()

        if self.G.number_of_nodes() <= max_nodes:
            return self.to_d3_format(self.G)

        degrees = dict(self.G.degree())
        top_nodes = sorted(degrees.keys(), key=lambda n: degrees[n], reverse=True)[:max_nodes]
        subgraph = self.G.subgraph(top_nodes)
        return self.to_d3_format(subgraph)

    def to_d3_format(self, G: nx.DiGraph, highlight_node: Optional[str] = None) -> Dict[str, Any]:
        """Converts NetworkX graph to nodes and links structure for UI."""
        flags = {f.get("flagged_id", f.get("entity_id")): f for f in db_manager.flags.find()}
        wallets = {w["_id"]: w for w in db_manager.wallets.find()}

        nodes = []
        for n, attrs in G.nodes(data=True):
            ntype = attrs.get("node_type", "unknown")
            flag_info = flags.get(n)
            wallet_info = wallets.get(n)

            anomaly_score = 0.0
            risk_score = 0.0
            entity_id = -1
            is_peel = False

            if flag_info:
                anomaly_score = flag_info.get("anomaly_score", 0.0)
                risk_score = flag_info.get("risk_score", 0.0)
                entity_id = flag_info.get("entity_cluster_id", flag_info.get("cluster_id", -1))
                is_peel = flag_info.get("is_peel", False)
            elif wallet_info:
                anomaly_score = wallet_info.get("anomaly_score", 0.0)
                risk_score = wallet_info.get("risk_score", 0.0)
                entity_id = wallet_info.get("entity_id", -1)

            node_obj = {
                "id": n,
                "label": attrs.get("label", str(n)),
                "node_type": ntype,
                "anomaly_score": anomaly_score,
                "risk_score": risk_score,
                "entity_id": entity_id,
                "cluster_id": entity_id,
                "is_peel": is_peel,
                "is_flagged": (risk_score >= 0.50 or anomaly_score >= 0.60 or flag_info is not None),
                "is_center": (n == highlight_node),
                "degree": G.degree(n),
                "country": attrs.get("country", ""),
                "asn": attrs.get("asn", "")
            }
            nodes.append(node_obj)

        links = []
        for u, v, attrs in G.edges(data=True):
            links.append({
                "source": u,
                "target": v,
                "type": attrs.get("edge_type", "rel"),
                "weight": float(attrs.get("weight", 1.0)),
                "txid": attrs.get("txid", "")
            })

        return {"nodes": nodes, "links": links}

graph_builder = GraphBuilder()
