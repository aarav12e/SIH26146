import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.db.mongo_client import db_manager
from backend.graph.builder import graph_builder
from backend.graph.persistence import persist_graph_edges
from backend.features.engineer import feature_engine
from backend.ml.entity_clustering import run_entity_clustering
from backend.ml.anomaly_detection import run_anomaly_detection
from backend.ml.peeling_chain import detect_peeling_chains
from backend.ml.mixing_detection import detect_coinjoin_mixing
from backend.ml.risk_propagation import propagate_risk_scores
from backend.ml.explainability import generate_flag_explanations

logger = logging.getLogger("bitcoin_forensics.api.analyze")
router = APIRouter()

class PipelineResponse(BaseModel):
    status: str
    wallets_count: int
    transactions_count: int
    entity_clusters_count: int
    peeling_chains_count: int
    mixing_transactions_count: int
    flags_count: int
    message: str

@router.post("/analyze/run", response_model=PipelineResponse)
def execute_pipeline():
    """
    Executes the end-to-end analytical pipeline across the 4 official NTRO focus areas:
    1. Graph Construction (NetworkX)
    2. Per-Wallet Feature Engineering
    3. Entity Clustering (Union-Find + Louvain Modularity)
    4. Anomaly Detection (Isolation Forest)
    5. Peeling-Chain & CoinJoin Mixing Detection (Sequential Walk & Transaction Rules)
    6. Risk Scoring (Guilt-by-Association Personalized PageRank)
    7. Explainability Synthesis (Feature-driven reason templating)
    """
    transactions = list(db_manager.transactions.find())
    if not transactions:
        raise HTTPException(
            status_code=400,
            detail="No transactions found in database. Ingest dataset first via /ingest."
        )

    # 1. Graph Construction
    G = graph_builder.build_from_transactions(transactions)
    persist_graph_edges(G)

    # 2. Feature Engineering
    features_dict = feature_engine.compute_all_features(G)

    # 3. Focus Area 1: Entity Clustering
    entity_ids, embedding_neighbors = run_entity_clustering(transactions, G)

    # 4. Focus Area 2: Anomaly Detection
    anomaly_scores = run_anomaly_detection()

    # 5. Focus Area 3: Peeling-Chain & CoinJoin Mixing Detection
    peel_flags_per_tx, wallet_peels = detect_peeling_chains(G)
    mix_flags = detect_coinjoin_mixing(transactions)

    # 6. Focus Area 4: Risk Propagation (PageRank)
    risk_scores = propagate_risk_scores(G, anomaly_scores, wallet_peels)

    # 7. Explainability Layer
    flags = generate_flag_explanations(
        anomaly_scores=anomaly_scores,
        risk_scores=risk_scores,
        wallet_peels=wallet_peels,
        entity_ids=entity_ids,
        features_dict=features_dict
    )

    clusters_count = db_manager.clusters.count_documents({})
    wallets_count = db_manager.wallets.count_documents({})

    return PipelineResponse(
        status="success",
        wallets_count=wallets_count,
        transactions_count=len(transactions),
        entity_clusters_count=clusters_count,
        peeling_chains_count=len(wallet_peels),
        mixing_transactions_count=len(mix_flags),
        flags_count=len(flags),
        message=f"Pipeline converged: flagged {len(flags)} prioritized leads across {clusters_count} entity clusters."
    )
