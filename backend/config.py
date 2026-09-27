import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

# Load environment variables from backend/.env and project root .env
load_dotenv(BASE_DIR / ".env")
load_dotenv(PROJECT_ROOT / ".env")
load_dotenv()

DATA_DIR = PROJECT_ROOT / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
UPLOADS_DIR = DATA_DIR / "uploads"
EMBEDDED_DB_DIR = DATA_DIR / "embedded_db"
GEOIP_DIR = DATA_DIR / "geoip"

GEOIP_CITY_MMDB = GEOIP_DIR / "GeoLite2-City.mmdb"
GEOIP_ASN_MMDB = GEOIP_DIR / "GeoLite2-ASN.mmdb"

# Database Configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "bitcoin_forensics")
USE_OFFLINE_STORAGE = os.getenv("USE_OFFLINE_STORAGE", "auto").lower()

def get_gemini_api_key() -> str:
    """Hot-reads backend/.env and project root .env directly to pick up real-time key additions."""
    for env_file in [BASE_DIR / ".env", PROJECT_ROOT / ".env"]:
        if env_file.is_file():
            try:
                for line in env_file.read_text(encoding="utf-8").splitlines():
                    line = line.strip()
                    if line.startswith("GEMINI_API_KEY=") and not line.startswith("#"):
                        val = line.split("=", 1)[1].strip().strip('"').strip("'")
                        if val:
                            return val
            except Exception:
                pass
    
    return os.getenv("GEMINI_API_KEY", "").strip()

# AI Intelligence (Google Gemini)
GEMINI_API_KEY = get_gemini_api_key()

# Pipeline & ML Thresholds (NTRO §6)
ANOMALY_CONTAMINATION = float(os.getenv("ANOMALY_CONTAMINATION", "0.15"))
ANOMALY_PERCENTILE_THRESHOLD = float(os.getenv("ANOMALY_PERCENTILE_THRESHOLD", "0.80"))

# Peeling Chain thresholds (§6.4)
PEEL_RATIO_THRESHOLD = float(os.getenv("PEEL_RATIO_THRESHOLD", "0.30"))
MIN_PEEL_CHAIN_LEN = int(os.getenv("MIN_PEEL_CHAIN_LEN", "3"))

# CoinJoin Mixing thresholds (§6.4)
COINJOIN_MIN_INPUTS = int(os.getenv("COINJOIN_MIN_INPUTS", "3"))
COINJOIN_MIN_OUTPUTS = int(os.getenv("COINJOIN_MIN_OUTPUTS", "3"))
COINJOIN_STDDEV_EPSILON = float(os.getenv("COINJOIN_STDDEV_EPSILON", "0.01"))

# Risk Propagation PageRank (§6.5)
PAGERANK_ALPHA = float(os.getenv("PAGERANK_ALPHA", "0.85"))
PAGERANK_MAX_ITER = int(os.getenv("PAGERANK_MAX_ITER", "100"))
RISK_DECAY_FACTOR = float(os.getenv("RISK_DECAY_FACTOR", "0.75"))

# Required schema fields for ingestion validation
REQUIRED_FIELDS = [
    "timestamp",
    "src_ip",
    "dst_ip",
    "txid",
    "input_addresses",
    "output_addresses",
    "input_amounts",
    "output_amounts"
]
