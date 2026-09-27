import io
import json
import logging
import xml.etree.ElementTree as ET
from typing import Dict, Any, Optional, List
import pandas as pd

logger = logging.getLogger("bitcoin_forensics.parser")

DEFAULT_FIELD_MAP = {
    "timestamp": ["timestamp", "time", "date", "block_time", "datetime"],
    "src_ip": ["src_ip", "source_ip", "client_ip", "ip_src", "origin_ip"],
    "dst_ip": ["dst_ip", "dest_ip", "destination_ip", "ip_dst", "peer_ip"],
    "src_port": ["src_port", "source_port", "port_src"],
    "dst_port": ["dst_port", "dest_port", "port_dst"],
    "txid": ["txid", "tx_hash", "transaction_hash", "transaction_id", "hash"],
    "input_addresses": ["input_addresses", "inputs", "vin", "senders", "from_addresses"],
    "output_addresses": ["output_addresses", "outputs", "vout", "receivers", "to_addresses"],
    "input_amounts": ["input_amounts", "in_amounts", "vin_values", "sender_amounts"],
    "output_amounts": ["output_amounts", "out_amounts", "vout_values", "receiver_amounts"],
    "geo_country": ["geo_country", "country", "country_name", "src_country"],
    "geo_asn": ["geo_asn", "asn", "src_asn", "autonomous_system"]
}

def parse_list_cell(val: Any) -> List[Any]:
    if isinstance(val, list):
        return val
    if pd.isna(val) or val is None:
        return []
    s = str(val).strip()
    if s.startswith("[") and s.endswith("]"):
        try:
            return json.loads(s.replace("'", '"'))
        except Exception:
            s = s[1:-1]
    if ";" in s:
        return [item.strip() for item in s.split(";") if item.strip()]
    if "," in s:
        return [item.strip() for item in s.split(",") if item.strip()]
    return [s] if s else []

def parse_dataset_file(
    content: str, 
    filename: str, 
    custom_mapping: Optional[Dict[str, str]] = None
) -> pd.DataFrame:
    """
    Parses CSV, JSON, or XML text content into a normalized pandas DataFrame.
    """
    fname = filename.lower()
    df = pd.DataFrame()

    if fname.endswith(".json") or content.strip().startswith("[") or content.strip().startswith("{"):
        try:
            data = json.loads(content)
            if isinstance(data, dict):
                # Check if wrapped in key like 'transactions' or 'data'
                for k in ["transactions", "records", "traffic", "data"]:
                    if k in data and isinstance(data[k], list):
                        data = data[k]
                        break
                else:
                    data = [data]
            df = pd.DataFrame(data)
        except Exception as e:
            logger.error(f"JSON parse error: {e}")
            raise ValueError(f"Invalid JSON content: {e}")

    elif fname.endswith(".xml") or content.strip().startswith("<"):
        try:
            root = ET.fromstring(content)
            records = []
            for child in root:
                rec = {}
                for elem in child:
                    rec[elem.tag] = elem.text
                if rec:
                    records.append(rec)
            df = pd.DataFrame(records)
        except Exception as e:
            logger.error(f"XML parse error: {e}")
            raise ValueError(f"Invalid XML content: {e}")

    else:
        # CSV / Delimited
        try:
            # Detect separator
            sep = ","
            first_line = content.split("\n", 1)[0]
            if "\t" in first_line: sep = "\t"
            elif ";" in first_line: sep = ";"
            elif "|" in first_line: sep = "|"

            df = pd.read_csv(io.StringIO(content), sep=sep)
        except Exception as e:
            logger.error(f"CSV parse error: {e}")
            raise ValueError(f"Invalid CSV content: {e}")

    # Standardize column names
    col_mapping = {}
    lower_cols = {col.lower().strip(): col for col in df.columns}

    # Custom mapping priority
    if custom_mapping:
        for canonical, custom in custom_mapping.items():
            if custom in df.columns:
                col_mapping[custom] = canonical

    # Heuristic mapping for standard names
    for canonical, candidates in DEFAULT_FIELD_MAP.items():
        if canonical in col_mapping.values():
            continue
        for cand in candidates:
            if cand in lower_cols:
                col_mapping[lower_cols[cand]] = canonical
                break

    df = df.rename(columns=col_mapping)

    # Normalize list columns
    for list_col in ["input_addresses", "output_addresses"]:
        if list_col in df.columns:
            df[list_col] = df[list_col].apply(parse_list_cell)
        else:
            df[list_col] = [[] for _ in range(len(df))]

    for amt_col in ["input_amounts", "output_amounts"]:
        if amt_col in df.columns:
            df[amt_col] = df[amt_col].apply(lambda x: [float(v) for v in parse_list_cell(x) if str(v).replace('.', '', 1).isdigit()])
        else:
            df[amt_col] = [[] for _ in range(len(df))]

    return df
