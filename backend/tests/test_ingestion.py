import unittest
from pathlib import Path
import pandas as pd
from backend.config import RAW_DATA_DIR
from backend.ingestion.parser import parse_dataset_file
from backend.ingestion.validator import validate_dataframe
from backend.ingestion.geoip import geoip_enricher
from backend.db.mongo_client import db_manager

class TestIngestion(unittest.TestCase):
    def test_dataset_loading_and_shape(self):
        """Verification Step 1: Verify dataframe loads with all expected fields and no silent truncation."""
        csv_path = RAW_DATA_DIR / "synthetic_bitcoin_traffic.csv"
        self.assertTrue(csv_path.exists(), f"Synthetic dataset not found at {csv_path}")

        with open(csv_path, "r", encoding="utf-8") as f:
            content = f.read()

        df = parse_dataset_file(content, csv_path.name)
        self.assertFalse(df.empty, "DataFrame should not be empty")
        
        expected = ["timestamp", "src_ip", "dst_ip", "txid", "input_addresses", "output_addresses", "input_amounts", "output_amounts"]
        for col in expected:
            self.assertIn(col, df.columns, f"Missing expected column: {col}")

        self.assertGreater(len(df), 0, "Row count must be greater than zero")

    def test_ingestion_and_validation(self):
        """Verification Step 2: Verify validation checks and MongoDB transactions count matches."""
        csv_path = RAW_DATA_DIR / "synthetic_bitcoin_traffic.csv"
        with open(csv_path, "r", encoding="utf-8") as f:
            content = f.read()

        df = parse_dataset_file(content, csv_path.name)
        clean_df, report = validate_dataframe(df)

        self.assertEqual(report["valid_rows"], len(clean_df))
        self.assertEqual(report["dropped_rows"], 0, "Synthetic dataset should have 0 invalid rows")

        records = clean_df.to_dict(orient="records")
        for r in records:
            r["_id"] = str(r["txid"])

        db_manager.transactions.delete_many({})
        db_manager.transactions.insert_many(records)

        count = db_manager.transactions.count_documents({})
        self.assertEqual(count, len(clean_df), f"Expected {len(clean_df)} records in db, found {count}")

    def test_offline_geoip_enrichment(self):
        """Verification Step 3: Test known public IP (8.8.8.8) resolves to United States and ASN without live network calls."""
        google_geo = geoip_enricher.resolve("8.8.8.8")
        self.assertEqual(google_geo["country"], "United States")
        self.assertTrue("15169" in google_geo["asn"] or "Google" in google_geo["asn"])

        cf_geo = geoip_enricher.resolve("1.1.1.1")
        self.assertEqual(cf_geo["country"], "United States")

        tor_geo = geoip_enricher.resolve("185.220.101.5")
        self.assertTrue(tor_geo["country"] in ["Seychelles", "Germany"] or "Tor" in tor_geo["asn"] or "Erneuerbare" in tor_geo["asn"])

        in_geo = geoip_enricher.resolve("103.251.167.12")
        self.assertTrue(in_geo["country"] in ["India", "The Netherlands", "Netherlands"])

if __name__ == "__main__":
    unittest.main()
