# AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic
**SIH26146 · National Technical Research Organisation (NTRO)**  
**Theme: Blockchain & Cybersecurity**

An end-to-end offline cyber-forensics platform that correlates network-layer traffic with blockchain transactions, builds property entity graphs, runs unsupervised machine learning (Louvain Community Detection + Isolation Forest), and generates explainable investigative lead dossiers.

---

## Key Features

1. **Multi-Format Ingestion**: Ingests bulk Bitcoin transaction traffic in **CSV, JSON, and XML** formats.
2. **Offline GeoIP & ASN Enrichment**: Locally resolves IP addresses to countries, coordinates, and Autonomous System Numbers without external API calls.
3. **Multi-Entity Graph Construction**: NetworkX directed property graph connecting Wallets, Transactions (TXIDs), and P2P Relay IPs.
4. **Per-Wallet Feature Engineering**:
   - Fan-In, Fan-Out, Fan-Ratio (Peeling Chain detection)
   - Transaction Velocity (Mixer & layering detection)
   - Amount Variance & Round Number Frequency (Structuring / Smurfing detection)
   - IP / ASN Diversity (Proxy / Tor hopping detection)
   - Graph Betweenness Centrality & Degree Centrality (Intermediary hubs)
5. **Unsupervised ML Engine**:
   - **Louvain Community Detection**: Discovers transaction rings and computes cluster density ratios vs baseline.
   - **Isolation Forest**: Identifies outlier behavioral vectors and outputs calibrated anomaly scores.
6. **Explainability Layer (NTRO Core Deliverable)**: Formulates natural language evidence statements with exact empirical percentile attribution.
7. **Interactive Dashboard**:
   - Prioritized Threat Leads Table (sortable, filterable)
   - 2D Canvas Force-Directed Link Graph Analysis (expandable hops, node search)
   - Evidence Dossier Drawer (anomaly meters, feature percentiles, GeoIP routing)
   - Louvain Community Inspector & Raw Transactions Forensics Ledger.

---

## Quick Start (Offline on Linux / macOS)

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.12)
- Node.js 18+ and npm

### 2. Setup Virtual Environment & Install Dependencies
From the project root directory:
```bash
# Backend setup (from project root)
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Or if you are inside the backend/ folder:
# pip install -r requirements.txt

# Frontend setup
cd frontend
npm install
cd ..
```

### 3. Launch Platform
You can run the provided automated script:
```bash
chmod +x run_all.sh
./run_all.sh
```

Or start the services in two separate terminals:
- **Terminal 1 (Backend API):**
  ```bash
  source venv/bin/activate
  python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
  ```
- **Terminal 2 (Frontend Dashboard):**
  ```bash
  cd frontend
  npm run dev
  ```

Open your browser at **`http://localhost:5173`**.

---

## Verification & Automated Test Suite

To verify the ingestion, GeoIP, Graph builder, Louvain clustering, Isolation Forest, and Explainability reasoning in one command:
```bash
source venv/bin/activate
python backend/tests/test_pipeline.py
python backend/tests/test_api_endpoints.py
```

---

## Deliverables Checklist (PRD Section 11)

- [x] Ingest synthetic datasets (CSV, JSON, XML) without errors
- [x] Graph links Wallets ↔ Transactions ↔ Relay IPs
- [x] Isolation Forest unsupervised ML model produces calibrated anomaly scores
- [x] Every flagged entity has a non-generic, feature-driven explanation string
- [x] Visual graph analysis with click-through to evidence dossier
- [x] Entire pipeline runs 100% offline (local GeoIP and embedded document store)
- [x] One-page technical write-up (`TECHNICAL_WRITEUP.md`)
