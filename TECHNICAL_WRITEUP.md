# Technical Write-Up: AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic
**SIH26146 (Problem Statement 5) · National Technical Research Organisation (NTRO)**  
**Category: Software · Theme: Cryptocurrency**

---

## 1. Executive Summary & Architecture

Bitcoin's pseudonymous peer-to-peer design allows illicit syndicates to structure, layer, and cash out funds from ransomware payments, darknet markets, extortion, and cybercrime while evading traditional financial surveillance. Because no official dataset or labeled ground truth is published, real-world forensic tools must be **schema-driven** (supporting arbitrary column names) and implement **unsupervised, graph-aware machine learning**.

This solution delivers an end-to-end, 100% offline intelligence platform built around the **four official NTRO focus areas**:
1. **Entity Clustering:** Common-input-ownership heuristic (Union-Find / DSU) augmented with Node2Vec structural embeddings for soft grouping.
2. **Anomaly Detection:** Unsupervised Isolation Forest on 9 behavioral and graph topological feature vectors.
3. **Peeling-Chain & CoinJoin Mixing Detection:** Sequential graph traversal (DFS) for peeling chains and statistical distribution rules for CoinJoin mixes.
4. **Risk Scoring / Guilt-by-Association Propagation:** Personalized PageRank seeded at detected threat entities to prioritize leads across the entire transaction graph.
5. **Explainability Layer:** Natural language reasoning templates attributing specific patterns and empirical percentiles (NTRO core evaluation criterion).

```
   Arbitrary CSV/JSON/XML
     (Schema-Driven)
           │
           ▼
  ┌──────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐
  │ Schema Ingestion │ ───► │   Offline GeoIP / ASN   │ ───► │  Directed Multi-Entity  │
  │  & Normalization │      │   Resolution Service    │      │  Graph (Wallets/TXs/IPs)│
  └──────────────────┘      └─────────────────────────┘      └────────────┬────────────┘
                                                                          │
                                                                          ▼
  ┌────────────────────────────────────────────────────────────────────────────────────┐
  │ 9 Behavioral & Graph Topological Metrics (Fan-Ratio, Velocity, Round Amounts, etc.)│
  └───────────────────────────────────────┬────────────────────────────────────────────┘
                                          │
        ┌──────────────────┬──────────────┴───┬──────────────────┐
        ▼                  ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌──────────────────┐ ┌───────────────┐
│ Focus Area 1  │  │ Focus Area 2  │  │ Focus Area 3     │ │ Focus Area 4  │
│ Entity Cluster│  │ Anomaly       │  │ Peeling Chain &  │ │ Risk Scoring  │
│ (Union-Find + │  │ Detection     │  │ CoinJoin Mixing  │ │ (Personalized │
│  Node2Vec)    │  │ (iForest)     │  │ (DFS Walk & Rule)│ │  PageRank)    │
│ → entity_id   │  │ → anomaly_sc  │  │ → chain/mix_flag │ │ → risk_score  │
└───────┬───────┘  └───────┬───────┘  └─────────┬────────┘ └───────┬───────┘
        └──────────────────┴──────────────────┴──────────────────┘
                                          ▼
                      ┌───────────────────────────────────────┐
                      │    NTRO Explainability Engine         │
                      │  Evidence-Backed Reasoning Dossier    │
                      └───────────────────┬───────────────────┘
                                          ▼
                      ┌───────────────────────────────────────┐
                      │  Interactive Link Analysis Dashboard  │
                      │  (Graph View, Dossier, Entity Matrix) │
                      └───────────────────────────────────────┘
```

---

## 2. Focus Area 1: Entity Clustering (Union-Find & Node2Vec)

### 2.1 Common-Input-Ownership Heuristic (Hard Clustering)
- **Principle:** In Bitcoin's UTXO model, spending multiple inputs within a single transaction requires private keys for all corresponding addresses to be accessible to the wallet software simultaneously. Consequently, all co-occurring input addresses within a transaction belong to the same real-world entity.
- **Algorithm:** Implemented with a high-performance **Disjoint Set Union (DSU / Union-Find)** structure with path compression and union-by-rank:
  $$\text{union}(addr_a, addr_b) \quad \forall \; addr_a, addr_b \in \text{Inputs}(TX)$$
- **Output:** Every connected component represents a single entity cluster assigned a persistent `entity_id`.

### 2.2 Node2Vec Structural Embeddings (Soft Clustering Extension)
- **Problem:** Rotating hot wallets (e.g. centralized exchanges or sophisticated laundering rings) intentionally avoid literal co-spending to evade common-input clustering.
- **Solution:** We run **Node2Vec** random-walk graph representation learning over the bipartite wallet-transaction graph. For each wallet $w$, a 16-dimensional embedding vector $\mathbf{z}_w \in \mathbb{R}^{16}$ is learned from second-order random walks.
- **Soft Grouping:** Wallets with cosine similarity $\cos(\mathbf{z}_{w1}, \mathbf{z}_{w2}) \ge 0.82$ that belong to *different* Union-Find components are surfaced as `embedding_neighbors`. This captures behavioral affinity without falsely merging distinct on-chain clusters.

---

## 3. Focus Area 2: Anomaly Detection (Isolation Forest)

### 3.1 Feature Engineering Matrix
Criminal crypto movement exhibits distinct signatures across 9 behavioral metrics:

| Metric | Formula | Cyber-Forensics Rationale |
|---|---|---|
| **Fan-In ($F_{in}$)** | $|\{ \text{input counterparties} \}|$ | Identifies aggregation / consolidation sinks |
| **Fan-Out ($F_{out}$)** | $|\{ \text{output counterparties} \}|$ | Identifies dispersal / distribution hubs |
| **Fan-Ratio ($F_{ratio}$)** | $F_{out} / \max(F_{in}, 1)$ | Peeling chains & rapid dispersal |
| **Velocity ($V$)** | $N_{tx} / \Delta t_{\text{hours}}$ | Automated mixing bots & rapid layering |
| **Amount Variance ($\sigma^2$)** | $\text{Var}(\text{amounts})$ | Rigid or structured amount distributions |
| **Round Freq ($R_f$)** | $\sum \mathbb{I}(\text{is\_round}) / N$ | **Structuring / Smurfing** to avoid threshold triggers |
| **IP Diversity ($D_{ip}$)** | $|\text{IPs}| + |\text{ASNs}|$ | Tor exit hopping & bulletproof proxy evasion |
| **Betweenness ($C_b$)** | $\sum_{s \neq v \neq t} \frac{\sigma_{st}(v)}{\sigma_{st}}$ | Intermediary laundering bridges & gateways |
| **Degree ($C_d$)** | $\text{deg}(v) / (|V| - 1)$ | Central escrow pools & mixing hubs |

### 3.2 Model Formulation
- **Algorithm:** Scikit-learn `IsolationForest(contamination=0.15, n_estimators=100)` fitted on feature vectors normalized with `RobustScaler`.
- **Score Calibration:** Decision function path lengths are inverted and calibrated to $[0.0, 1.0]$, where $1.0$ represents maximum outlier anomaly.

---

## 4. Focus Area 3: Peeling-Chain & CoinJoin Mixing Detection

### 4.1 Peeling Chain Detection (Sequential DFS Graph Walk)
- **Heuristic:** Criminals peeling off funds from ransomware or darknet hauls repeatedly create 2-output transactions: one small payment ("the peel") and one large output sent to a fresh change address, which immediately becomes the input to the next peel.
- **Implementation:** A directed graph walk (DFS) following output $\to$ input links. A sequence of length $L \ge 3$ is flagged where at each hop:
  $$0.60 \le \frac{\text{Amount}(\text{change})}{\text{Amount}(\text{total\_out})} \le 0.99$$
- **Output:** Writes `chain_flag: {"is_peel": True, "chain_length": L, "wallets": [...]}` to `transactions` and tags member wallets.

### 4.2 CoinJoin Mixing Detection
- **Heuristic:** Non-custodial privacy mixers (Wasabi, Whirlpool) aggregate $k$ distinct participants and issue identical denomination outputs.
- **Rule:** A transaction is flagged as CoinJoin mixing if:
  $$\text{num\_inputs} \ge 3 \quad \land \quad \text{num\_outputs} \ge 3 \quad \land \quad \frac{\text{stddev}(\text{output\_amounts})}{\text{mean}(\text{output\_amounts})} \le 0.15$$
- **Output:** Writes `mix_flag: {"is_coinjoin_like": True, "num_participants": k}`.

---

## 5. Focus Area 4: Risk Scoring (Personalized PageRank Guilt Propagation)

### 5.1 Guilt-by-Association Rationale
Detecting isolated bad transactions is insufficient; criminal funds contaminate downstream and upstream counterparty wallets. Rather than a static score, risk is **propagated through the graph topology**.

### 5.2 Algorithm & Seed Selection
1. **Seed Selection:** Top-K wallets already flagged by Isolation Forest ($\text{anomaly\_score} \ge 0.70$) and peeling-chain originators are chosen as teleportation seeds:
   $$\mathbf{p}(v) = \frac{\text{score}(v) + \mathbb{I}(\text{is\_peel}) \cdot 0.3}{\sum \mathbf{p}}$$
2. **Personalized PageRank (Random Walk with Restart):**
   $$\mathbf{r} = (1 - \alpha) \mathbf{P}^T \mathbf{r} + \alpha \mathbf{p}$$
   where damping factor $\alpha = 0.85$.
3. **Attribution BFS:** A backward traversal determines the exact `seed_wallet` and `hop_distance` responsible for contaminating each downstream node.
4. **Output:** Normalized `risk_score` $[0.0, 1.0]$ per wallet, turning disconnected flags into a graph-aware prioritized lead list.

---

## 6. Explainability Layer (NTRO Core Evaluation Criterion)

Per NTRO PRD §6.6, black-box scores are rejected. The explainability layer synthesizes all 4 focus areas into an executive natural language statement:

### Formal Reason Synthesis Template
```
"Wallet {id} flagged (risk_score {score}): 
 fan-out ratio {x}:1 (top {p}% percentile), 
 part of entity cluster #{e} ({n} co-spent addresses), 
 matches peeling-chain pattern of length {L}, 
 risk propagated from seed wallet {seed} at hop {h}."
```

### Empirical Production Output
> *"Wallet `bc1q_peel_chg_000` flagged (risk_score 1.00): Part of entity cluster #27; Node2Vec structural embedding neighbor to 4 un-joined wallets (bc1q_pee...); Matches peeling-chain pattern, length 8; Primary seed originator for graph risk propagation; 2 associated IPs across 1 ASNs (proxy evasion behavior); Rapid transaction velocity (20.0 tx/hr, top 2% percentile)."*

---

## 7. Deliverables & Offline Compliance

- **Zero Cloud Runtime Calls:** All GeoIP/ASN lookups resolve offline via local MMDB binaries and local subnet intelligence.
- **Zero-Dependency Fallback:** Automatically switches between native MongoDB and an offline embedded document store.
- **Cross-Platform:** Runs on any Linux distribution (Ubuntu, Debian, RHEL, Kali) and macOS.
