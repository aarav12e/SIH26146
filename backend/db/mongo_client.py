import os
import json
import logging
import uuid
from typing import Dict, Any, List, Optional
from pathlib import Path
from backend.config import MONGO_URI, DB_NAME, USE_OFFLINE_STORAGE, DATA_DIR

logger = logging.getLogger("bitcoin_forensics.db")

class EmbeddedCollection:
    """
    High-performance in-memory collection providing PyMongo-compatible CRUD methods.
    Supports complete offline and air-gapped demo runs without MongoDB running.
    """
    def __init__(self, name: str, persistence_file: Optional[Path] = None):
        self.name = name
        self.persistence_file = persistence_file
        self.docs: List[Dict[str, Any]] = []
        self._load()

    def _load(self):
        if self.persistence_file and self.persistence_file.exists():
            try:
                with open(self.persistence_file, "r", encoding="utf-8") as f:
                    self.docs = json.load(f)
            except Exception as e:
                logger.warning(f"Error loading {self.persistence_file}: {e}")
                self.docs = []

    def _persist(self):
        if self.persistence_file:
            try:
                self.persistence_file.parent.mkdir(parents=True, exist_ok=True)
                with open(self.persistence_file, "w", encoding="utf-8") as f:
                    json.dump(self.docs, f, indent=2, default=str)
            except Exception as e:
                logger.error(f"Error persisting {self.persistence_file}: {e}")

    def insert_one(self, doc: Dict[str, Any]):
        if not isinstance(doc, dict):
            return type("InsertResult", (), {"inserted_id": None})()
        if "_id" not in doc:
            doc["_id"] = doc.get("txid") or doc.get("wallet_address") or doc.get("flagged_id") or doc.get("edge_id") or doc.get("cluster_id") or uuid.uuid4().hex
        self.docs.append(dict(doc))
        self._persist()
        return type("InsertResult", (), {"inserted_id": doc["_id"]})()

    def insert_many(self, docs: List[Dict[str, Any]]):
        inserted_ids = []
        for doc in docs:
            if not isinstance(doc, dict):
                continue
            if "_id" not in doc:
                doc["_id"] = doc.get("txid") or doc.get("wallet_address") or doc.get("flagged_id") or doc.get("edge_id") or doc.get("cluster_id") or uuid.uuid4().hex
            self.docs.append(dict(doc))
            inserted_ids.append(doc["_id"])
        self._persist()
        return type("InsertManyResult", (), {"inserted_ids": inserted_ids})()

    def find(self, filter_query: Optional[Dict[str, Any]] = None, projection: Optional[Dict[str, Any]] = None):
        res = []
        filter_query = filter_query or {}
        for d in self.docs:
            match = True
            for k, v in filter_query.items():
                if isinstance(v, dict):
                    if "$gte" in v and not (d.get(k, 0) >= v["$gte"]):
                        match = False; break
                    if "$lte" in v and not (d.get(k, 0) <= v["$lte"]):
                        match = False; break
                    if "$in" in v and d.get(k) not in v["$in"]:
                        match = False; break
                elif d.get(k) != v:
                    match = False
                    break
            if match:
                res.append(dict(d))
        return CursorWrapper(res)

    def find_one(self, filter_query: Dict[str, Any]):
        for d in self.docs:
            match = True
            for k, v in filter_query.items():
                if d.get(k) != v:
                    match = False
                    break
            if match:
                return dict(d)
        return None

    def update_one(self, filter_query: Dict[str, Any], update_doc: Dict[str, Any], upsert: bool = False):
        set_vals = update_doc.get("$set", update_doc)
        for i, d in enumerate(self.docs):
            match = True
            for k, v in filter_query.items():
                if d.get(k) != v:
                    match = False
                    break
            if match:
                self.docs[i].update(set_vals)
                self._persist()
                return type("UpdateResult", (), {"modified_count": 1})()
        if upsert:
            new_doc = {**filter_query, **set_vals}
            self.insert_one(new_doc)
            return type("UpdateResult", (), {"modified_count": 1, "upserted_id": new_doc.get("_id")})()
        return type("UpdateResult", (), {"modified_count": 0})()

    def delete_many(self, filter_query: Dict[str, Any]):
        before_len = len(self.docs)
        if not filter_query:
            self.docs = []
        else:
            self.docs = [d for d in self.docs if not all(d.get(k) == v for k, v in filter_query.items())]
        self._persist()
        return type("DeleteResult", (), {"deleted_count": before_len - len(self.docs)})()

    def count_documents(self, filter_query: Optional[Dict[str, Any]] = None) -> int:
        if not filter_query:
            return len(self.docs)
        return len(list(self.find(filter_query)))


class CursorWrapper:
    def __init__(self, data: List[Dict[str, Any]]):
        self._data = data

    def sort(self, key_or_list, direction=1):
        if isinstance(key_or_list, list):
            key, direction = key_or_list[0]
        else:
            key = key_or_list
        reverse = (direction == -1)
        self._data = sorted(self._data, key=lambda x: x.get(key, 0) or 0, reverse=reverse)
        return self

    def skip(self, n: int):
        self._data = self._data[n:]
        return self

    def limit(self, n: int):
        self._data = self._data[:n]
        return self

    def __iter__(self):
        return iter(self._data)

    def __len__(self):
        return len(self._data)


class DatabaseManager:
    def __init__(self):
        self.is_live_mongo = False
        self.client = None
        self.db = None
        self._connect()

    def _connect(self):
        if USE_OFFLINE_STORAGE == "true":
            logger.info("Configured to use Offline Zero-Dependency Document Store.")
            self._setup_embedded()
            return

        try:
            from pymongo import MongoClient
            client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=1000)
            client.admin.command("ping")
            self.client = client
            self.db = client[DB_NAME]
            self.is_live_mongo = True
            logger.info(f"Connected to MongoDB at {MONGO_URI}, database: {DB_NAME}")
        except Exception as e:
            logger.info(f"MongoDB not available ({e}). Using robust embedded offline document store.")
            self._setup_embedded()

    def _setup_embedded(self):
        self.is_live_mongo = False
        db_dir = DATA_DIR / "embedded_db"
        db_dir.mkdir(parents=True, exist_ok=True)
        self.embedded_collections = {
            "transactions": EmbeddedCollection("transactions", db_dir / "transactions.json"),
            "wallets": EmbeddedCollection("wallets", db_dir / "wallets.json"),
            "flags": EmbeddedCollection("flags", db_dir / "flags.json"),
            "graph_edges": EmbeddedCollection("graph_edges", db_dir / "graph_edges.json"),
            "clusters": EmbeddedCollection("clusters", db_dir / "clusters.json")
        }

    @property
    def transactions(self):
        return self.db["transactions"] if self.is_live_mongo else self.embedded_collections["transactions"]

    @property
    def wallets(self):
        return self.db["wallets"] if self.is_live_mongo else self.embedded_collections["wallets"]

    @property
    def flags(self):
        return self.db["flags"] if self.is_live_mongo else self.embedded_collections["flags"]

    @property
    def graph_edges(self):
        return self.db["graph_edges"] if self.is_live_mongo else self.embedded_collections["graph_edges"]

    @property
    def clusters(self):
        return self.db["clusters"] if self.is_live_mongo else self.embedded_collections["clusters"]


db_manager = DatabaseManager()

def get_db():
    return db_manager
