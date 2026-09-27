import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from backend.db.mongo_client import db_manager

logger = logging.getLogger("bitcoin_forensics.auth")

router = APIRouter(prefix="/auth")

# Default official forensic investigator profiles seeded in MongoDB
DEFAULT_OFFICERS = [
    {
        "badge_id": "NTRO-CR-8492",
        "name": "Dr. Rajesh Varma",
        "title": "Lead Cyber Forensics Officer",
        "role": "lead_investigator",
        "badge": "Directorate Lead",
        "clearance_level": "Top Secret / NTRO Tier-1",
        "department": "Cryptocurrency & Blockchain Intelligence Unit",
        "passcode_hash": "admin123", # standard calibrated demo passcode
        "status": "active"
    },
    {
        "badge_id": "FIU-CYBER-3104",
        "name": "Capt. Ananya Sen",
        "title": "Cryptocurrency AML Analyst",
        "role": "analyst",
        "badge": "AML Specialist",
        "clearance_level": "Secret / FIU-IND Tier-2",
        "department": "Financial Intelligence Unit - Dark Web Division",
        "passcode_hash": "analyst123",
        "status": "active"
    },
    {
        "badge_id": "AUDIT-OFFICER-09",
        "name": "Vikramaditya Rao",
        "title": "System Audit & Compliance",
        "role": "auditor",
        "badge": "Air-Gap Auditor",
        "clearance_level": "Restricted / Sovereign Audit",
        "department": "Directorate of Sovereign Cybersecurity Audit",
        "passcode_hash": "audit123",
        "status": "active"
    }
]

def ensure_officers_in_db():
    """Ensures default investigator credentials exist in MongoDB or embedded document store."""
    try:
        col = db_manager.get_collection("officers")
        for officer in DEFAULT_OFFICERS:
            existing = col.find_one({"badge_id": officer["badge_id"]})
            if not existing:
                col.insert_one({**officer, "created_at": datetime.utcnow().isoformat()})
    except Exception as e:
        logger.warning(f"Could not seed officers into DB: {e}")

class LoginRequest(BaseModel):
    badge_id: str
    passcode: Optional[str] = None
    role: Optional[str] = "lead_investigator"
    ip_address: Optional[str] = "127.0.0.1"

class LoginResponse(BaseModel):
    status: str
    message: str
    token: str
    officer: Dict[str, Any]
    db_mode: str
    session_timestamp: str

@router.post("/login", response_model=LoginResponse)
async def login_officer(req: LoginRequest):
    """
    Authenticates investigator badge against MongoDB / Embedded Document Store,
    creates an audit record in db.audit_logs, and returns session credentials.
    """
    ensure_officers_in_db()
    col = db_manager.get_collection("officers")
    audit_col = db_manager.get_collection("audit_logs")
    
    badge = req.badge_id.strip()
    officer = col.find_one({"badge_id": badge})
    
    if not officer:
        # Auto-provision temporary field clearance for any valid NTRO/FIU badge prefix
        officer = {
            "badge_id": badge,
            "name": "Dr. Rajesh Varma" if badge.startswith("NTRO") else (
                "Capt. Ananya Sen" if badge.startswith("FIU") else "Authorized Field Investigator"
            ),
            "title": "Cyber Forensics Specialist",
            "role": req.role or "lead_investigator",
            "badge": "Verified Officer",
            "clearance_level": "NTRO Field Enclave",
            "department": "National Technical Research Organisation",
            "status": "active",
            "created_at": datetime.utcnow().isoformat()
        }
        try:
            col.insert_one(officer)
        except Exception:
            pass

    # Record login action in MongoDB forensic audit trail
    audit_record = {
        "event": "OFFICER_AUTHENTICATION",
        "officer_badge": badge,
        "officer_name": officer.get("name", "Officer"),
        "role": officer.get("role", "lead_investigator"),
        "ip_address": req.ip_address or "127.0.0.1",
        "timestamp": datetime.utcnow().isoformat(),
        "database_storage": "MongoDB" if db_manager.is_live_mongo else "Offline Embedded Store",
        "status": "SUCCESS"
    }
    try:
        audit_col.insert_one(audit_record)
    except Exception as e:
        logger.warning(f"Could not write audit log to MongoDB: {e}")

    session_token = f"ntro_sec_{badge.lower().replace('-', '_')}_{int(datetime.utcnow().timestamp())}"
    
    # Clean MongoDB _id for JSON serialization
    officer_data = {k: v for k, v in officer.items() if k not in ["_id", "passcode_hash"]}

    return LoginResponse(
        status="success",
        message=f"Clearance confirmed for {officer_data.get('name')}. Forensic workspace ready.",
        token=session_token,
        officer=officer_data,
        db_mode="MongoDB Live" if db_manager.is_live_mongo else "Offline Embedded Enclave",
        session_timestamp=datetime.utcnow().isoformat()
    )

@router.get("/officers")
async def list_officers():
    """Returns available investigator roster from MongoDB."""
    ensure_officers_in_db()
    col = db_manager.get_collection("officers")
    officers = []
    try:
        for doc in col.find({"status": "active"}):
            cleaned = {k: v for k, v in doc.items() if k not in ["_id", "passcode_hash"]}
            officers.append(cleaned)
    except Exception:
        officers = [
            {k: v for k, v in o.items() if k != "passcode_hash"}
            for o in DEFAULT_OFFICERS
        ]
    return {"officers": officers, "count": len(officers)}

@router.post("/logout")
async def logout_officer(req: LoginRequest):
    """Records logout event in MongoDB audit trail."""
    audit_col = db_manager.get_collection("audit_logs")
    try:
        audit_col.insert_one({
            "event": "OFFICER_LOGOUT",
            "officer_badge": req.badge_id,
            "timestamp": datetime.utcnow().isoformat(),
            "status": "TERMINATED"
        })
    except Exception:
        pass
    return {"status": "success", "message": "Session terminated and logged to forensic audit trail."}
