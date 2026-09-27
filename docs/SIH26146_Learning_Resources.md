# SIH26146 Forensic Learning Resources & Research Reference

## 1. Foundational Blockchain & Graph Forensics

### Key Academic Research Papers
1. **Androulaki et al. (2013)** - *"Evaluating User Privacy in Bitcoin"*
   - Formulation of the **Multi-Input Heuristic (Common Input Heuristic)**: addresses co-spent in a single transaction are controlled by the same real-world entity.
   - Foundation for Union-Find address clustering.

2. **Meiklejohn et al. (2013)** - *"A Fistful of Bitcoins: Characterizing Payments Among Men with No Names"*
   - Heuristics for Change Address identification and Peeling Chain tracking.
   - Classification of Bitcoin ecosystem entities (exchanges, mining pools, darknet marketplaces).

3. **Moser, Bohme, & Breuker (2013)** - *"An Inquiry into Money Laundering Tools in the Bitcoin Ecosystem"*
   - Analysis of mixers, foggers, and automated CoinJoin structures.
   - Mathematical detection of equal-denomination mixing behavior.

4. **Liu et al. (2021)** - *"Graph Neural Networks and Link Analysis in Cryptocurrency Forensics"*
   - Personalized PageRank for risk propagation across transaction graphs.
   - Structural node feature engineering for anti-money laundering (AML).

---

## 2. Core Detection Heuristics Applied in SIH26146

### Heuristic 1: Multi-Input Clustering (Union-Find)
* **Principle**: Because signing a multi-input transaction requires private keys for all inputs simultaneously, all input addresses are inferred to belong to the same private key holder or collaborative wallet software.
* **Implementation**: Disjoint Set Union (DSU) data structure with path compression and rank union ($O(\alpha(N))$ time complexity).

### Heuristic 2: Peeling-Chain Traversal
* **Pattern**: A large unspent UTXO is successively decomposed through a sequence of transactions where:
  - Input count = 1
  - Output count = 2 (one transfer/peel amount, one change amount returned)
  - Change output from step $k$ immediately acts as input in step $k+1$.
* **Forensic Significance**: Primary mechanism used in ransomware extortion payments and darknet vendor cash-outs.

### Heuristic 3: CoinJoin / Mixer Detection
* **Pattern**: Transactions structured to confound graph analysis by having multiple un-coordinated inputs and identical output denominations.
* **Criterion**:
  $$\text{count}(\text{outputs with identical amount } v) \ge 3 \quad \text{and} \quad |\text{inputs}| \ge 3$$

### Heuristic 4: Graph Centrality & Flow Metrics
* **Fan-In / Fan-Out Ratio**:
  $$\text{Fan Ratio} = \frac{F_{\text{out}}}{\max(F_{\text{in}}, 1)}$$
  Extreme ratios indicate syndicates, smurfing aggregators, or exchange deposit addresses.
* **Transaction Velocity**: Frequency of spends per unit time, flagging automated programmatic laundering.
* **Personalized PageRank (PPR)**:
  $$\mathbf{r} = (1 - \alpha)\mathbf{s} + \alpha \mathbf{r} \mathbf{P}$$
  Propagates threat confidence $\mathbf{s}$ from detected anomaly seeds to adjacent counterparties.

---

## 3. Libraries & Technology Stack Reference
* **FastAPI**: Asynchronous Python API server with built-in OpenAPI documentation.
* **NetworkX**: Directed graph analysis library for graph creation, centralities, and neighbor lookups.
* **Scikit-Learn**: Machine learning library providing `IsolationForest` and `StandardScaler`.
* **GeoIP2 & MaxMind GeoLite2**: Offline binary database format (`.mmdb`) mapping IP blocks to geolocations.
* **React 19 & Tailwind CSS**: Modern reactive forensic link-analysis user interface.
