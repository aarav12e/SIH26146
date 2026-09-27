import unittest
import networkx as nx
from backend.db.mongo_client import db_manager
from backend.graph.builder import graph_builder
from backend.graph.persistence import persist_graph_edges

class TestGraph(unittest.TestCase):
    def test_graph_construction_and_degrees(self):
        """Verification Step 4: Verify G.number_of_nodes() and G.number_of_edges() are non-zero and degree reflects transactions."""
        txs = list(db_manager.transactions.find())
        self.assertGreater(len(txs), 0, "Transactions must be in database")

        G = graph_builder.build_from_transactions(txs)

        self.assertGreater(G.number_of_nodes(), len(txs), "Nodes count should exceed transaction count")
        self.assertGreater(G.number_of_edges(), len(txs), "Edges count should exceed transaction count")

        edge_types = {d.get("type") for _, _, d in G.edges(data=True)}
        self.assertIn("sent", edge_types)
        self.assertIn("received", edge_types)

        wallet_degrees = {n: G.degree(n) for n, d in G.nodes(data=True) if d.get("node_type") == "wallet"}
        max_w = max(wallet_degrees, key=wallet_degrees.get)
        self.assertGreaterEqual(wallet_degrees[max_w], 2, "Hub wallet should have degree >= 2")

        edges_persisted = persist_graph_edges(G)
        self.assertEqual(edges_persisted, G.number_of_edges())

if __name__ == "__main__":
    unittest.main()
