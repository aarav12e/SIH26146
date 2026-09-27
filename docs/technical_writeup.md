# NTRO Technical Writeup: Bitcoin Traffic Forensic Link-Analysis Platform

**Organization**: National Technical Research Organisation (NTRO)  
**Problem Statement**: SIH26146 - Autonomous Bitcoin Network Traffic Forensic Monitoring  
**Target Environment**: 100% Offline / Air-Gapped Intelligence Stations

---

## 1. Executive Summary & Forensic Approach
The NTRO Bitcoin Traffic Forensic Link-Analysis Platform is an air-gapped system designed to ingest, reconstruct, analyze, and explain illicit Bitcoin transaction patterns and network traffic behavior. 

Unlike conventional public block explorers that rely on live cloud APIs (such as Blockstream, Blockchain.info, or Etherscan), this platform operates entirely offline. It fuses network layer packet telemetry (source/destination IP, port, autonomous system numbers) with blockchain UTXO ledgers (inputs, outputs, scripts, fees). The pipeline constructs a heterogeneous directed property graph $G=(V, E)$ connecting Wallets, Transactions, and Relay IPs.

```
Raw Traffic / Ledger (CSV/JSON/XML)
               │
               ▼
   [Offline GeoIP & Parser] ──(Zero live network calls)
               │
               ▼
   [NetworkX Tripartite Graph] ──(Wallet -> TX -> Wallet + IP links)
               │
               ▼
   [11-Dimensional Feature Engine] ──(Velocity, Fan Ratios, Centrality, Round Freq)
               │
   ┌───────────┴─────────────────────────────┐
   ▼                                         ▼
[Structural ML Models]            [Deterministic Heuristic Detectors]
 - Isolation Forest Outliers       - Multi-Input Union-Find (Entity Clusters)
 - Personalized PageRank Flow      - Peeling-Chain DFS Traversal
                                   - CoinJoin Equal-Denomination Rule
               │                             │
               └──────────────┬──────────────┘
                              ▼
                [Explainability Rule Engine]
                (Human-readable forensic audit trails)
                              ▼
                [Interactive Law-Enforcement UI]
```

---

## 2. Model Choice & Rationale

### A. Entity Resolution: Disjoint Set Union (Common-Input Heuristic)
* **Rationale**: Multi-input Bitcoin transactions require simultaneous digital signatures for each spent UTXO, establishing joint ownership with high probability. 
* **Model**: A Union-Find (Disjoint Set) algorithm processes co-spent input addresses in $O(N \cdot \alpha(N))$ time complexity, partitioning pseudonymous addresses into macroscopic real-world entity clusters.

### B. Behavioral Anomaly Detection: Isolation Forest
* **Rationale**: Illicit cryptocurrency operations (such as darknet cash-outs, smurfing, ransomware aggregation) occupy anomalous positions in feature space. Supervised training is unfeasible due to extreme class imbalance and lack of ground-truth labels.
* **Model**: `IsolationForest(n_estimators=100, contamination=0.10)`. The model isolates points by randomly selecting feature splits. Outlier wallets require significantly fewer tree splits to isolate, resulting in high anomaly scores without parametric distribution assumptions.
* **Feature Vector ($d=11$)**:
  1. `fan_in`: Distinct input count.
  2. `fan_out`: Distinct output count.
  3. `fan_ratio`: Ratio of outbound to inbound degrees.
  4. `velocity`: Transaction tempo (txs/hour), catching programmatic bots.
  5. `amount_mean`: Average BTC volume transacted.
  6. `amount_variance`: Variance in transferred amounts.
  7. `amount_sum`: Gross volume.
  8. `round_number_freq`: Proportion of transactions with clean round amounts (structuring).
  9. `ip_diversity`: Number of distinct IP relays utilized by the wallet.
  10. `degree_centrality`: Connectivity density within the graph.
  11. `betweenness_centrality`: Critical intermediary / bridge routing score.

### C. Sequential Peeling-Chain Detector
* **Rationale**: Extortionists and money launderers systematically peel small tranches of BTC from a primary reserve while routing remainder change to fresh addresses.
* **Model**: Directed graph depth-first traversal tracking sequences of $(1 \to 2)$ transactions where the large change output continuously funds the next hop.

### D. CoinJoin Mixing Detector
* **Rationale**: Mixers strip transaction linkability by pooling inputs and distributing equal amounts.
* **Model**: Combinatorial validation identifying transactions with $\ge 3$ distinct inputs and $\ge 3$ identical output values (e.g., 0.1 BTC, 1.0 BTC) matching Wasabi or Whirlpool pool profiles.

### E. Risk Propagation: Personalized PageRank (PPR)
* **Rationale**: Wallets directly or indirectly exchanging funds with flagged bad actors inherit financial taint.
* **Model**: Random walk with restart biased toward high-threat seed nodes, propagating continuous risk scores across transaction flow lines:
  $$\mathbf{r} = (1 - \alpha)\mathbf{s} + \alpha \mathbf{r} \mathbf{P}$$
  where $\mathbf{s}$ is the personalized seed distribution and $\alpha = 0.85$.

---

## 3. Explainability Framework
Black-box AI flags are inadmissible and unhelpful to law enforcement investigators. The Explainability Engine translates multi-signal anomalies into concrete, empirical evidence statements:

1. **Isolation Forest Outliers**: Quantifies deviation percentiles, e.g., *"Extreme velocity (12.4 tx/hr, 98th percentile) combined with rapid fan-out across 14 recipient addresses."*
2. **Peeling Chains**: Identifies hops and addresses, e.g., *"Detected 5-hop sequential peeling chain routing 48.2 BTC into 5 distinct withdrawal addresses."*
3. **CoinJoin Mixers**: Highlights coordinated denominations, e.g., *"CoinJoin obfuscation detected: 5 inputs combined into 5 identical 0.50 BTC outputs."*
4. **Network Provenance**: Correlates IP relay geolocation, e.g., *"Broadcast via 4 distinct relays spanning NL, RU, and Tor-associated ASN12876."*

---

## 4. Air-Gapped & Offline Resilience
The platform operates without network access:
* **MaxMind GeoLite2 MMDB**: Direct binary byte-lookup without external socket or HTTP queries.
* **Embedded Storage Resiliency**: If an external MongoDB instance is absent, the system seamlessly transitions to its built-in in-memory document store with atomic disk persistence.
* **Offline Verification**: All 10 automated test suites validate end-to-end functionality under simulated air-gapped conditions.
