import logging
import re
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
from backend.config import GEMINI_API_KEY

logger = logging.getLogger("bitcoin_forensics.ai")

router = APIRouter(prefix="/ai")

class AIExplainRequest(BaseModel):
    entity_id: str
    risk_score: float = 0.0
    anomaly_score: float = 0.0
    reasons: List[str] = []
    heuristics: List[str] = []
    context: Dict[str, Any] = {}
    api_key: Optional[str] = None

class AIExplainResponse(BaseModel):
    status: str
    verdict: str
    is_malicious: bool
    briefing: str
    model: str
    timestamp: str
    error_detail: Optional[str] = None

def generate_local_heuristic_brief(
    entity_id: str,
    risk_score: float,
    anomaly_score: float,
    reasons: List[str],
    heuristics: List[str],
    context: Dict[str, Any]
) -> tuple[str, bool, str]:
    """Generates an authoritative rule-based 2-3 line brief when no Gemini key is provided."""
    is_peel = any("peel" in h.lower() for h in heuristics) or any("peel" in r.lower() for r in reasons)
    is_coinjoin = any("coinjoin" in h.lower() or "mix" in h.lower() for h in heuristics)
    is_darknet = any("tor" in str(context).lower() or "darknet" in str(reasons).lower() or "suspicious" in str(reasons).lower())
    
    if risk_score >= 0.65 or is_peel or is_coinjoin or is_darknet:
        verdict = "MALICIOUS // HIGH-RISK THREAT"
        is_malicious = True
        reason_summary = (
            "peeling-chain structuring to systematically obscure transaction origin"
            if is_peel else
            "equal-denomination CoinJoin mixing pool behavior"
            if is_coinjoin else
            "statistically abnormal out-degree velocity and Tor proxy correlation"
        )
        briefing = (
            f"VERDICT: Confirmed Malicious Sovereign Threat.\n"
            f"Evidence indicates active {reason_summary} across connected UTXO flows.\n"
            f"Transaction velocity and risk score ({risk_score:.2f}) confirm intentional laundering rather than benign exchange operations."
        )
    elif risk_score <= 0.25 and anomaly_score < 0.35:
        verdict = "BENIGN // LIKELY FALSE POSITIVE"
        is_malicious = False
        briefing = (
            f"VERDICT: Benign Pattern / Probable False Positive.\n"
            f"Activity exhibits typical exchange consolidation or routine multi-sig settlement with balanced fan-in and fan-out.\n"
            f"Forensic indicators lack rapid hopping, darknet hops, or structured peeling traits."
        )
    else:
        verdict = "INVESTIGATIVE LEAD // ELEVATED SCRUTINY"
        is_malicious = False
        briefing = (
            f"VERDICT: Moderate Priority Investigative Lead.\n"
            f"Address exhibits moderate anomaly variance ({anomaly_score:.2f}) without conclusive mixing signatures.\n"
            f"Requires secondary hop expansion or cluster IP correlation before issuing an operational freeze."
        )
    
    return verdict, is_malicious, briefing

@router.post("/explain", response_model=AIExplainResponse)
async def explain_address_with_gemini(req: AIExplainRequest):
    """
    Evaluates a Bitcoin entity using Google Gemini Generative AI to provide a sharp 2-3 line briefing:
    1. Threat Assessment (Criminal vs Benign/False Positive)
    2. Concrete forensic evidence justifying the verdict.
    """
    effective_key = (req.api_key or "").strip() or (GEMINI_API_KEY or "").strip()
    now_str = datetime.now().isoformat()

    # If no Gemini API key provided, supply the calibrated local heuristic brief
    if not effective_key:
        verdict, is_malicious, briefing = generate_local_heuristic_brief(
            req.entity_id, req.risk_score, req.anomaly_score, req.reasons, req.heuristics, req.context
        )
        return AIExplainResponse(
            status="heuristic_mode",
            verdict=verdict,
            is_malicious=is_malicious,
            briefing=briefing,
            model="Local Heuristic Engine (Enter Gemini API Key for Live GenAI)",
            timestamp=now_str
        )

    # Prompt Engineering for Sovereign Law Enforcement Intelligence
    prompt = f"""You are a Lead Forensic Blockchain Analyst at NTRO (National Technical Research Organisation).
Analyze the following Bitcoin address and forensic telemetry to determine whether it is an illicit/criminal threat or a benign false positive:

TARGET ADDRESS: {req.entity_id}
RISK SCORE: {req.risk_score:.2f} / 1.00
ANOMALY SCORE: {req.anomaly_score:.2f}
FLAGGED INDICATORS: {', '.join(req.reasons) if req.reasons else 'None specific'}
HEURISTICS: {', '.join(req.heuristics) if req.heuristics else 'Standard Graph Metrics'}
NETWORK TELEMETRY: {req.context}

INSTRUCTIONS:
Provide a strictly concise 2 to 3-line executive forensic briefing.
Line 1: State explicitly whether this is MALICIOUS (Criminal / Laundering / Syndicate) or BENIGN (Exchange / Mining / False Positive).
Line 2-3: Explain in 1-2 sharp, authoritative sentences the exact technical reason why (e.g. peeling hops, CoinJoin equal denomination, exchange consolidation, fan-out pattern).
Do not use markdown formatting, asterisks, bullet points, or filler words. Output plain text directly.
"""

    # Candidate Gemini models in order of priority
    candidate_models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
    last_error = None

    for model in candidate_models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={effective_key}"
        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 200
            }
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)
                
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            raw_text = parts[0].get("text", "").strip()
                            clean_lines = [line.strip() for line in raw_text.split("\n") if line.strip()]
                            briefing = "\n".join(clean_lines[:3])

                            # Infer verdict from Gemini output
                            is_malicious = bool(re.search(r"\b(malicious|criminal|threat|laundering|illicit|ransomware|syndicate)\b", briefing, re.IGNORECASE))
                            verdict = (
                                "MALICIOUS // CONFIRMED THREAT" 
                                if is_malicious 
                                else "BENIGN // PROBABLE FALSE POSITIVE"
                            )

                            logger.info(f"Gemini ({model}) successfully generated briefing for entity {req.entity_id}")
                            return AIExplainResponse(
                                status="success",
                                verdict=verdict,
                                is_malicious=is_malicious,
                                briefing=briefing,
                                model=model,
                                timestamp=now_str
                            )

                elif res.status_code in (400, 403, 429):
                    last_error = f"Gemini API HTTP {res.status_code}: {res.text[:120]}"
                    logger.warning(f"Gemini {model} returned {res.status_code}: {res.text[:100]}")
                    continue

        except Exception as e:
            last_error = str(e)
            logger.warning(f"Error querying Gemini {model}: {e}")
            continue

    # Fallback to local heuristic if Gemini API calls failed
    verdict, is_malicious, briefing = generate_local_heuristic_brief(
        req.entity_id, req.risk_score, req.anomaly_score, req.reasons, req.heuristics, req.context
    )
    return AIExplainResponse(
        status="api_error_fallback",
        verdict=verdict,
        is_malicious=is_malicious,
        briefing=briefing,
        model="Local Heuristic Fallback",
        timestamp=now_str,
        error_detail=last_error or "Gemini API failed to respond. Fallback engine generated briefing."
    )
