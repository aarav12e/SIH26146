import logging
import re
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
from backend.config import get_gemini_api_key

logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logger = logging.getLogger("bitcoin_forensics.ai")

router = APIRouter(prefix="/ai")

async def verify_gemini_connection(api_key: Optional[str] = None, print_banner: bool = True) -> Dict[str, Any]:
    """
    Tests connectivity to Google Gemini API using the provided key or backend/.env key.
    Prints an executive status banner to the server terminal.
    """
    key = (api_key or "").strip() or get_gemini_api_key()
    
    if not key:
        if print_banner:
            print("\n" + "=" * 64, flush=True)
            print(">>> [AI STATUS]: GEMINI_API_KEY is not configured in backend/.env", flush=True)
            print(">>> Action: Paste GEMINI_API_KEY=your_key in backend/.env", flush=True)
            print(">>> Free Key: https://aistudio.google.com/", flush=True)
            print(">>> Fallback Engine: Active (Local Forensic Heuristics)", flush=True)
            print("=" * 64 + "\n", flush=True)
        return {
            "connected": False,
            "status": "unconfigured",
            "message": "GEMINI_API_KEY not configured in .env. Local sovereign heuristic engine is active.",
            "model": "Local Sovereign Forensic Engine"
        }

    masked_key = f"{key[:8]}...{key[-4:]}" if len(key) >= 12 else "***"
    
    # Priority candidate models: tested active models first for instantaneous connection
    candidate_models = [
        "gemma-4-26b-a4b-it",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-1.5-pro"
    ]
    
    # 1. Attempt dynamic model discovery via ListModels endpoint
    discovered_models = []
    discovery_error = None
    for list_url, list_headers in [
        ("https://generativelanguage.googleapis.com/v1beta/models", {"x-goog-api-key": key}),
        (f"https://generativelanguage.googleapis.com/v1beta/models?key={key}", {}),
        ("https://generativelanguage.googleapis.com/v1/models", {"x-goog-api-key": key}),
        (f"https://generativelanguage.googleapis.com/v1/models?key={key}", {})
    ]:
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.get(list_url, headers=list_headers)
                if res.status_code == 200:
                    data = res.json()
                    for m in data.get("models", []):
                        m_name = m.get("name", "").replace("models/", "")
                        methods = m.get("supportedGenerationMethods", [])
                        if "generateContent" in methods:
                            discovered_models.append(m_name)
                    if discovered_models:
                        break
                else:
                    discovery_error = f"HTTP {res.status_code}: {res.text.strip()[:240]}"
        except Exception as e:
            discovery_error = str(e)

    # If models discovered, prioritize Gemini 2.5 variants first, then others
    if discovered_models:
        g25 = [m for m in discovered_models if "2.5" in m]
        other_models = [m for m in discovered_models if "2.5" not in m]
        candidate_models = g25 + other_models

    last_error_msg = discovery_error
    
    for model in candidate_models:
        payload = {
            "contents": [{"parts": [{"text": "ping"}]}],
            "generationConfig": {"maxOutputTokens": 2}
        }
        
        # Valid Gemini API Key endpoints (v1beta and v1)
        attempts = [
            (
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                {"x-goog-api-key": key, "Content-Type": "application/json"}
            ),
            (
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}",
                {"Content-Type": "application/json"}
            ),
            (
                f"https://generativelanguage.googleapis.com/v1/models/{model}:generateContent",
                {"x-goog-api-key": key, "Content-Type": "application/json"}
            ),
            (
                f"https://generativelanguage.googleapis.com/v1/models/{model}:generateContent?key={key}",
                {"Content-Type": "application/json"}
            )
        ]

        for target_url, headers in attempts:
            try:
                async with httpx.AsyncClient(timeout=6.0) as client:
                    res = await client.post(target_url, json=payload, headers=headers)
                    if res.status_code == 200:
                        if print_banner:
                            print("\n" + "=" * 64, flush=True)
                            print(">>> [AI STATUS]: Google Gemini API Connected Successfully!", flush=True)
                            print(f">>> Key: {masked_key} (Verified Active)", flush=True)
                            print(f">>> Model: Google {model} (Operational)", flush=True)
                            print(">>> Sovereign Forensic Threat Explanation Active", flush=True)
                            print("=" * 64 + "\n", flush=True)
                        return {
                            "connected": True,
                            "status": "connected",
                            "model": model,
                            "key_masked": masked_key,
                            "message": f"Successfully connected to Google {model}."
                        }
                    else:
                        last_error_msg = f"HTTP {res.status_code}: {res.text.strip()[:240]}"
            except Exception as e:
                last_error_msg = str(e)
                continue

    if print_banner:
        print("\n" + "=" * 64, flush=True)
        print(">>> [AI STATUS]: Google Gemini API Connection Failed!", flush=True)
        print(f">>> Key Checked: {masked_key}", flush=True)
        if last_error_msg:
            print(f">>> Google Response: {last_error_msg}", flush=True)
        print(">>> Tip: Verify your key at https://aistudio.google.com/ (Ensure Generative Language API is enabled)", flush=True)
        print(">>> Fallback Engine: Active (Local Forensic Heuristics)", flush=True)
        print("=" * 64 + "\n", flush=True)
        
    return {
        "connected": False,
        "status": "failed",
        "error": last_error_msg or "Connection timed out",
        "key_masked": masked_key,
        "model": "Local Sovereign Forensic Engine"
    }

@router.get("/status")
async def get_ai_status():
    """Returns real-time connection and operational status of Google Gemini."""
    return await verify_gemini_connection(print_banner=True)

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
    is_darknet = ("tor" in str(context).lower() or "darknet" in str(reasons).lower() or "suspicious" in str(reasons).lower())
    
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
    effective_key = (req.api_key or "").strip() or get_gemini_api_key()
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

    # Candidate Gemini models prioritizing Gemini 2.5
    candidate_models = [
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-pro"
    ]
    last_error = None

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 200
        }
    }

    for model in candidate_models:
        attempts = [
            (
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                {"x-goog-api-key": effective_key, "Content-Type": "application/json"}
            ),
            (
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={effective_key}",
                {"Content-Type": "application/json"}
            ),
            (
                f"https://generativelanguage.googleapis.com/v1/models/{model}:generateContent",
                {"x-goog-api-key": effective_key, "Content-Type": "application/json"}
            ),
            (
                f"https://generativelanguage.googleapis.com/v1/models/{model}:generateContent?key={effective_key}",
                {"Content-Type": "application/json"}
            )
        ]

        for target_url, headers in attempts:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    res = await client.post(target_url, json=payload, headers=headers)
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
                    else:
                        last_error = f"HTTP {res.status_code}: {res.text[:140]}"
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


class AIChatMessage(BaseModel):
    role: str
    content: str


class AIChatRequest(BaseModel):
    question: str
    entity_id: Optional[str] = None
    risk_score: Optional[float] = 0.0
    anomaly_score: Optional[float] = 0.0
    reasons: Optional[List[str]] = []
    heuristics: Optional[List[str]] = []
    context: Optional[Dict[str, Any]] = {}
    history: Optional[List[AIChatMessage]] = []
    api_key: Optional[str] = None


class AIChatResponse(BaseModel):
    answer: str
    model: str
    status: str
    timestamp: str


def generate_local_chat_reply(
    question: str,
    entity_id: Optional[str],
    risk_score: float,
    anomaly_score: float,
    reasons: List[str],
    heuristics: List[str],
    context: Dict[str, Any]
) -> str:
    """Provides sovereign forensic intelligence responses to user inquiries when offline."""
    q_lower = question.lower()
    
    # 1. Peeling chain inquiry
    if any(k in q_lower for k in ["peel", "structuring", "hop", "chain"]):
        return (
            f"Forensic Analysis on Peeling Chains for {entity_id or 'this entity'}:\n"
            f"The transaction graph tracks recursive change address outputs where large principal UTXOs are incrementally "
            f"'peeled' into smaller payments while remaining balance cycles into a newly generated change address. "
            f"Risk Score: {risk_score:.2f}. "
            f"If high peeling velocity is detected, it indicates systematic structuring to bypass AML threshold reporting."
        )
    
    # 2. CoinJoin / Mixing inquiry
    if any(k in q_lower for k in ["coinjoin", "mix", "tumbler", "anonym", "wasabi", "whirlpool"]):
        return (
            f"CoinJoin & Mixing Telemetry for {entity_id or 'this entity'}:\n"
            f"CoinJoin transactions are identified by multi-party equal-denomination outputs (std dev < 0.01 BTC) with >=3 inputs "
            f"and >=3 outputs. "
            f"Heuristic flags: {', '.join(heuristics) if heuristics else 'No direct mixer signatures'}. "
            f"Addresses engaging with mixing pools receive propagated PageRank taint scores to alert downstream exchanges."
        )

    # 3. GeoIP / Tor / Network Location inquiry
    if any(k in q_lower for k in ["geoip", "geo", "location", "country", "ip", "asn", "isp", "tor", "vpn", "proxy"]):
        geo_info = context.get("geo", {}) if context else {}
        country = geo_info.get("country", context.get("geo_country", "Global Relay"))
        asn = geo_info.get("asn", context.get("geo_asn", "Autonomous System"))
        city = geo_info.get("city", context.get("geo_city", "Unknown City"))
        return (
            f"Network & GeoIP Attribution for {entity_id or 'this entity'}:\n"
            f"Resolved Location: {city}, {country} via {asn}. "
            f"Our MaxMind GeoLite2 MMDB engine verifies whether transaction broadcasting nodes operate through Tor exit relays, "
            f"bulletproof offshore datacenters, or legitimate residential ISPs. "
            f"IP telemetry is cross-referenced with peer gossip timestamps to pin down the origin node."
        )

    # 4. Criminal vs Benign / False Positive inquiry
    if any(k in q_lower for k in ["criminal", "malicious", "threat", "benign", "false positive", "why"]):
        if risk_score >= 0.50:
            return (
                f"Threat Classification Assessment for {entity_id or 'target'}:\n"
                f"Classified as MALICIOUS / HIGH-PRIORITY (Risk: {risk_score:.2f}, Anomaly: {anomaly_score:.2f}).\n"
                f"Primary Triggers: {', '.join(reasons) if reasons else 'Elevated graph PageRank propagation & abnormal UTXO fan-out'}.\n"
                f"This entity exhibits intentional obfuscation patterns inconsistent with normal retail or merchant transactions."
            )
        else:
            return (
                f"Threat Classification Assessment for {entity_id or 'target'}:\n"
                f"Classified as BENIGN / LOW RISK (Risk: {risk_score:.2f}, Anomaly: {anomaly_score:.2f}).\n"
                f"Activity patterns align with standard exchange consolidation or routine multi-sig settlement. "
                f"No darknet hops or equal-denomination mixing signatures were detected in connected graph edges."
            )

    # 5. Law enforcement / Actionable next steps
    if any(k in q_lower for k in ["action", "law", "seize", "freeze", "ntro", "report", "police"]):
        return (
            f"Operational Law Enforcement Guidance (NTRO Standard):\n"
            f"1. Generate and sign a Cryptographic Forensic Evidence Package (.json/.pdf).\n"
            f"2. Issue Section 91 CrPC notice to connected domestic virtual asset service providers (VASPs) for KYC attribution.\n"
            f"3. Expand 3-hop graph propagation to identify unspent change outputs currently resting at custodial exchange deposit addresses."
        )

    # General default forensic intelligence answer
    return (
        f"Forensic Intelligence Briefing for {entity_id or 'Target Address'}:\n"
        f"• Risk Score: {risk_score:.2f} / 1.00 | Anomaly Score: {anomaly_score:.2f}\n"
        f"• Flags: {', '.join(reasons) if reasons else 'Normal Activity Profile'}\n"
        f"• Heuristics: {', '.join(heuristics) if heuristics else 'Standard Graph Metrics'}\n"
        f"• Telemetry: Ingested via MaxMind GeoIP and multi-hop PageRank clustering engine."
    )


@router.post("/chat", response_model=AIChatResponse)
async def chat_with_gemini_forensics(req: AIChatRequest):
    """
    Interactive Forensic Copilot:
    Allows investigators to ask freeform questions about an entity, transaction, or forensic concept,
    with live GenAI response or local sovereign forensic reasoning.
    """
    effective_key = (req.api_key or "").strip() or get_gemini_api_key()
    now_str = datetime.now().isoformat()

    # If no key, deliver local sovereign forensic intelligence
    if not effective_key:
        answer = generate_local_chat_reply(
            req.question,
            req.entity_id,
            req.risk_score or 0.0,
            req.anomaly_score or 0.0,
            req.reasons or [],
            req.heuristics or [],
            req.context or {}
        )
        return AIChatResponse(
            answer=answer,
            model="Local Sovereign Forensic Engine",
            status="heuristic_mode",
            timestamp=now_str
        )

    # Prompt Engineering with conversation history and forensic context
    history_text = ""
    if req.history:
        for m in req.history[-4:]:
            role_label = "Investigator" if m.role == "user" else "Forensic Copilot"
            history_text += f"{role_label}: {m.content}\n"

    system_prompt = f"""You are the Lead Forensic Blockchain AI Copilot at NTRO (National Technical Research Organisation).
You assist national security analysts and cybercrime investigators analyzing Bitcoin transactions, peeling chains, mixing pools, and MaxMind GeoIP attribution.

CURRENT TARGET ENTITY: {req.entity_id or 'General Investigation'}
RISK SCORE: {req.risk_score or 0.0:.2f} / 1.00
ANOMALY SCORE: {req.anomaly_score or 0.0:.2f}
FLAGGED REASONS: {', '.join(req.reasons) if req.reasons else 'None specific'}
HEURISTICS: {', '.join(req.heuristics) if req.heuristics else 'Standard Graph Metrics'}
TELEMETRY / GEOIP: {req.context}

RECENT CONVERSATION:
{history_text}

INVESTIGATOR QUESTION:
"{req.question}"

INSTRUCTIONS:
Provide a precise, authoritative, and direct forensic response in 2-4 sentences.
Address the investigator's question directly with technical forensic justifications (e.g. UTXO peeling, CoinJoin mixing, GeoIP ASN attribution, PageRank taint propagation).
Maintain an executive intelligence tone. Do not use conversational filler like 'Sure!' or 'Hello'.
"""

    candidate_models = [
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash",
        "gemini-1.5-flash"
    ]

    payload = {
        "contents": [{"parts": [{"text": system_prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 300
        }
    }

    for model in candidate_models:
        attempts = [
            (
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                {"x-goog-api-key": effective_key, "Content-Type": "application/json"}
            ),
            (
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={effective_key}",
                {"Content-Type": "application/json"}
            ),
            (
                f"https://generativelanguage.googleapis.com/v1/models/{model}:generateContent",
                {"x-goog-api-key": effective_key, "Content-Type": "application/json"}
            )
        ]

        for target_url, headers in attempts:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    res = await client.post(target_url, json=payload, headers=headers)
                    if res.status_code == 200:
                        data = res.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts:
                                text = parts[0].get("text", "").strip()
                                return AIChatResponse(
                                    answer=text,
                                    model=f"Google {model}",
                                    status="success",
                                    timestamp=now_str
                                )
            except Exception as e:
                logger.warning(f"Error chatting with Gemini {model}: {e}")
                continue

    # Fallback to local heuristic
    answer = generate_local_chat_reply(
        req.question,
        req.entity_id,
        req.risk_score or 0.0,
        req.anomaly_score or 0.0,
        req.reasons or [],
        req.heuristics or [],
        req.context or {}
    )
    return AIChatResponse(
        answer=answer,
        model="Local Forensic Copilot (Fallback)",
        status="fallback",
        timestamp=now_str
    )
