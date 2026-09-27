import logging
from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from backend.db.mongo_client import db_manager
from backend.config import RAW_DATA_DIR
from backend.ingestion.parser import parse_dataset_file
from backend.ingestion.validator import validate_dataframe
from backend.ingestion.geoip import geoip_enricher

logger = logging.getLogger("bitcoin_forensics.api.stats")
router = APIRouter()

@router.get("/stats/summary")
def get_stats_summary():
    """Returns high-level statistics summary for the executive overview."""
    txs = list(db_manager.transactions.find())
    wallets = list(db_manager.wallets.find())
    flags = list(db_manager.flags.find())
    clusters = list(db_manager.clusters.find())
    edges_count = db_manager.graph_edges.count_documents({})

    peel_count = sum(1 for t in txs if t.get("chain_flag", {}).get("is_peel"))
    mix_count = sum(1 for t in txs if t.get("mix_flag", {}).get("is_coinjoin_like"))
    high_risk_count = sum(1 for w in wallets if (w.get("risk_score", 0.0) or 0.0) >= 0.60)

    # Country aggregation
    country_counts = {}
    for tx in txs:
        c = tx.get("geo_country") or "Unknown"
        country_counts[c] = country_counts.get(c, 0) + 1

    top_countries = sorted(
        [{"country": k, "count": v} for k, v in country_counts.items()],
        key=lambda x: x["count"],
        reverse=True
    )[:6]

    return {
        "transactions_count": len(txs),
        "wallets_count": len(wallets),
        "flags_count": len(flags),
        "high_severity_flags": high_risk_count,
        "clusters_count": len(clusters),
        "graph_edges_count": edges_count,
        "peeling_chains_count": peel_count,
        "coinjoin_mix_count": mix_count,
        "top_countries": top_countries,
        "is_live_mongo": db_manager.is_live_mongo,
        "is_fallback_mode": not db_manager.is_live_mongo
    }

@router.get("/transactions")
def get_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    search: Optional[str] = Query(None)
):
    """Returns paginated transactions with peeling-chain and mixing flags."""
    txs = list(db_manager.transactions.find())
    if search:
        q = search.lower().strip()
        txs = [
            t for t in txs
            if q in str(t.get("txid", "")).lower()
            or q in str(t.get("src_ip", "")).lower()
            or q in str(t.get("geo_country", "")).lower()
            or any(q in str(addr).lower() for addr in t.get("input_addresses", []))
            or any(q in str(addr).lower() for addr in t.get("output_addresses", []))
        ]

    total = len(txs)
    start = (page - 1) * limit
    paginated = txs[start:start + limit]

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "transactions": paginated
    }

@router.post("/seed/sample-data")
def seed_sample_data(format: str = Query("csv", enum=["csv", "json", "xml"])):
    """Loads calibrated SIH26146 synthetic scenario file from data/raw/."""
    file_map = {
        "csv": RAW_DATA_DIR / "synthetic_bitcoin_traffic.csv",
        "json": RAW_DATA_DIR / "synthetic_bitcoin_traffic.json",
        "xml": RAW_DATA_DIR / "synthetic_bitcoin_traffic.xml"
    }

    target_file = file_map.get(format)
    if not target_file or not target_file.exists():
        raise HTTPException(status_code=404, detail=f"Synthetic dataset {target_file} not found.")

    with open(target_file, "r", encoding="utf-8") as f:
        content = f.read()

    df = parse_dataset_file(content, target_file.name)
    clean_df, report = validate_dataframe(df)

    records = clean_df.to_dict(orient="records")
    for rec in records:
        src_ip = rec.get("src_ip")
        if src_ip:
            geo = geoip_enricher.resolve(src_ip)
            rec["geo_country"] = geo.get("country", "Unknown")
            rec["geo_code"] = geo.get("code", "XX")
            rec["geo_asn"] = geo.get("asn", "Unknown")
            rec["geo_city"] = geo.get("city", "Unknown")
            rec["geo_lat"] = geo.get("latitude", 0.0)
            rec["geo_lng"] = geo.get("longitude", 0.0)

        dst_ip = rec.get("dst_ip")
        if dst_ip:
            dgeo = geoip_enricher.resolve(dst_ip)
            rec["dst_geo_country"] = dgeo.get("country", "Unknown")
            rec["dst_geo_code"] = dgeo.get("code", "XX")
            rec["dst_geo_asn"] = dgeo.get("asn", "Unknown")
            rec["dst_geo_city"] = dgeo.get("city", "Unknown")
            rec["dst_geo_lat"] = dgeo.get("latitude", 0.0)
            rec["dst_geo_lng"] = dgeo.get("longitude", 0.0)
        rec["_id"] = str(rec.get("txid") or f"tx_{len(records)}")

    db_manager.transactions.delete_many({})
    db_manager.transactions.insert_many(records)

    return {
        "status": "success",
        "format": format,
        "records_loaded": len(records),
        "message": f"Loaded {len(records)} transactions from {target_file.name}."
    }

@router.post("/reset")
def reset_database():
    """Resets all collections."""
    db_manager.transactions.delete_many({})
    db_manager.wallets.delete_many({})
    db_manager.flags.delete_many({})
    db_manager.graph_edges.delete_many({})
    db_manager.clusters.delete_many({})
    return {"status": "success", "message": "Database reset successfully."}
