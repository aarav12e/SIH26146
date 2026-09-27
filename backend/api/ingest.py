import json
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from backend.ingestion.parser import parse_dataset_file
from backend.ingestion.validator import validate_dataframe
from backend.ingestion.geoip import geoip_enricher
from backend.db.mongo_client import db_manager

logger = logging.getLogger("bitcoin_forensics.api.ingest")
router = APIRouter()

@router.post("/ingest")
async def ingest_dataset(
    file: Optional[UploadFile] = File(None),
    raw_content: Optional[str] = Form(None),
    filename: Optional[str] = Form(None),
    field_mappings: Optional[str] = Form(None)
):
    """
    Schema-driven bulk dataset ingestion endpoint (CSV/JSON/XML).
    Validates required fields, enriches with offline GeoIP, and writes to transactions collection.
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
        # 1. Parse into DataFrame
        df = parse_dataset_file(content, fname, custom_mapping=mapping_dict)

        # 2. Validate without silent truncation
        clean_df, report = validate_dataframe(df)
        if clean_df.empty:
            raise HTTPException(status_code=400, detail=f"No valid records found: {report.get('errors')}")

        # 3. Offline GeoIP Enrichment
        records = clean_df.to_dict(orient="records")
        for rec in records:
            src_ip = rec.get("src_ip")
            if src_ip:
                geo = geoip_enricher.resolve(src_ip)
                rec["geo_country"] = geo.get("country", "Unknown")
                rec["geo_asn"] = geo.get("asn", "Unknown")
                rec["geo_city"] = geo.get("city", "Unknown")

            rec["_id"] = str(rec.get("txid") or f"tx_{len(records)}")

        # 4. Write into MongoDB transactions collection
        db_manager.transactions.delete_many({})
        db_manager.transactions.insert_many(records)

        logger.info(f"Ingested {len(records)} transactions from {fname}.")
        return {
            "success": True,
            "filename": fname,
            "records_ingested": len(records),
            "initial_rows": report["initial_rows"],
            "dropped_rows": report["dropped_rows"],
            "message": f"Successfully parsed and ingested {len(records)} transactions into MongoDB."
        }
    except Exception as e:
        logger.error(f"Ingestion failed: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
