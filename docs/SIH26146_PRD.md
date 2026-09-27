# NTRO / SIH26146 Product Requirements Document (PRD)

## Project Overview
* **Problem Statement ID**: SIH26146
* **Organization**: National Technical Research Organisation (NTRO) / Cybersecurity Directorate
* **Project Title**: Offline Bitcoin Traffic Monitoring & Graph Forensic Link-Analysis Platform
* **Operational Environment**: Air-gapped, strictly offline intelligence environment (Zero live external network access)

---

## 1. Executive Summary & Goals
Law enforcement and national security analysts require a high-throughput, offline-capable forensic system to detect illicit financial workflows operating over the Bitcoin network. The platform correlates raw traffic packet metadata, UTXO transaction ledgers, and IP provenance without querying external public APIs or block explorers.

### Core Objectives
1. **Zero-Trust Offline Operation**: Ingest multi-format datasets (CSV, JSON, XML) and enrich with offline GeoLite2 database without external DNS or internet dependencies.
2. **Deterministic Entity Resolution**: Cluster multi-input addresses using the Common-Input Heuristic (Union-Find) and modularity community detection (Louvain).
3. **Multi-Signal Behavioral Threat Detection**:
   - Sequential peeling-chain detection (smurfing & cash-out ladders).
   - CoinJoin mixer detection (equal output denominations & multi-party transactions).
   - Unsupervised structural outlier detection (Isolation Forest on 11 graph/wallet features).
   - Personalized PageRank risk propagation from high-threat seeds across transaction edges.
4. **Transparent Explainability**: Generate structured, evidence-backed audit sentences for every flag.
5. **Interactive Link-Analysis Dashboard**: Provide forensic investigators with visual force-directed graph exploration, entity drill-down, and filtering.

---

## 2. System Architecture & Component Mapping

```
sih26146-bitcoin-monitor/
├── backend/
│   ├── main.py                 # FastAPI app entrypoint, mounts /api routers & /docs
│   ├── config.py               # Dataset schemas, offline paths, model hyperparameters
│   ├── ingestion/
│   │   ├── parser.py           # Multi-format CSV/JSON/XML parsing to normalized DataFrames
│   │   ├── validator.py        # Strict schema validation & non-truncating checks
│   │   └── geoip.py            # MaxMind GeoLite2 MMDB + offline ASN subnet lookup
│   ├── graph/
│   │   ├── builder.py          # NetworkX tripartite graph (wallet, tx, ip)
│   │   └── persistence.py      # MongoDB / Embedded fallback graph_edges collection
│   ├── features/
│   │   └── engineer.py         # 11 forensic metrics (fan ratio, velocity, centrality, etc.)
│   ├── ml/
│   │   ├── entity_clustering.py# Union-Find Common Input Heuristic + Louvain clustering
│   │   ├── anomaly_detection.py# Isolation Forest (StandardScaler, outlier scoring)
│   │   ├── peeling_chain.py    # DFS sequential change-address path detection
│   │   ├── mixing_detection.py # CoinJoin equal-denomination multi-party detection
│   │   ├── risk_propagation.py # Personalized PageRank from threat seeds
│   │   └── explainability.py   # Rule-templated evidence strings
│   ├── db/
│   │   ├── mongo_client.py     # MongoDB client + embedded JSON document store fallback
│   │   └── models.py           # Pydantic data schemas
│   └── api/                    # Ingest, Wallets, Flags, Clusters, Graph, Analyze, Stats
└── frontend/                   # React 19 + Vite + Tailwind/DaisyUI forensic dashboard
```

---

## 3. Data Specification & Ingestion Requirements

### Mandatory Transaction Ledger Schema
Each ingested record must provide or derive the following fields:
* `timestamp` (ISO 8601 string or numeric epoch)
* `src_ip` (IPv4/IPv6 source relay address)
* `dst_ip` (IPv4/IPv6 destination peer address)
* `src_port`, `dst_port` (TCP ports)
* `txid` (Unique Bitcoin transaction hash)
* `input_addresses` (List of Bitcoin addresses spending inputs)
* `output_addresses` (List of Bitcoin addresses receiving outputs)
* `input_amounts` (List of BTC values per input)
* `output_amounts` (List of BTC values per output)
* `fee` (Transaction mining fee in BTC)
* `script_type` (e.g. `witness_v0_keyhash`, `scripthash`, `pubkeyhash`)

---

## 4. Analytical Pipeline Steps (Phase 2 Milestones)
1. **Dataset Loading**: Ingestion via FastAPI streaming upload, parsing CSV/JSON/XML.
2. **Validation & Storage**: Enforce schema constraints, persist raw and clean records to `transactions`.
3. **GeoIP & ASN Resolution**: Local MaxMind MMDB lookup to map source IPs to Country and ASN without network queries.
4. **Entity Graph Builder**: Construct heterogeneous directed graph $G = (V, E)$ where $V = V_{\text{wallet}} \cup V_{\text{tx}} \cup V_{\text{ip}}$.
5. **Feature Engineering**: Compute 11 distinct metrics per wallet:
   - Fan-in, Fan-out, Fan ratio ($F_{out} / \max(F_{in}, 1)$)
   - Transaction velocity (transactions / hour)
   - Amount mean, amount variance, amount sum
   - Round number frequency (detecting human structuring vs. machine change)
   - IP diversity (distinct IPs broadcasting on behalf of wallet)
   - Degree centrality & Betweenness centrality
6. **Machine Learning & Graph Analytics**:
   - Common-Input Heuristic clustering (UTXO co-spending implies common entity control).
   - Isolation Forest anomaly scoring on normalized feature matrix.
   - Peeling-chain traversal: $1 \to 2$ outputs with one small transfer and one large change repeatedly chained.
   - CoinJoin mixer detection: transactions with $\ge 3$ inputs and $\ge 3$ outputs sharing identical output denominations.
   - Personalized PageRank: Propagate risk scores outward from flagged anomalous nodes.
7. **Explainability Engine**: Compose factual narrative statements detailing exact feature violations and heuristic detections.
8. **Forensic UI Integration**: Interactive table of ranked flags, graph link visualization, drilldown wallet inspection, and cluster overview.

---

## 5. Security & Deployment Requirements
* **Air-gapped verification**: All code must execute without active internet connectivity.
* **Resilience**: Embedded offline storage fallback if live MongoDB is unreachable.
* **Auditability**: Every generated flag references source transaction IDs and empirical statistical values.
