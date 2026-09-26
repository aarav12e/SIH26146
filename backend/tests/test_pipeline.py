import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))

from backend.app.db import db_manager
from backend.app.ingestion import ingestion_service
from backend.app.graph_builder import graph_builder
from backend.app.feature_engine import feature_engine
from backend.app.ml_pipeline import ml_pipeline
from backend.app.explainability import explainability_engine
from backend.app.config import DATA_DIR
from backend.app.data_generator import generate_synthetic_data

def test_full_pipeline_with_four_focus_areas():
    print("\n--- [1] Resetting Database ---")
    db_manager.reset_all()

    print("--- [2] Generating Datasets ---")
    generate_synthetic_data(DATA_DIR)

    csv_file = DATA_DIR / "synthetic_bitcoin_traffic.csv"
    assert csv_file.exists(), "CSV dataset was not generated"

    print("--- [3] Testing Schema-Driven Ingestion ---")
    with open(csv_file, "r", encoding="utf-8") as f:
        csv_content = f.read()

    # Test with schema-driven field mapping
    custom_map = {
        "txid": "txid",
        "input_addresses": "input_addresses",
        "output_addresses": "output_addresses"
    }
    count, msg = ingestion_service.ingest_data(csv_content, "synthetic_bitcoin_traffic.csv", custom_mapping=custom_map)
    assert count > 0, "No transactions ingested"
    assert db_manager.transactions.count_documents({}) == count
    print(f"Ingested {count} transactions with schema-driven field mapping.")

    print("--- [4] Testing Multi-Entity Graph Construction ---")
    G = graph_builder.build_from_transactions()
    assert G.number_of_nodes() > 0, "Graph has no nodes"
    assert G.number_of_edges() > 0, "Graph has no edges"
    print(f"Graph built with {G.number_of_nodes()} nodes and {G.number_of_edges()} edges.")

    print("--- [5] Testing Feature Engineering ---")
    wallet_features = feature_engine.compute_all_features(G)
    assert len(wallet_features) > 0, "No wallet features computed"
    print(f"Features computed for {len(wallet_features)} wallets.")

    print("--- [6] Focus Area 1: Entity Clustering (Union-Find & Node2Vec) ---")
    txs = db_manager.transactions.find()
    entity_ids, embedding_neighbors = ml_pipeline.run_entity_clustering(txs, G)
    assert len(entity_ids) > 0, "Entity IDs empty"
    clusters_count = db_manager.clusters.count_documents({})
    assert clusters_count > 0, "No clusters saved"
    print(f"Union-Find produced {clusters_count} entity clusters. Node2Vec produced soft neighbors.")

    print("--- [7] Focus Area 2: Anomaly Detection (Isolation Forest) ---")
    anomaly_scores = ml_pipeline.run_anomaly_detection()
    assert len(anomaly_scores) > 0, "No anomaly scores produced"
    max_score = max(anomaly_scores.values())
    min_score = min(anomaly_scores.values())
    assert 0.0 <= min_score <= max_score <= 1.0
    print(f"Isolation Forest completed. Min score={min_score}, Max score={max_score}")

    print("--- [8] Focus Area 3: Peeling-Chain & CoinJoin Mixing Detection ---")
    peel_txs, wallet_peels = ml_pipeline.run_peeling_and_mixing_detection(G)
    print(f"Detected {len(peel_txs)} transactions matching peeling-chain walks.")
    sample_tx = db_manager.transactions.find_one({"chain_flag.is_peel": True})
    if sample_tx:
        print(f"Sample Peeling Chain TX: {sample_tx['txid']} (Length: {sample_tx['chain_flag']['chain_length']})")

    print("--- [9] Focus Area 4: Risk Scoring (Guilt Propagation from Seeds) ---")
    risk_attributions = ml_pipeline.run_risk_propagation(G, anomaly_scores, wallet_peels)
    assert len(risk_attributions) > 0, "No risk attributions calculated"
    sample_risk = next(iter(risk_attributions.values()))
    print(f"Risk propagation complete. Sample: Risk Score={sample_risk['risk_score']}, Seed={sample_risk['seed_wallet']}, Hop={sample_risk['hop_distance']}")

    print("--- [10] Explainability Synthesis Layer ---")
    flags = explainability_engine.generate_flags_and_explanations(wallet_peels, risk_attributions)
    assert len(flags) > 0, "No flags generated"
    sample_flag = flags[0]
    print(f"Sample Flag Reason:\n{sample_flag['summary']}")
    assert "reasons" in sample_flag
    assert len(sample_flag["reasons"]) > 0

    print("\n>>> ALL 4 FOCUS AREAS AND PIPELINE TESTS PASSED SUCCESSFULLY! <<<\n")

if __name__ == "__main__":
    test_full_pipeline_with_four_focus_areas()
