import logging
import json
from pathlib import Path
from typing import Optional, List, Dict
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from pydantic import BaseModel

from backend.app.db import db_manager
from backend.app.ingestion import ingestion_service
from backend.app.graph_builder import graph_builder
from backend.app.feature_engine import feature_engine
from backend.app.ml_pipeline import ml_pipeline
from backend.app.explainability import explainability_engine
from backend.app.config import DATA_DIR

logger = logging.getLogger("bitcoin_forensics.routes")
router = APIRouter()

class PipelineRunResponse(BaseModel):
    status: str
    wallets_count: int
    transactions_count: int
    entity_clusters_count: int
    peeling_chains_count: int
    flags_count: int
    message: str

@router.post("/ingest")
async def ingest_dataset(
    file: Optional[UploadFile] = File(None),
    raw_content: Optional[str] = Form(None),
    filename: Optional[str] = Form(None),
    field_mappings: Optional[str] = Form(None)
):
    """
    Schema-driven bulk dataset ingestion (CSV/JSON/XML).
    Accepts custom field_mappings JSON so any community or synthetic dataset can be ingested without code changes.
    """
    content = ""
    fname = filename or "dataset.csv"

    if file:
        fname = file.filename
        bytes_data = await file.read()
        content = bytes_data.decode("utf-8", errors="replace")
    elif raw_content:
        content = raw_content
    else:
        raise HTTPException(status_code=400, detail="Provide an uploaded file or raw_content form field.")

    mapping_dict = None
    if field_mappings:
        try:
            mapping_dict = json.loads(field_mappings)
        except Exception:
            pass

    try:
        count, msg = ingestion_service.ingest_data(content, fname, custom_mapping=mapping_dict)
        return {
            "success": True,
            "filename": fname,
            "records_ingested": count,
            "message": msg
        }
    except Exception as e:
        logger.error(f"Ingestion failed: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/analyze/run", response_model=PipelineRunResponse)
def run_analysis_pipeline():
    """
    Triggers the 4 official NTRO focus areas:
    1. Entity Clustering (Union-Find Common Input Heuristic + Node2Vec Embeddings)
    2. Anomaly Detection (Isolation Forest on engineered features)
    3. Peeling-Chain & CoinJoin Mixing Detection (DFS walk & transaction rules)
    4. Guilt-by-Association Risk Scoring (Personalized PageRank from seed wallets)
    Followed by the Explainability Synthesis Layer.
    """
    transactions = db_manager.transactions.find()
    if not transactions:
        raise HTTPException(
            status_code=400,
            detail="No transactions found in database. Ingest data first or use /seed/sample-data."
        )

    # 1. Build Multi-Entity Graph
    G = graph_builder.build_from_transactions(transactions)

    # 2. Feature Engineering (9 behavioral metrics)
    feature_engine.compute_all_features(G)

    # 3. Focus Area 1: Entity Clustering (Union-Find + Node2Vec)
    entity_ids, embedding_neighbors = ml_pipeline.run_entity_clustering(transactions, G)

    # 4. Focus Area 2: Anomaly Detection (Isolation Forest)
    anomaly_scores = ml_pipeline.run_anomaly_detection()

    # 5. Focus Area 3: Peeling-Chain & CoinJoin Mixing Detection
    peel_flags_per_tx, wallet_peels = ml_pipeline.run_peeling_and_mixing_detection(G)

    # 6. Focus Area 4: Risk Scoring (Personalized PageRank & Guilt Propagation)
    risk_attributions = ml_pipeline.run_risk_propagation(G, anomaly_scores, wallet_peels)

    # 7. Explainability Synthesis Layer
    flags = explainability_engine.generate_flags_and_explanations(wallet_peels, risk_attributions)

    wallets_count = db_manager.wallets.count_documents({})
    clusters_count = db_manager.clusters.count_documents({})
    peel_tx_count = len(peel_flags_per_tx)

    return PipelineRunResponse(
        status="completed",
        wallets_count=wallets_count,
        transactions_count=len(transactions),
        entity_clusters_count=clusters_count,
        peeling_chains_count=peel_tx_count,
        flags_count=len(flags),
        message=f"Pipeline executed all 4 focus areas: {wallets_count} wallets, {clusters_count} entity clusters, {peel_tx_count} peeling transactions, and {len(flags)} prioritized leads."
    )

@router.post("/seed/sample-data")
def seed_sample_data(format_type: str = Query("csv", pattern="^(csv|json|xml)$")):
    """Seeds the database with pre-generated multi-pattern synthetic Bitcoin traffic and auto-executes pipeline."""
    sample_file = DATA_DIR / f"synthetic_bitcoin_traffic.{format_type}"
    if not sample_file.exists():
        from backend.app.data_generator import generate_synthetic_data
        generate_synthetic_data(DATA_DIR)

    with open(sample_file, "r", encoding="utf-8") as f:
        content = f.read()

    db_manager.reset_all()
    count, msg = ingestion_service.ingest_data(content, sample_file.name)
    pipeline_res = run_analysis_pipeline()

    return {
        "success": True,
        "seeded_file": sample_file.name,
        "transactions_ingested": count,
        "pipeline_result": pipeline_res
    }

@router.get("/wallets/{wallet_id}")
def get_wallet_detail(wallet_id: str):
    """Retrieves full wallet metadata, calculated features, entity_id, embedding_neighbors, risk_score, and flag status."""
    wallet = db_manager.wallets.find_one({"_id": wallet_id})
    if not wallet:
        tx = db_manager.transactions.find_one({
            "$or": [
                {"input_addresses": wallet_id},
                {"output_addresses": wallet_id}
            ]
        })
        if not tx:
            raise HTTPException(status_code=404, detail="Wallet address not found.")
        return {
            "_id": wallet_id,
            "wallet_address": wallet_id,
            "first_seen": tx.get("timestamp"),
            "last_seen": tx.get("timestamp"),
            "tx_count": 1,
            "entity_id": 1,
            "features": {},
            "risk_score": 0.0,
            "flag": None
        }

    flag = db_manager.flags.find_one({"flagged_id": wallet_id}) or db_manager.flags.find_one({"entity_id": wallet_id})
    wallet["flag"] = flag
    return wallet

@router.get("/wallets/{wallet_id}/graph")
def get_wallet_subgraph(wallet_id: str, hops: int = Query(2, ge=1, le=4), max_nodes: int = Query(60, ge=10, le=200)):
    """Extracts an N-hop neighborhood subgraph centered on a specific wallet for link analysis."""
    subgraph = graph_builder.get_subgraph(wallet_id, hops=hops, max_nodes=max_nodes)
    return subgraph

@router.get("/flags")
def list_flags(
    sort_by: str = Query("risk", pattern="^(risk|anomaly|time)$"),
    cluster_id: Optional[int] = None,
    min_score: float = Query(0.0, ge=0.0, le=1.0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = None
):
    """Returns ranked list of flagged entities, sortable by risk score or anomaly score."""
    query = {}
    if cluster_id is not None and cluster_id >= 0:
        query["$or"] = [{"entity_cluster_id": cluster_id}, {"cluster_id": cluster_id}]
    if min_score > 0:
        query["$or"] = [{"risk_score": {"$gte": min_score}}, {"anomaly_score": {"$gte": min_score}}]

    if sort_by == "risk":
        sort_order = [("risk_score", -1), ("anomaly_score", -1)]
    elif sort_by == "anomaly":
        sort_order = [("anomaly_score", -1)]
    else:
        sort_order = [("flagged_at", -1)]

    flags = db_manager.flags.find(query=query, sort=sort_order)

    if search:
        search_lower = search.lower().strip()
        flags = [
            f for f in flags 
            if search_lower in f.get("flagged_id", f.get("entity_id", "")).lower() 
            or any(search_lower in r.lower() for r in f.get("reasons", []))
        ]

    return {
        "total": len(flags),
        "flags": flags[:limit]
    }

@router.get("/flags/{flag_id}")
def get_flag_evidence(flag_id: str):
    """Returns complete evidentiary dossier and templated reasoning for a flag."""
    flag = db_manager.flags.find_one({"_id": flag_id}) or db_manager.flags.find_one({"flagged_id": flag_id}) or db_manager.flags.find_one({"entity_id": flag_id})
    if not flag:
        raise HTTPException(status_code=404, detail="Flag record not found.")

    wid = flag.get("flagged_id") or flag.get("entity_id")
    wallet = db_manager.wallets.find_one({"_id": wid})
    cluster = db_manager.clusters.find_one({"entity_id": flag.get("entity_cluster_id", flag.get("cluster_id"))})

    return {
        "flag": flag,
        "wallet_details": wallet,
        "cluster_context": cluster
    }

@router.get("/clusters")
def list_clusters():
    """Lists all detected Union-Find entity clusters with member counts and graph density."""
    clusters = db_manager.clusters.find(sort=[("node_count", -1)])
    return {"clusters": clusters}

@router.get("/clusters/{cluster_id}")
def get_cluster_detail(cluster_id: int):
    """Retrieves cluster details, member wallets, and co-spent address connections."""
    cluster = db_manager.clusters.find_one({"$or": [{"entity_id": cluster_id}, {"cluster_id": cluster_id}]})
    if not cluster:
        raise HTTPException(status_code=404, detail=f"Entity Cluster #{cluster_id} not found.")

    member_wallets = db_manager.wallets.find({"$or": [{"entity_id": cluster_id}, {"cluster_id": cluster_id}]})
    member_flags = db_manager.flags.find({"$or": [{"entity_cluster_id": cluster_id}, {"cluster_id": cluster_id}]})

    return {
        "cluster": cluster,
        "members": member_wallets,
        "flags_in_cluster": member_flags
    }

@router.get("/graph/full")
def get_full_graph(max_nodes: int = Query(250, ge=10, le=500)):
    """Returns full multi-entity graph sampled/formatted for 2D link analysis visualization."""
    return graph_builder.get_full_graph_data(max_nodes=max_nodes)

@router.get("/transactions")
def list_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    search: Optional[str] = None
):
    """Lists transactions with chain_flag and mix_flag metadata."""
    query = {}
    if search:
        s = search.strip()
        query["$or"] = [
            {"txid": s},
            {"input_addresses": s},
            {"output_addresses": s},
            {"src_ip": s},
            {"dst_ip": s},
            {"geo_country": s}
        ]

    skip = (page - 1) * limit
    total = db_manager.transactions.count_documents(query)
    txs = db_manager.transactions.find(query=query, sort=[("timestamp", -1)], skip=skip, limit=limit)

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "transactions": txs
    }

@router.get("/transactions/{txid}")
def get_transaction(txid: str):
    """Retrieves single transaction with peeling and mixing flags."""
    tx = db_manager.transactions.find_one({"_id": txid})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    return tx

@router.get("/stats/summary")
def get_stats_summary():
    """Returns executive dashboard statistics covering all 4 focus areas."""
    tx_count = db_manager.transactions.count_documents({})
    wallet_count = db_manager.wallets.count_documents({})
    flag_count = db_manager.flags.count_documents({})
    cluster_count = db_manager.clusters.count_documents({})
    edge_count = db_manager.graph_edges.count_documents({})

    peel_tx_count = db_manager.transactions.count_documents({"chain_flag.is_peel": True})
    mix_tx_count = db_manager.transactions.count_documents({"mix_flag.is_coinjoin_like": True})
    high_risk_count = db_manager.wallets.count_documents({"risk_score": {"$gte": 0.60}})

    txs = db_manager.transactions.find()
    country_counts = {}
    for tx in txs:
        c = tx.get("geo_country", "Unknown")
        country_counts[c] = country_counts.get(c, 0) + 1

    top_countries = sorted(country_counts.items(), key=lambda x: x[1], reverse=True)[:6]

    return {
        "transactions_count": tx_count,
        "wallets_count": wallet_count,
        "flags_count": flag_count,
        "high_severity_flags": high_risk_count,
        "clusters_count": cluster_count,
        "graph_edges_count": edge_count,
        "peeling_chains_count": peel_tx_count,
        "coinjoin_mix_count": mix_tx_count,
        "top_countries": [{"country": c, "count": cnt} for c, cnt in top_countries],
        "is_live_mongo": db_manager.is_live_mongo
    }

@router.post("/reset")
def reset_database():
    """Resets all collections."""
    db_manager.reset_all()
    return {"status": "success", "message": "Database cleared."}
