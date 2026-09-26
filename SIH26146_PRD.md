# PRD — AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic
**SIH26146 (Problem Statement 5) · National Technical Research Organisation (NTRO) · Category: Software · Theme: Cryptocurrency**

> Updated against the official NTRO PS document. Dataset Link and Youtube Link are officially listed as **Nil** — no dataset is published by NTRO. Build the ingestion layer schema-driven (configurable field names) so any synthetic dataset (including community-shared ones) can be swapped in without code changes.

---

## 1. Problem Statement (as given)

Bitcoin's pseudonymous, peer-to-peer design lets criminal actors move, layer, and cash out illicit funds — ransomware payments, darknet-market proceeds, extortion, and laundering — while evading traditional financial surveillance.

Build a complete **offline** system that:
- Ingests bulk Bitcoin transaction/network metadata (CSV/JSON/XML)
- Correlates network-layer (IP/port/timing) data with blockchain-layer (wallet/TXID/amount) data
- Applies AI/ML to detect anomalies, cluster entities, and generate prioritized, **explainable** investigative leads
- Presents findings via a dashboard / link-analysis visualization

Dataset: synthetic, modeled on real Bitcoin P2P/transaction fields. Minimum fields: `timestamp, src_ip, dst_ip, src_port, dst_port, txid, input_addresses[], output_addresses[], input_amounts[], output_amounts[], geo_country/asn`.

Deliverables expected by NTRO: working offline prototype (Linux), technical write-up (approach + model choice + explainability method), dashboard/visualization with evidence per flag.

---

## 2. Product Goals

1. Turn raw transaction + network metadata into a queryable entity graph (wallets, transactions, IPs).
2. Flag suspicious wallets/transactions using unsupervised ML (no labeled ground truth available).
3. For every flag, generate a **human-readable reason** with a confidence score — this is the differentiator NTRO is grading on, not raw detection accuracy.
4. Present it all in a dashboard an investigator can actually use: search a wallet → see its graph neighborhood → see why it's flagged.
5. Run fully offline on Linux — no live API calls, no cloud dependency, GeoIP resolved from a local database.

## 3. Non-Goals (for hackathon scope)
- No live blockchain node integration (dataset is pre-supplied, synthetic).
- No real seized/live-intercept data — synthetic only.
- No user auth/multi-tenant system — single-investigator tool is fine for the demo.
- No production-grade scaling — this is a working prototype, not a deployed system.

---

## 4. System Architecture

```
                ┌─────────────────────┐
   CSV/JSON/XML │  Ingestion Service   │  (FastAPI + pandas)
   dataset ───► │  parse + validate    │
                └──────────┬───────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │  GeoIP Enrichment    │  (offline .mmdb, geoip2 lib)
                │  src_ip/dst_ip →     │
                │  country/ASN         │
                └──────────┬───────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │  Graph Builder       │  (NetworkX)
                │  nodes: wallet, ip,  │
                │  transaction         │
                │  edges: sent/recv/   │
                │  originated_from     │
                └──────────┬───────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │  Feature Engine      │
                │  per-wallet metrics  │
                │  (fan-in/out, IP     │
                │  diversity, timing)  │
                └──────────┬───────────┘
                           │
        ┌──────────────────┬──────────────────┬──────────────────┐
        ▼                  ▼                  ▼                  ▼
┌───────────────┐ ┌───────────────┐ ┌──────────────────┐ ┌───────────────┐
│ Entity         │ │ Anomaly        │ │ Peeling-Chain /   │ │ Risk Scoring   │
│ Clustering     │ │ Detection      │ │ Mixing Detection  │ │ (Propagation)  │
│ (Union-Find    │ │ (Isolation     │ │ (sequential graph │ │ (Personalized  │
│  common-input  │ │  Forest on     │ │  walk + CoinJoin  │ │  PageRank from │
│  heuristic +   │ │  features)     │ │  per-tx rule)     │ │  seed wallets) │
│  Node2Vec)     │ │ → anomaly_score│ │ → chain_flag,     │ │ → risk_score   │
│ → entity_id    │ │  per wallet     │ │  mix_flag          │ │  per wallet     │
└───────┬────────┘ └───────┬────────┘ └─────────┬─────────┘ └────────┬───────┘
        └──────────────────┴──────────────────┴──────────────────┘
                                ▼
                     ┌─────────────────────┐
                     │  Explainability      │
                     │  Layer                │
                     │  → templated reason   │
                     │    string per flag     │
                     └──────────┬───────────┘
                                ▼
                     ┌─────────────────────┐
                     │  MongoDB              │
                     │  wallets, transactions,│
                     │  flags, graph_edges    │
                     └──────────┬───────────┘
                                ▼
                     ┌─────────────────────┐
                     │  FastAPI REST API     │
                     └──────────┬───────────┘
                                ▼
                     ┌─────────────────────┐
                     │  React Dashboard      │
                     │  graph view + ranked  │
                     │  table + evidence      │
                     │  panel                 │
                     └─────────────────────┘
```

---

## 5. Data Model

### Input fields (from dataset)
`timestamp, src_ip, dst_ip, src_port, dst_port, txid, input_addresses[], output_addresses[], input_amounts[], output_amounts[], script_type`

### MongoDB Collections

**`wallets`**
```json
{
  "_id": "wallet_address",
  "first_seen": "timestamp",
  "last_seen": "timestamp",
  "total_sent": 0.0,
  "total_received": 0.0,
  "tx_count": 0,
  "associated_ips": ["ip1", "ip2"],
  "associated_asns": ["asn1"],
  "entity_id": "int (Union-Find component)",
  "embedding_neighbors": ["wallet_id", "..."],
  "risk_score": 0.0,
  "features": {
    "fan_in": 0, "fan_out": 0,
    "fan_ratio": 0.0,
    "velocity": 0.0,
    "amount_variance": 0.0,
    "round_number_freq": 0.0,
    "ip_diversity": 0,
    "betweenness_centrality": 0.0,
    "degree_centrality": 0.0
  }
}
```

**`transactions`**
```json
{
  "_id": "txid",
  "timestamp": "ISODate",
  "input_addresses": ["..."],
  "output_addresses": ["..."],
  "input_amounts": [0.0],
  "output_amounts": [0.0],
  "fee": 0.0,
  "script_type": "string",
  "src_ip": "string", "dst_ip": "string",
  "src_port": 0, "dst_port": 0,
  "geo_country": "string", "asn": "string",
  "chain_flag": {"is_peel": false, "chain_length": 0, "wallets": []},
  "mix_flag": {"is_coinjoin_like": false, "num_participants": 0}
}
```

**`flags`**
```json
{
  "_id": "ObjectId",
  "flagged_id": "wallet_address or txid",
  "entity_type": "wallet | transaction",
  "anomaly_score": 0.87,
  "risk_score": 0.62,
  "entity_cluster_id": 14,
  "reasons": [
    "Fan-out ratio 12:1 (top 2% percentile)",
    "Part of entity cluster #14 (6 co-spent addresses)",
    "Matches peeling-chain pattern, length 5",
    "Risk propagated from seed wallet 1F3x... at hop 2"
  ],
  "flagged_at": "ISODate"
}
```

**`graph_edges`**
```json
{ "source": "node_id", "target": "node_id", "type": "sent|received|originated_from", "weight": 0.0, "txid": "string" }
```

---

## 6. ML Pipeline Spec

### 6.1 Feature Engineering (per wallet)
- `fan_in` / `fan_out`: count of distinct input/output addresses across its transactions
- `fan_ratio`: fan_out : fan_in — classic peeling-chain / structuring signal
- `velocity`: transactions per unit time (flag rapid succession = mixer/layering behavior)
- `amount_variance`: statistical variance of amounts sent/received
- `round_number_freq`: fraction of transactions with suspiciously round amounts (structuring)
- `ip_diversity`: count of distinct IPs/ASNs associated with the wallet (evasion behavior)
- `betweenness_centrality`, `degree_centrality`: graph centrality via NetworkX — hub wallets are suspicious

### 6.2 Entity Clustering (official focus area 1)
- **Common-input-ownership heuristic**: for every transaction, all of its input addresses must be co-signed by the same wallet software — they belong to one real-world entity. Implement with a **Union-Find / Disjoint Set Union** structure: `union(addr_a, addr_b)` for every pair of co-occurring input addresses in a transaction. After processing the full dataset, each connected component is one entity cluster (`entity_id`).
- **Graph embeddings extension**: run **Node2Vec** (`node2vec` or `nodevectors` package) over the wallet-transaction graph to produce an embedding vector per wallet. Wallets with high cosine similarity in embedding space but *not* already in the same Union-Find cluster are candidate same-entity wallets that never literally co-spent (e.g. an exchange's rotating hot wallets) — surface these as a secondary, lower-confidence grouping signal, not a merge.
- Output: `entity_id` (hard, from Union-Find) and `embedding_neighbors` (soft, from Node2Vec) per wallet.

### 6.3 Anomaly Detection (official focus area 2)
- Algorithm: **Isolation Forest** (`sklearn.ensemble.IsolationForest`) on the engineered feature vectors from §6.1
- Unsupervised — appropriate since the synthetic dataset has no ground-truth illicit/licit labels
- Output: `anomaly_score` per wallet/transaction (higher = more anomalous)

### 6.4 Peeling-Chain / Mixing Detection (official focus area 3)
- **Peeling chain**: walk the transaction graph following output→input links (an output address that becomes the next transaction's input). Flag a sequence of length ≥ N where, at each hop, one output is small relative to the total ("peel") and the other carries most of the remaining value forward. Implement as a graph traversal (DFS from high-value wallets) with configurable thresholds for peel ratio and minimum chain length.
- **CoinJoin-like mixing**: a per-transaction rule, no graph walk needed — flag any transaction where `num_inputs ≥ k AND num_outputs ≥ k AND stddev(output_amounts) < ε` (many inputs from different entities, many near-identical outputs). Tune `k` and `ε` against your dataset's actual amount distribution.
- Output: `chain_flag` (bool + chain length + wallets involved) and `mix_flag` (bool + participant count) per transaction.

### 6.5 Risk Scoring (official focus area 4)
- This is **guilt-by-association propagation**, not a standalone classifier — it's meant to run *after* §6.2–6.4 and spread their findings across the graph.
- **Seed selection**: seed wallets = top-K wallets already flagged by anomaly detection (§6.3) and/or peeling-chain detection (§6.4). If your dataset happens to ship any labeled-illicit wallets, use those as seeds too.
- **Propagation algorithm**: Personalized PageRank / Random Walk with Restart, seeded at the flagged wallets — `networkx.pagerank(G, personalization={seed_wallets: 1})`. Simpler alternative if you want something easier to explain in your write-up: manual BFS decay — `risk(neighbor) = risk(seed) * decay_factor^hop_distance`, iterated outward a fixed number of hops.
- Output: `risk_score` per wallet — this is what turns isolated flags into a *ranked, graph-aware* investigative lead list, which is explicitly what NTRO's deliverable list asks for ("prioritized, explainable investigative leads").

### 6.6 Explainability Layer
- Rule-driven, not a black box: for each flagged entity, identify which signal(s) from §6.2–6.5 triggered it and template a reason string that names the *specific* pattern, not a generic score.
- Example format: `"Wallet {id} flagged (risk_score {score}): fan-out ratio {x}:1 (top {p}% percentile), part of entity cluster #{e} with {n} co-spent addresses, matches peeling-chain pattern of length {L}, risk propagated from seed wallet {seed} at hop {h}."`
- This templated-reasoning approach is the single most important grading criterion — do not skip it or treat it as an afterthought.

---

## 7. API Endpoints (FastAPI)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/ingest` | Upload and parse a dataset file (CSV/JSON/XML) |
| GET | `/wallets/{wallet_id}` | Wallet details + features + flag status |
| GET | `/wallets/{wallet_id}/graph` | Subgraph (N-hop neighborhood) for visualization |
| GET | `/flags` | Ranked list of flagged entities, sortable by score |
| GET | `/flags/{flag_id}` | Full evidence/reasons for one flag |
| GET | `/clusters/{cluster_id}` | Cluster members + density metrics |
| GET | `/graph/full` | Full graph (paginated/sampled for large datasets) |
| POST | `/analyze/run` | Trigger the ML pipeline (feature engineering → clustering → anomaly detection → explainability) on ingested data |

---

## 8. Dashboard Spec (React)

1. **Upload/Ingest view** — drag-drop CSV/JSON, trigger `/ingest` then `/analyze/run`.
2. **Ranked Flags table** — sortable by anomaly score, filterable by cluster, shows entity ID + top reason + score.
3. **Graph/Link-analysis view** — `react-force-graph` (2D canvas) rendering the wallet-transaction-IP graph, nodes colored by anomaly score, click-to-expand neighborhood.
4. **Evidence panel** — click a flagged node → side panel shows full reasons list, feature values, and cluster context.
5. **Cluster view** — list of detected clusters with density/size, drill into member wallets.

---

## 9. Tech Stack

| Layer | Technology |
|---|---|
| Backend / API | FastAPI |
| Data processing | pandas, NetworkX |
| ML | scikit-learn (Isolation Forest), `node2vec`/`nodevectors` (embeddings), custom Union-Find, `networkx.pagerank` (risk propagation) |
| GeoIP | MaxMind GeoLite2 (offline .mmdb) + `geoip2` Python library |
| Database | MongoDB |
| Frontend | React + `react-force-graph` for graph viz |
| Deployment target | Offline, Linux |

---

## 10. Milestones (build order for the coding agent)

1. **Ingestion** — parse CSV/JSON into `transactions` collection, validate schema, handle missing fields gracefully.
2. **GeoIP enrichment** — integrate GeoLite2 offline lookup into ingestion pipeline.
3. **Graph construction** — build the NetworkX graph from parsed transactions; persist edges to `graph_edges`.
4. **Feature engineering** — compute all per-wallet features listed in §6.1; write to `wallets.features`.
5. **Entity clustering** — run Union-Find common-input heuristic, write `entity_id`; then Node2Vec embeddings for the soft-grouping signal.
6. **Anomaly detection** — run Isolation Forest on feature vectors, write `anomaly_score`.
7. **Peeling-chain / mixing detection** — implement the graph walk and the CoinJoin rule, write `chain_flag`/`mix_flag`.
8. **Risk scoring** — select seeds from steps 6–7's flags, run Personalized PageRank propagation, write `risk_score`.
9. **Explainability** — generate reason strings combining all four signals above; write to `flags`.
10. **API layer** — implement all endpoints in §7.
11. **Dashboard** — build views in §8, wire to API.
12. **Write-up** — one-page technical summary: approach, model choice, explainability method (required NTRO deliverable).

---

## 11. Acceptance Criteria (what "done" looks like for the demo)

- [ ] Can ingest a synthetic dataset without errors (schema-driven, not hardcoded to one file)
- [ ] Graph correctly links wallets ↔ transactions ↔ IPs
- [ ] All 4 official focus areas have a working implementation, not just rules dressed up as ML: entity clustering (Union-Find + Node2Vec), anomaly detection (Isolation Forest), peeling-chain/mixing detection, risk scoring (propagation from seeds)
- [ ] Every flagged entity has a non-generic, feature-driven explanation string that names the specific pattern (not just a score)
- [ ] Dashboard shows both a ranked list and a visual graph, with click-through to evidence
- [ ] Entire pipeline runs offline on Linux, no external API calls at runtime (GeoIP DB is local)
- [ ] One-page technical write-up exists explaining model choice and explainability method
