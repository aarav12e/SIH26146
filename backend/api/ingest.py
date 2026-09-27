import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from backend.config import UPLOADS_DIR, EMBEDDED_DB_DIR
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
    Persists uploaded raw file to data/uploads/, enriches with offline GeoIP,
    and writes clean records to the transactions database collection.
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

    # 1. Physically persist the uploaded raw file into data/uploads/
    try:
        UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        saved_file_path = UPLOADS_DIR / fname
        with open(saved_file_path, "w", encoding="utf-8") as f:
            f.write(content)
        logger.info(f"Physically saved uploaded file to disk at: {saved_file_path}")
    except Exception as e:
        logger.warning(f"Could not persist file to disk {saved_file_path}: {e}")
        saved_file_path = UPLOADS_DIR / fname

    mapping_dict = None
    if field_mappings:
        try:
            mapping_dict = json.loads(field_mappings)
        except Exception:
            pass

    try:
        # 2. Parse into DataFrame
        df = parse_dataset_file(content, fname, custom_mapping=mapping_dict)

        # 3. Validate without silent truncation
        clean_df, report = validate_dataframe(df)
        if clean_df.empty:
            raise HTTPException(status_code=400, detail=f"No valid records found: {report.get('errors')}")

        # 4. Offline GeoIP Enrichment
        records = clean_df.to_dict(orient="records")
        for rec in records:
            src_ip = rec.get("src_ip")
            if src_ip:
                geo = geoip_enricher.resolve(src_ip)
                rec["geo_country"] = geo.get("country", "Unknown")
                rec["geo_asn"] = geo.get("asn", "Unknown")
                rec["geo_city"] = geo.get("city", "Unknown")

            rec["_id"] = str(rec.get("txid") or f"tx_{len(records)}")

        # 5. Write into transactions collection
        db_manager.transactions.delete_many({})
        db_manager.transactions.insert_many(records)

        # 6. Save upload history entry
        upload_record = {
            "upload_id": f"up_{int(datetime.now(timezone.utc).timestamp())}",
            "filename": fname,
            "saved_file_path": str(saved_file_path),
            "database_storage_path": str(EMBEDDED_DB_DIR / "transactions.json"),
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "file_size_bytes": len(content.encode("utf-8")),
            "records_ingested": len(records),
            "status": "active"
        }
        db_manager.uploads.insert_one(upload_record)

        logger.info(f"Ingested {len(records)} transactions from {fname}.")
        return {
            "success": True,
            "filename": fname,
            "saved_file_path": str(saved_file_path),
            "database_storage_path": str(EMBEDDED_DB_DIR / "transactions.json"),
            "records_ingested": len(records),
            "initial_rows": report["initial_rows"],
            "dropped_rows": report["dropped_rows"],
            "uploaded_at": upload_record["uploaded_at"],
            "message": f"Successfully parsed and saved {fname} to data/uploads/ and loaded {len(records)} transactions into database."
        }
    except Exception as e:
        logger.error(f"Ingestion failed: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/ingest/history")
async def get_ingestion_history():
    """Returns list of all previously uploaded and persisted datasets."""
    try:
        history = list(db_manager.uploads.find())
        # Sort newest first
        history.sort(key=lambda x: x.get("uploaded_at", ""), reverse=True)
        active_count = db_manager.transactions.count_documents({})
        return {
            "total_uploads": len(history),
            "active_transactions_in_db": active_count,
            "uploads_directory": str(UPLOADS_DIR),
            "embedded_db_directory": str(EMBEDDED_DB_DIR),
            "history": history
        }
    except Exception as e:
        logger.error(f"Error fetching upload history: {e}")
        return {
            "total_uploads": 0,
            "active_transactions_in_db": 0,
            "uploads_directory": str(UPLOADS_DIR),
            "embedded_db_directory": str(EMBEDDED_DB_DIR),
            "history": []
        }
