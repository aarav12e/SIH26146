import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent # points to backend/
ROOT_DIR = BASE_DIR.parent # points to workspace root

# Load .env from backend/.env first, then root .env if present
backend_env = BASE_DIR / ".env"
root_env = ROOT_DIR / ".env"

if backend_env.exists():
    load_dotenv(backend_env)
elif root_env.exists():
    load_dotenv(root_env)
else:
    load_dotenv()

DATA_DIR = BASE_DIR / "app" / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Server Configuration
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))

# Database Configuration
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017")
DB_NAME = os.getenv("DB_NAME", "bitcoin_forensics")
OFFLINE_DB_PATH = Path(os.getenv("OFFLINE_DB_PATH", str(DATA_DIR / "offline_db.json")))

# GeoIP Configuration
GEOIP_ROOT_DIR = ROOT_DIR / "data" / "geoip"
GEOIP_CITY_MMDB = Path(os.getenv("GEOIP_CITY_MMDB", str(GEOIP_ROOT_DIR / "GeoLite2-City.mmdb")))
GEOIP_ASN_MMDB = Path(os.getenv("GEOIP_ASN_MMDB", str(GEOIP_ROOT_DIR / "GeoLite2-ASN.mmdb")))
if not GEOIP_CITY_MMDB.exists() and (DATA_DIR / "GeoLite2-City.mmdb").exists():
    GEOIP_CITY_MMDB = DATA_DIR / "GeoLite2-City.mmdb"
if not GEOIP_ASN_MMDB.exists() and (DATA_DIR / "GeoLite2-ASN.mmdb").exists():
    GEOIP_ASN_MMDB = DATA_DIR / "GeoLite2-ASN.mmdb"

# Anomaly & Risk Thresholds
ANOMALY_CONTAMINATION = float(os.getenv("ANOMALY_CONTAMINATION", "0.15"))
FLAG_SCORE_THRESHOLD = float(os.getenv("FLAG_SCORE_THRESHOLD", "0.60"))
RISK_SCORE_THRESHOLD = float(os.getenv("RISK_SCORE_THRESHOLD", "0.50"))
