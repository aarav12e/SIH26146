import numpy as np
import networkx as nx
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import RobustScaler
from sklearn.metrics.pairwise import cosine_similarity
import logging
import random
from typing import Dict, Any, List, Set, Tuple
from collections import defaultdict
from backend.app.db import db_manager
from backend.app.config import ANOMALY_CONTAMINATION

logger = logging.getLogger("bitcoin_forensics.ml")

FEATURE_KEYS = [
    "fan_in",
    "fan_out",
    "fan_ratio",
    "velocity",
    "amount_variance",
    "round_number_freq",
    "ip_diversity",
    "betweenness_centrality",
    "degree_centrality"
]

# =========================================================================
# Focus Area 1: Entity Clustering (Union-Find & Node2Vec Embeddings)
# =========================================================================

class UnionFind:
    """Disjoint Set Union (DSU) data structure for Common-Input Heuristic."""
    def __init__(self):
        self.parent = {}
        self.rank = {}

    def find(self, item: str) -> str:
        if item not in self.parent:
            self.parent[item] = item
            self.rank[item] = 0
            return item
        if self.parent[item] != item:
            self.parent[item] = self.find(self.parent[item])
        return self.parent[item]

    def union(self, a: str, b: str):
        root_a = self.find(a)
        root_b = self.find(b)
        if root_a != root_b:
            if self.rank[root_a] < self.rank[root_b]:
                self.parent[root_a] = root_b
            elif self.rank[root_a] > self.rank[root_b]:
                self.parent[root_b] = root_a
            else:
                self.parent[root_b] = root_a
                self.rank[root_a] += 1

class FastNode2Vec:
    """
    Deterministic random-walk transition-matrix graph embedder.
    Generates embedding vectors for wallets to surface soft same-entity candidates
    that did not literally co-spend in the same transaction.
    """
    def __init__(self, dimensions: int = 16, walk_length: int = 10, num_walks: int = 10):
        self.dimensions = dimensions
        self.walk_length = walk_length
        self.num_walks = num_walks

    def fit_transform(self, G: nx.Graph, wallet_ids: List[str]) -> Dict[str, np.ndarray]:
        if not wallet_ids or G.number_of_nodes() == 0:
            return {wid: np.zeros(self.dimensions) for wid in wallet_ids}

        # Build random walks
        nodes = list(G.nodes())
        walks = []
        random.seed(42)

        for _ in range(self.num_walks):
            random.shuffle(nodes)
            for node in nodes:
                walk = [node]
                curr = node
                for _ in range(self.walk_length - 1):
                    neighbors = list(G.neighbors(curr))
                    if not neighbors:
                        break
                    curr = random.choice(neighbors)
                    walk.append(curr)
                walks.append(walk)

        # Build co-occurrence matrix between wallets
        wallet_set = set(wallet_ids)
        wallet_index = {w: i for i, w in enumerate(wallet_ids)}
        N = len(wallet_ids)
        co_matrix = np.zeros((N, N), dtype=np.float32)

        for walk in walks:
            w_in_walk = [w for w in walk if w in wallet_set]
            for i, w1 in enumerate(w_in_walk):
                idx1 = wallet_index[w1]
                # Context window 3
                for w2 in w_in_walk[max(0, i - 3): min(len(w_in_walk), i + 4)]:
                    if w1 != w2:
                        idx2 = wallet_index[w2]
                        co_matrix[idx1, idx2] += 1.0

        # SVD decomposition to obtain compact embedding vectors
        try:
            u, s, _ = np.linalg.svd(co_matrix + np.eye(N) * 1e-4, full_matrices=False)
            k = min(self.dimensions, len(s))
            emb_matrix = u[:, :k] * np.sqrt(s[:k])
            # Pad if k < dimensions
            if k < self.dimensions:
                emb_matrix = np.pad(emb_matrix, ((0, 0), (0, self.dimensions - k)))
        except Exception:
            emb_matrix = np.random.RandomState(42).randn(N, self.dimensions)

        embeddings = {}
        for wid, idx in wallet_index.items():
            norm = np.linalg.norm(emb_matrix[idx])
            embeddings[wid] = emb_matrix[idx] / (norm + 1e-7)
        return embeddings

# =========================================================================
# Focus Area 3: Peeling-Chain & CoinJoin Mixing Detection
# =========================================================================

class PeelingAndMixerDetector:
    @staticmethod
    def detect_peeling_chains(transactions: List[Dict[str, Any]], G: nx.DiGraph, min_chain_len: int = 3) -> Dict[str, Dict[str, Any]]:
        """
        DFS graph walk following output -> input links.
        Identifies sequences where one output carries ~70-95% of value (change)
        while the other is a small peeled payment.
        """
        peel_flags_per_tx = {}
        wallet_peel_membership = defaultdict(list)

        # Map each address to the transactions where it appears as an input
        addr_to_spending_tx = defaultdict(list)
        for tx in transactions:
            for inp in tx.get("input_addresses", []):
                if inp:
                    addr_to_spending_tx[inp].append(tx)

        for tx in transactions:
            txid = tx["txid"]
            out_addrs = tx.get("output_addresses", [])
            out_amts = tx.get("output_amounts", [])

            # Classic peel condition: 2 outputs (one payment, one change)
            if len(out_addrs) == 2 and len(out_amts) == 2:
                total_out = sum(out_amts)
                if total_out <= 0:
                    continue
                ratio_0 = out_amts[0] / total_out
                ratio_1 = out_amts[1] / total_out

                # Check asymmetric split: one output carries 60-98% of value
                change_candidate = None
                if 0.60 <= ratio_0 <= 0.99:
                    change_candidate = out_addrs[0]
                elif 0.60 <= ratio_1 <= 0.99:
                    change_candidate = out_addrs[1]

                if change_candidate and change_candidate in addr_to_spending_tx:
                    # Trace forward chain
                    chain = [txid]
                    chain_wallets = list(tx.get("input_addresses", [])) + [change_candidate]
                    curr_change = change_candidate

                    while curr_change in addr_to_spending_tx and len(chain) < 15:
                        next_txs = addr_to_spending_tx[curr_change]
                        if not next_txs:
                            break
                        next_tx = next_txs[0]
                        next_outs = next_tx.get("output_addresses", [])
                        next_amts = next_tx.get("output_amounts", [])
                        if len(next_outs) == 2 and len(next_amts) == 2:
                            n_total = sum(next_amts)
                            n_r0 = next_amts[0] / max(n_total, 1e-6)
                            n_r1 = next_amts[1] / max(n_total, 1e-6)
                            next_change = None
                            if 0.60 <= n_r0 <= 0.99:
                                next_change = next_outs[0]
                            elif 0.60 <= n_r1 <= 0.99:
                                next_change = next_outs[1]

                            if next_change:
                                chain.append(next_tx["txid"])
                                chain_wallets.append(next_change)
                                curr_change = next_change
                            else:
                                break
                        else:
                            break

                    if len(chain) >= min_chain_len:
                        peel_info = {
                            "is_peel": True,
                            "chain_length": len(chain),
                            "wallets": list(set(chain_wallets))
                        }
                        for cid in chain:
                            peel_flags_per_tx[cid] = peel_info
                        for w in chain_wallets:
                            wallet_peel_membership[w].append(len(chain))

        return peel_flags_per_tx, wallet_peel_membership

    @staticmethod
    def detect_coinjoin_mixing(tx: Dict[str, Any], k: int = 3, max_rel_std: float = 0.15) -> Dict[str, Any]:
        """
        CoinJoin Rule: num_inputs >= k AND num_outputs >= k AND stddev(output_amounts) < epsilon.
        """
        in_addrs = tx.get("input_addresses", [])
        out_amts = tx.get("output_amounts", [])

        if len(in_addrs) >= k and len(out_amts) >= k:
            mean_amt = float(np.mean(out_amts))
            std_amt = float(np.std(out_amts))
            rel_std = std_amt / max(mean_amt, 1e-6)
            if rel_std <= max_rel_std or std_amt < 0.05:
                return {
                    "is_coinjoin_like": True,
                    "num_participants": len(in_addrs)
                }

        return {"is_coinjoin_like": False, "num_participants": 0}

# =========================================================================
# Master ML Pipeline Orchestrator
# =========================================================================

class MLPipeline:
    def __init__(self):
        self.node2vec = FastNode2Vec(dimensions=16)

    def run_entity_clustering(self, transactions: List[Dict[str, Any]], G: nx.DiGraph) -> Tuple[Dict[str, int], Dict[str, List[str]]]:
        """
        Focus Area 1:
        1. Common-input-ownership heuristic with Union-Find -> entity_id
        2. Node2Vec graph embeddings -> embedding_neighbors (soft candidates)
        """
        uf = UnionFind()
        wallets = db_manager.wallets.find()
        wallet_ids = [w["_id"] for w in wallets]

        # Initialize all wallets in Union-Find
        for wid in wallet_ids:
            uf.find(wid)

        # Co-occurring input addresses heuristic
        for tx in transactions:
            in_addrs = [a for a in tx.get("input_addresses", []) if a]
            if len(in_addrs) >= 2:
                first_addr = in_addrs[0]
                for other_addr in in_addrs[1:]:
                    uf.union(first_addr, other_addr)

        # Assign integer entity_id per connected component
        root_to_id = {}
        entity_ids = {}
        for wid in wallet_ids:
            root = uf.find(wid)
            if root not in root_to_id:
                root_to_id[root] = len(root_to_id) + 1
            entity_ids[wid] = root_to_id[root]

        # Soft Grouping Extension: Node2Vec Embeddings
        logger.info("Computing Node2Vec graph embeddings for soft entity clustering...")
        undirected_G = G.to_undirected()
        embeddings = self.node2vec.fit_transform(undirected_G, wallet_ids)

        # Compute cosine similarity for candidates not already in same Union-Find cluster
        embedding_neighbors = defaultdict(list)
        if len(wallet_ids) > 1:
            matrix = np.array([embeddings[w] for w in wallet_ids])
            sim_matrix = cosine_similarity(matrix)
            for i, w1 in enumerate(wallet_ids):
                for j, w2 in enumerate(wallet_ids):
                    if i != j and entity_ids[w1] != entity_ids[w2]:
                        if sim_matrix[i, j] >= 0.82:
                            embedding_neighbors[w1].append(w2)

        # Write entity_id and embedding_neighbors to DB
        cluster_members = defaultdict(list)
        for wid in wallet_ids:
            eid = entity_ids[wid]
            cluster_members[eid].append(wid)
            db_manager.wallets.update_one(
                {"_id": wid},
                {"$set": {
                    "entity_id": eid,
                    "cluster_id": eid, # Backwards compatibility
                    "embedding_neighbors": embedding_neighbors[wid][:5]
                }}
            )

        # Save cluster metadata to clusters collection
        cluster_docs = []
        for eid, members in cluster_members.items():
            subg = undirected_G.subgraph(members)
            sub_n = subg.number_of_nodes()
            sub_e = subg.number_of_edges()
            max_possible = max(sub_n * (sub_n - 1) / 2.0, 1.0)
            density = sub_e / max_possible

            cluster_docs.append({
                "_id": str(eid),
                "cluster_id": eid,
                "entity_id": eid,
                "node_count": len(members),
                "edge_count": sub_e,
                "density": float(round(density, 4)),
                "density_ratio_vs_baseline": float(round(density / 0.05, 2)),
                "member_sample": members[:20],
                "all_members": members
            })

        db_manager.clusters.delete_many({})
        if cluster_docs:
            db_manager.clusters.insert_many(cluster_docs)

        logger.info(f"Entity Clustering complete: {len(cluster_members)} Union-Find entities identified.")
        return entity_ids, embedding_neighbors

    def run_anomaly_detection(self) -> Dict[str, float]:
        """
        Focus Area 2:
        Isolation Forest on 9 engineered feature vectors.
        """
        wallets = db_manager.wallets.find()
        if not wallets:
            return {}

        wallet_ids = [w["_id"] for w in wallets]
        X = []
        for w in wallets:
            feats = w.get("features", {})
            row = [float(feats.get(k, 0.0)) for k in FEATURE_KEYS]
            X.append(row)

        X = np.array(X, dtype=np.float64)
        if len(X) < 3:
            return {wid: 0.1 for wid in wallet_ids}

        scaler = RobustScaler()
        X_scaled = scaler.fit_transform(X)

        clf = IsolationForest(
            n_estimators=100,
            contamination=ANOMALY_CONTAMINATION,
            random_state=42
        )
        clf.fit(X_scaled)

        raw_scores = clf.score_samples(X_scaled)
        min_s = float(np.min(raw_scores))
        max_s = float(np.max(raw_scores))
        spread = max(max_s - min_s, 1e-6)
        calibrated_scores = 1.0 - ((raw_scores - min_s) / spread)

        scores_map = {}
        for i, wid in enumerate(wallet_ids):
            score = float(round(calibrated_scores[i], 4))
            scores_map[wid] = score
            db_manager.wallets.update_one(
                {"_id": wid},
                {"$set": {"anomaly_score": score}}
            )

        logger.info("Anomaly detection completed.")
        return scores_map

    def run_peeling_and_mixing_detection(self, G: nx.DiGraph) -> Tuple[Dict[str, Any], Dict[str, List[int]]]:
        """
        Focus Area 3:
        1. Peeling-chain graph walk (DFS)
        2. CoinJoin mixing detection
        """
        transactions = db_manager.transactions.find()
        peel_flags_per_tx, wallet_peels = PeelingAndMixerDetector.detect_peeling_chains(transactions, G)

        for tx in transactions:
            txid = tx["txid"]
            chain_flag = peel_flags_per_tx.get(txid, {"is_peel": False, "chain_length": 0, "wallets": []})
            mix_flag = PeelingAndMixerDetector.detect_coinjoin_mixing(tx)

            db_manager.transactions.update_one(
                {"_id": txid},
                {"$set": {
                    "chain_flag": chain_flag,
                    "mix_flag": mix_flag
                }}
            )

        logger.info(f"Peeling and mixing detection complete. Found {len(peel_flags_per_tx)} peeling txs.")
        return peel_flags_per_tx, wallet_peels

    def run_risk_propagation(self, G: nx.DiGraph, anomaly_scores: Dict[str, float], wallet_peels: Dict[str, List[int]]) -> Dict[str, Dict[str, Any]]:
        """
        Focus Area 4:
        Guilt-by-Association Risk Scoring using Personalized PageRank & BFS decay.
        Seeds = Top anomalous wallets and peeling-chain originators.
        """
        wallets = db_manager.wallets.find()
        wallet_ids = set([w["_id"] for w in wallets])
        if not wallet_ids or G.number_of_nodes() == 0:
            return {}

        # 1. Identify seed wallets (score >= 0.75 or participating in peeling chain)
        seeds = {}
        for wid in wallet_ids:
            score = anomaly_scores.get(wid, 0.0)
            is_peel = len(wallet_peels.get(wid, [])) > 0
            if score >= 0.70 or is_peel:
                seed_weight = score + (0.3 if is_peel else 0.0)
                seeds[wid] = seed_weight

        if not seeds:
            # Fallback: take top 3 highest anomaly wallets
            sorted_wallets = sorted(wallet_ids, key=lambda w: anomaly_scores.get(w, 0.0), reverse=True)
            for w in sorted_wallets[:3]:
                seeds[w] = 1.0

        # Normalize seed weights
        seed_sum = sum(seeds.values())
        personalization = {n: (seeds[n] / seed_sum if n in seeds else 0.0) for n in G.nodes()}

        # 2. Run Personalized PageRank on entity graph
        try:
            ppr = nx.pagerank(G.to_undirected(), alpha=0.85, personalization=personalization, max_iter=100)
        except Exception:
            ppr = {n: 1.0 / len(G.nodes()) for n in G.nodes()}

        # Calibrate risk scores to [0.0, 1.0]
        wallet_ppr = [ppr.get(w, 0.0) for w in wallet_ids]
        max_p = max(wallet_ppr) if wallet_ppr else 1.0
        min_p = min(wallet_ppr) if wallet_ppr else 0.0
        p_spread = max(max_p - min_p, 1e-7)

        # 3. BFS attribution to determine which seed and hop distance propagated the risk
        seed_attributions = {}
        undirected_G = G.to_undirected()

        for wid in wallet_ids:
            norm_risk = float(round((ppr.get(wid, 0.0) - min_p) / p_spread, 3))
            
            # Find closest seed
            closest_seed = None
            min_dist = 999
            for seed in seeds.keys():
                try:
                    dist = nx.shortest_path_length(undirected_G, source=seed, target=wid)
                    if dist < min_dist:
                        min_dist = dist
                        closest_seed = seed
                except Exception:
                    continue

            seed_attributions[wid] = {
                "risk_score": norm_risk,
                "seed_wallet": closest_seed or wid,
                "hop_distance": min_dist if min_dist != 999 else 0
            }

            db_manager.wallets.update_one(
                {"_id": wid},
                {"$set": {
                    "risk_score": norm_risk,
                    "seed_wallet": closest_seed or wid,
                    "hop_distance": min_dist if min_dist != 999 else 0
                }}
            )

        logger.info(f"Risk propagation complete. Propagated from {len(seeds)} seed wallets.")
        return seed_attributions

ml_pipeline = MLPipeline()
