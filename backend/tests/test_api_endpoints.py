import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))

from starlette.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_api_endpoints():
    print("\n--- Testing Root & Health ---")
    r = client.get("/")
    assert r.status_code == 200
    r = client.get("/health")
    assert r.status_code == 200

    print("--- Testing /api/seed/sample-data ---")
    r = client.post("/api/seed/sample-data?format_type=csv")
    assert r.status_code == 200

    print("--- Testing /api/stats/summary ---")
    r = client.get("/api/stats/summary")
    assert r.status_code == 200
    stats = r.json()
    print("Stats summary:", stats)
    assert stats["transactions_count"] > 0
    assert stats["wallets_count"] > 0
    assert stats["flags_count"] > 0
    assert "peeling_chains_count" in stats

    print("--- Testing /api/flags ---")
    r = client.get("/api/flags?sort_by=risk&limit=10")
    assert r.status_code == 200
    flags_data = r.json()
    assert flags_data["total"] > 0
    top_flag = flags_data["flags"][0]
    print(f"Top Flag: {top_flag.get('flagged_id', top_flag.get('entity_id'))} (Risk: {top_flag.get('risk_score')}, Anomaly: {top_flag.get('anomaly_score')})")

    print("--- Testing /api/flags/{flag_id} ---")
    flag_id = top_flag["_id"]
    r = client.get(f"/api/flags/{flag_id}")
    assert r.status_code == 200
    detail = r.json()
    assert "flag" in detail
    assert "wallet_details" in detail

    print("--- Testing /api/wallets/{wallet_id} ---")
    wallet_id = top_flag.get("flagged_id", top_flag.get("entity_id"))
    r = client.get(f"/api/wallets/{wallet_id}")
    assert r.status_code == 200
    w_info = r.json()
    assert w_info["_id"] == wallet_id
    assert "entity_id" in w_info
    assert "risk_score" in w_info

    print("--- Testing /api/wallets/{wallet_id}/graph ---")
    r = client.get(f"/api/wallets/{wallet_id}/graph?hops=2&max_nodes=30")
    assert r.status_code == 200
    subgraph = r.json()
    assert "nodes" in subgraph
    assert "links" in subgraph

    print("--- Testing /api/clusters ---")
    r = client.get("/api/clusters")
    assert r.status_code == 200
    clusters = r.json()["clusters"]
    assert len(clusters) > 0

    print("--- Testing /api/transactions ---")
    r = client.get("/api/transactions?page=1&limit=5")
    assert r.status_code == 200
    tx_list = r.json()
    assert len(tx_list["transactions"]) > 0
    assert "chain_flag" in tx_list["transactions"][0]

    print("\n>>> ALL API ENDPOINTS VERIFIED AND WORKING PROPERLY! <<<\n")

if __name__ == "__main__":
    test_api_endpoints()
