import unittest
import numpy as np
from backend.db.mongo_client import db_manager
from backend.graph.builder import graph_builder
from backend.features.engineer import feature_engine
from backend.ml.entity_clustering import run_entity_clustering
from backend.ml.anomaly_detection import run_anomaly_detection
from backend.ml.peeling_chain import detect_peeling_chains
from backend.ml.mixing_detection import detect_coinjoin_mixing
from backend.ml.risk_propagation import propagate_risk_scores
from backend.ml.explainability import generate_flag_explanations

class TestML(unittest.TestCase):
    def test_feature_engineering_sanity(self):
        """Verification Step 5: Verify per-wallet features show variance across wallets, not identical values."""
        txs = list(db_manager.transactions.find())
        G = graph_builder.build_from_transactions(txs)
        feats = feature_engine.compute_all_features(G)

        self.assertGreater(len(feats), 0, "Features should be computed for wallets")
        
        fan_ratios = [f["fan_ratio"] for f in feats.values()]
        velocities = [f["velocity"] for f in feats.values()]

        self.assertGreater(len(set(fan_ratios)), 1, "Fan ratios must vary across distinct wallets")
        self.assertGreater(len(set(velocities)), 1, "Velocities must vary across distinct wallets")

    def test_clustering_and_anomaly_detection(self):
        """Verification Step 6: Verify cluster count is reasonable and anomaly scores show skewed distribution."""
        txs = list(db_manager.transactions.find())
        G = graph_builder.build_from_transactions(txs)
        
        entity_ids, _ = run_entity_clustering(txs, G)
        unique_clusters = set(entity_ids.values())
        
        self.assertGreater(len(unique_clusters), 1, "Should have more than 1 cluster")
        self.assertLess(len(unique_clusters), len(entity_ids), "Clusters should not equal node count")

        feature_engine.compute_all_features(G)
        anomaly_scores = run_anomaly_detection(wallets_filter=list(entity_ids.keys()))
        self.assertEqual(len(anomaly_scores), len(entity_ids))

        scores = list(anomaly_scores.values())
        self.assertGreater(max(scores), min(scores), "Anomaly scores must not be uniform")

    def test_explainable_flags_reasons(self):
        """Verification Step 7: Verify flagged wallets have genuinely distinct, sensible reason strings."""
        txs = list(db_manager.transactions.find())
        G = graph_builder.build_from_transactions(txs)
        feats = feature_engine.compute_all_features(G)
        entity_ids, _ = run_entity_clustering(txs, G)
        anomaly_scores = run_anomaly_detection()
        peel_flags, wallet_peels = detect_peeling_chains(G)
        risk_scores = propagate_risk_scores(G, anomaly_scores, wallet_peels)

        flags = generate_flag_explanations(
            anomaly_scores=anomaly_scores,
            risk_scores=risk_scores,
            wallet_peels=wallet_peels,
            entity_ids=entity_ids,
            features_dict=feats
        )

        self.assertGreater(len(flags), 0, "Should generate prioritized threat leads")

        summaries = [f["summary"] for f in flags[:5]]
        self.assertGreaterEqual(len(set(summaries)), min(3, len(summaries)), "Flags must have diverse, feature-specific reasons")

if __name__ == "__main__":
    unittest.main()
