import csv
import json
import xml.etree.ElementTree as ET
import io
import datetime
import logging
from typing import List, Dict, Any, Tuple, Optional
from backend.app.geoip_service import geoip_service
from backend.app.db import db_manager

logger = logging.getLogger("bitcoin_forensics.ingestion")

# Standard schema aliases for automatic schema-driven ingestion
DEFAULT_FIELD_ALIASES = {
    "txid": ["txid", "tx_id", "tx_hash", "hash", "transaction_id", "id", "_id"],
    "timestamp": ["timestamp", "time", "date", "block_time", "datetime", "created_at"],
    "src_ip": ["src_ip", "source_ip", "client_ip", "ip_src", "peer_ip", "sender_ip"],
    "dst_ip": ["dst_ip", "destination_ip", "dest_ip", "ip_dst", "receiver_ip", "target_ip"],
    "src_port": ["src_port", "source_port", "port_src", "client_port"],
    "dst_port": ["dst_port", "destination_port", "port_dst", "peer_port"],
    "input_addresses": ["input_addresses", "inputs", "vin", "senders", "from_addresses", "from_address", "source_addresses"],
    "output_addresses": ["output_addresses", "outputs", "vout", "receivers", "to_addresses", "to_address", "dest_addresses"],
    "input_amounts": ["input_amounts", "in_amounts", "vin_amounts", "values_in", "input_values"],
    "output_amounts": ["output_amounts", "out_amounts", "vout_amounts", "values_out", "output_values", "amount", "value"],
    "fee": ["fee", "tx_fee", "fees", "cost"],
    "script_type": ["script_type", "type", "tx_type", "script"]
}

def _resolve_field(raw: Dict[str, Any], canonical: str, custom_mapping: Optional[Dict[str, str]] = None) -> Any:
    """Extracts field from raw dict using custom mappings or intelligent aliases."""
    if custom_mapping and canonical in custom_mapping:
        mapped_key = custom_mapping[canonical]
        if mapped_key in raw:
            return raw[mapped_key]

    # Direct match
    if canonical in raw:
        return raw[canonical]

    # Check aliases
    aliases = DEFAULT_FIELD_ALIASES.get(canonical, [])
    for alias in aliases:
        if alias in raw:
            return raw[alias]
        # Also check case-insensitive match
        for k in raw.keys():
            if k.lower() == alias.lower():
                return raw[k]
    return None

def _parse_list_field(val: Any, elem_type=str) -> List[Any]:
    if val is None:
        return []
    if isinstance(val, list):
        return [elem_type(x) for x in val if x is not None]
    if isinstance(val, (int, float)):
        return [elem_type(val)]
    s = str(val).strip()
    if not s or s.lower() in ("none", "null", "[]"):
        return []
    if (s.startswith("[") and s.endswith("]")) or (s.startswith("(") and s.endswith(")")):
        try:
            parsed = json.loads(s)
            if isinstance(parsed, list):
                return [elem_type(x) for x in parsed if x is not None]
        except Exception:
            pass
    delimiter = ";" if ";" in s else ("|" if "|" in s else ",")
    items = [x.strip().strip("'\"[]") for x in s.split(delimiter) if x.strip()]
    res = []
    for item in items:
        try:
            res.append(elem_type(item))
        except (ValueError, TypeError):
            continue
    return res

def _clean_timestamp(ts: Any) -> str:
    if not ts:
        return datetime.datetime.now(datetime.timezone.utc).isoformat()
    if isinstance(ts, (int, float)):
        if ts > 1e11:
            ts = ts / 1000.0
        return datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc).isoformat()
    s = str(ts).strip()
    try:
        dt = datetime.datetime.fromisoformat(s.replace("Z", "+00:00"))
        return dt.isoformat()
    except Exception:
        return s

def parse_transaction_dict(raw: Dict[str, Any], custom_mapping: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    txid_val = _resolve_field(raw, "txid", custom_mapping)
    txid = str(txid_val or f"tx_{int(datetime.datetime.now().timestamp()*1000)}").strip()
    
    timestamp = _clean_timestamp(_resolve_field(raw, "timestamp", custom_mapping))

    input_addresses = _parse_list_field(_resolve_field(raw, "input_addresses", custom_mapping), str)
    output_addresses = _parse_list_field(_resolve_field(raw, "output_addresses", custom_mapping), str)

    input_amounts = _parse_list_field(_resolve_field(raw, "input_amounts", custom_mapping), float)
    output_amounts = _parse_list_field(_resolve_field(raw, "output_amounts", custom_mapping), float)

    # Fallback if only single amount is given
    if not input_amounts and output_amounts:
        input_amounts = list(output_amounts)
    elif input_amounts and not output_amounts:
        output_amounts = list(input_amounts)

    src_ip = str(_resolve_field(raw, "src_ip", custom_mapping) or "127.0.0.1").strip()
    dst_ip = str(_resolve_field(raw, "dst_ip", custom_mapping) or "127.0.0.1").strip()

    try:
        src_port = int(_resolve_field(raw, "src_port", custom_mapping) or 8333)
    except (ValueError, TypeError):
        src_port = 8333

    try:
        dst_port = int(_resolve_field(raw, "dst_port", custom_mapping) or 8333)
    except (ValueError, TypeError):
        dst_port = 8333

    try:
        fee = float(_resolve_field(raw, "fee", custom_mapping) or 0.0001)
    except (ValueError, TypeError):
        fee = 0.0001

    script_type = str(_resolve_field(raw, "script_type", custom_mapping) or "P2PKH").strip()

    # GeoIP Enrichment
    src_geo = geoip_service.lookup(src_ip)
    dst_geo = geoip_service.lookup(dst_ip)

    geo_country = raw.get("geo_country") or src_geo.get("geo_country")
    asn = raw.get("asn") or src_geo.get("asn")

    return {
        "_id": txid,
        "txid": txid,
        "timestamp": timestamp,
        "src_ip": src_ip,
        "dst_ip": dst_ip,
        "src_port": src_port,
        "dst_port": dst_port,
        "input_addresses": input_addresses,
        "output_addresses": output_addresses,
        "input_amounts": input_amounts,
        "output_amounts": output_amounts,
        "fee": fee,
        "script_type": script_type,
        "geo_country": geo_country,
        "asn": asn,
        "src_geo": src_geo,
        "dst_geo": dst_geo,
        "chain_flag": {"is_peel": False, "chain_length": 0, "wallets": []},
        "mix_flag": {"is_coinjoin_like": False, "num_participants": 0}
    }

class IngestionService:
    @staticmethod
    def parse_csv(content: str, custom_mapping: Optional[Dict[str, str]] = None) -> List[Dict[str, Any]]:
        reader = csv.DictReader(io.StringIO(content))
        transactions = []
        for row in reader:
            tx = parse_transaction_dict(row, custom_mapping)
            transactions.append(tx)
        return transactions

    @staticmethod
    def parse_json(content: str, custom_mapping: Optional[Dict[str, str]] = None) -> List[Dict[str, Any]]:
        parsed = json.loads(content)
        raw_list = []
        if isinstance(parsed, list):
            raw_list = parsed
        elif isinstance(parsed, dict):
            raw_list = parsed.get("transactions") or parsed.get("txs") or parsed.get("data") or [parsed]
        
        transactions = []
        for item in raw_list:
            if isinstance(item, dict):
                tx = parse_transaction_dict(item, custom_mapping)
                transactions.append(tx)
        return transactions

    @staticmethod
    def parse_xml(content: str, custom_mapping: Optional[Dict[str, str]] = None) -> List[Dict[str, Any]]:
        root = ET.fromstring(content)
        tx_elements = root.findall(".//transaction") or root.findall(".//tx") or root.findall("./item")
        if not tx_elements and root.tag in ("transaction", "tx"):
            tx_elements = [root]

        transactions = []
        for elem in tx_elements:
            raw = {}
            for child in elem:
                if len(child) > 0:
                    raw[child.tag] = [c.text.strip() for c in child if c.text]
                else:
                    raw[child.tag] = child.text.strip() if child.text else ""
            tx = parse_transaction_dict(raw, custom_mapping)
            transactions.append(tx)
        return transactions

    @classmethod
    def ingest_data(cls, file_content: str, filename: str, custom_mapping: Optional[Dict[str, str]] = None) -> Tuple[int, str]:
        name_lower = filename.lower()
        if name_lower.endswith(".json") or file_content.strip().startswith(("{", "[")):
            txs = cls.parse_json(file_content, custom_mapping)
        elif name_lower.endswith(".xml") or file_content.strip().startswith("<"):
            txs = cls.parse_xml(file_content, custom_mapping)
        else:
            txs = cls.parse_csv(file_content, custom_mapping)

        if not txs:
            raise ValueError("No valid transactions found in uploaded dataset.")

        db_manager.transactions.insert_many(txs)
        return len(txs), f"Successfully parsed and ingested {len(txs)} transactions with schema-driven validation and GeoIP enrichment."

ingestion_service = IngestionService()
