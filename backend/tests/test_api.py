import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import unittest
from fastapi.testclient import TestClient
from backend.main import app
from backend.config import RAW_DATA_DIR

class TestAPIEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_check(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "healthy")

    def test_ingest_and_pipeline_execution(self):
        """Tests /ingest endpoint and /analyze/run pipeline orchestration."""
        csv_file = RAW_DATA_DIR / "synthetic_bitcoin_traffic.csv"
        with open(csv_file, "rb") as f:
            response = self.client.post("/api/ingest", files={"file": ("synthetic_bitcoin_traffic.csv", f, "text/csv")})

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])

        # Run Analysis Pipeline
        res_run = self.client.post("/api/analyze/run")
        self.assertEqual(res_run.status_code, 200)
        data = res_run.json()
        self.assertEqual(data["status"], "success")
        self.assertGreater(data["flags_count"], 0)
        self.assertGreater(data["entity_clusters_count"], 0)

    def test_query_endpoints(self):
        """Tests all query endpoints: flags, wallets, graph, clusters, stats."""
        # 1. Flags
        res_flags = self.client.get("/api/flags?limit=10")
        self.assertEqual(res_flags.status_code, 200)
        flags_data = res_flags.json()
        self.assertGreater(len(flags_data["flags"]), 0)
        sample_flag = flags_data["flags"][0]
        wid = sample_flag["flagged_id"]

        # 2. Wallet Detail
        res_wallet = self.client.get(f"/api/wallets/{wid}")
        self.assertEqual(res_wallet.status_code, 200)
        self.assertIn("wallet_details", res_wallet.json())

        # 3. Wallet Subgraph
        res_subg = self.client.get(f"/api/wallets/{wid}/graph?hops=2")
        self.assertEqual(res_subg.status_code, 200)
        subg_data = res_subg.json()
        self.assertIn("nodes", subg_data)
        self.assertIn("links", subg_data)

        # 4. Clusters
        res_clusters = self.client.get("/api/clusters")
        self.assertEqual(res_clusters.status_code, 200)
        self.assertGreater(len(res_clusters.json()["clusters"]), 0)

        # 5. Full Graph
        res_full_graph = self.client.get("/api/graph/full?max_nodes=100")
        self.assertEqual(res_full_graph.status_code, 200)
        self.assertGreater(len(res_full_graph.json()["nodes"]), 0)

        # 6. Stats Summary
        res_stats = self.client.get("/api/stats/summary")
        self.assertEqual(res_stats.status_code, 200)
        self.assertGreater(res_stats.json()["transactions_count"], 0)

        # 7. Transactions Ledger
        res_txs = self.client.get("/api/transactions?page=1&limit=10")
        self.assertEqual(res_txs.status_code, 200)
        self.assertGreater(len(res_txs.json()["transactions"]), 0)

if __name__ == "__main__":
    unittest.main()

