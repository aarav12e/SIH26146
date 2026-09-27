import logging
from typing import Tuple, Dict, Any, List
import pandas as pd
from backend.config import REQUIRED_FIELDS

logger = logging.getLogger("bitcoin_forensics.validator")

def validate_dataframe(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Validates parsed transaction DataFrame against official schema.
    Verifies no silent truncation: logs and tracks any invalid rows.
    """
    initial_count = len(df)
    validation_report = {
        "initial_rows": initial_count,
        "valid_rows": 0,
        "dropped_rows": 0,
        "missing_fields": [],
        "errors": []
    }

    if df.empty:
        validation_report["errors"].append("Dataset is empty.")
        return df, validation_report

    # Ensure required columns exist
    missing_cols = [col for col in REQUIRED_FIELDS if col not in df.columns]
    if missing_cols:
        validation_report["missing_fields"] = missing_cols
        logger.warning(f"Dataset missing required columns: {missing_cols}")
        for col in missing_cols:
            if "amounts" in col or "addresses" in col:
                df[col] = [[] for _ in range(len(df))]
            else:
                df[col] = None

    # Filter out rows with empty TXID or empty address lists
    valid_mask = pd.Series(True, index=df.index)

    # TXID check
    valid_txid = df["txid"].notna() & (df["txid"].astype(str).str.strip() != "")
    if not valid_txid.all():
        invalid_count = (~valid_txid).sum()
        logger.warning(f"Found {invalid_count} rows with missing or empty txid.")
        validation_report["errors"].append(f"Dropped {invalid_count} rows missing txid.")
        valid_mask &= valid_txid

    # Check that at least one address is present
    has_inputs = df["input_addresses"].apply(lambda x: isinstance(x, list) and len(x) > 0)
    has_outputs = df["output_addresses"].apply(lambda x: isinstance(x, list) and len(x) > 0)
    valid_addrs = has_inputs | has_outputs

    if not valid_addrs.all():
        invalid_addrs_count = (~valid_addrs).sum()
        logger.warning(f"Found {invalid_addrs_count} rows without valid input or output addresses.")
        validation_report["errors"].append(f"Dropped {invalid_addrs_count} rows without input/output addresses.")
        valid_mask &= valid_addrs

    clean_df = df[valid_mask].copy()
    validation_report["valid_rows"] = len(clean_df)
    validation_report["dropped_rows"] = initial_count - len(clean_df)

    # Fill defaults for optional network fields
    if "src_ip" in clean_df.columns:
        clean_df["src_ip"] = clean_df["src_ip"].fillna("127.0.0.1")
    if "dst_ip" in clean_df.columns:
        clean_df["dst_ip"] = clean_df["dst_ip"].fillna("127.0.0.1")

    return clean_df, validation_report
