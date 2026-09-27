import logging
import networkx as nx
from typing import List, Dict, Any

logger = logging.getLogger("bitcoin_forensics.graph.builder")

class GraphBuilder:
    """
    Constructs a multi-entity directed forensic graph using NetworkX.
    Nodes: 'wallet', 'transaction', 'ip'
    Edges: 'sent', 'received', 'originated_from', 'peel_hop'
    """
    def __init__(self):
        self.G = nx.MultiDiGraph()

    def build_from_transactions(self, transactions: List[Dict[str, Any]]) -> nx.MultiDiGraph:
        self.G.clear()
        
        for tx in transactions:
            txid = str(tx.get("txid") or tx.get("_id"))
            ts = tx.get("timestamp")
            src_ip = tx.get("src_ip")
            country = tx.get("geo_country", "Unknown")
            asn = tx.get("geo_asn", "Unknown")

            # 1. Add Transaction Vertex
            self.G.add_node(
                txid,
                node_type="transaction",
                label=f"TX: {txid[:8]}",
                timestamp=ts,
                geo_country=country,
                geo_asn=asn
            )

            # 2. Add Network IP Vertex
            if src_ip and src_ip != "None":
                self.G.add_node(
                    src_ip,
                    node_type="ip",
                    label=src_ip,
                    geo_country=country,
                    geo_asn=asn
                )
                self.G.add_edge(
                    src_ip,
                    txid,
                    type="originated_from",
                    weight=1.0,
                    timestamp=ts
                )

            # 3. Add Input Wallet Vertices (Senders)
            in_addrs = tx.get("input_addresses") or []
            in_amts = tx.get("input_amounts") or []
            for i, addr in enumerate(in_addrs):
                if not addr: continue
                s_addr = str(addr)
                amt = float(in_amts[i]) if i < len(in_amts) else 1.0

                if not self.G.has_node(s_addr):
                    self.G.add_node(
                        s_addr,
                        node_type="wallet",
                        label=s_addr,
                        associated_ips=[src_ip] if src_ip else [],
                        associated_asns=[asn] if asn else []
                    )
                else:
                    node_data = self.G.nodes[s_addr]
                    if src_ip and src_ip not in node_data.get("associated_ips", []):
                        node_data.setdefault("associated_ips", []).append(src_ip)
                    if asn and asn not in node_data.get("associated_asns", []):
                        node_data.setdefault("associated_asns", []).append(asn)

                self.G.add_edge(
                    s_addr,
                    txid,
                    type="sent",
                    amount=amt,
                    weight=amt,
                    timestamp=ts
                )

            # 4. Add Output Wallet Vertices (Receivers)
            out_addrs = tx.get("output_addresses") or []
            out_amts = tx.get("output_amounts") or []
            for j, addr in enumerate(out_addrs):
                if not addr: continue
                s_addr = str(addr)
                amt = float(out_amts[j]) if j < len(out_amts) else 1.0

                if not self.G.has_node(s_addr):
                    self.G.add_node(
                        s_addr,
                        node_type="wallet",
                        label=s_addr,
                        associated_ips=[src_ip] if src_ip else [],
                        associated_asns=[asn] if asn else []
                    )
                self.G.add_edge(
                    txid,
                    s_addr,
                    type="received",
                    amount=amt,
                    weight=amt,
                    timestamp=ts
                )

        logger.info(
            f"Forensic Graph Constructed: {self.G.number_of_nodes()} nodes, "
            f"{self.G.number_of_edges()} edges across {len(transactions)} transactions."
        )
        return self.G

graph_builder = GraphBuilder()
