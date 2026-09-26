import json
import uuid
import copy
import logging
import threading
from typing import Any, Dict, List, Optional
from backend.app.config import MONGODB_URI, DB_NAME, OFFLINE_DB_PATH

logger = logging.getLogger("bitcoin_forensics.db")

class EmbeddedCollection:
    """A thread-safe, MongoDB-compatible collection for 100% offline usage."""
    def __init__(self, name: str, store: "OfflineDocumentStore"):
        self.name = name
        self.store = store

    def _matches(self, doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
        if not query:
            return True
        for key, expected in query.items():
            if key == "$or":
                if not any(self._matches(doc, subq) for subq in expected):
                    return False
                continue
            if key == "$and":
                if not all(self._matches(doc, subq) for subq in expected):
                    return False
                continue

            # Support dot notation
            parts = key.split(".")
            val = doc
            found = True
            for part in parts:
                if isinstance(val, dict) and part in val:
                    val = val[part]
                else:
                    found = False
                    break
            
            if not found:
                if expected is None:
                    continue
                return False

            if isinstance(expected, dict):
                for op, op_val in expected.items():
                    if op == "$gte" and not (val >= op_val):
                        return False
                    elif op == "$lte" and not (val <= op_val):
                        return False
                    elif op == "$gt" and not (val > op_val):
                        return False
                    elif op == "$lt" and not (val < op_val):
                        return False
                    elif op == "$ne" and not (val != op_val):
                        return False
                    elif op == "$in" and val not in op_val:
                        return False
                    elif op == "$nin" and val in op_val:
                        return False
            else:
                if isinstance(val, list) and not isinstance(expected, list):
                    if expected not in val:
                        return False
                elif val != expected:
                    return False
        return True

    def find(self, query: Optional[Dict[str, Any]] = None, projection: Optional[Dict[str, Any]] = None, sort: Optional[List] = None, limit: int = 0, skip: int = 0) -> List[Dict[str, Any]]:
        query = query or {}
        with self.store.lock:
            docs = self.store.data.get(self.name, [])
            results = [copy.deepcopy(doc) for doc in docs if self._matches(doc, query)]

        if sort:
            for field, direction in reversed(sort):
                reverse = (direction == -1 or direction == "desc")
                def sort_key(d):
                    val = d.get(field)
                    return (val is not None, val if val is not None else 0)
                results.sort(key=sort_key, reverse=reverse)

        if skip > 0:
            results = results[skip:]
        if limit > 0:
            results = results[:limit]

        if projection:
            include = {k: v for k, v in projection.items() if v}
            exclude = {k: v for k, v in projection.items() if not v}
            filtered_results = []
            for doc in results:
                if include:
                    new_doc = {k: doc[k] for k in include if k in doc}
                    if "_id" not in include and "_id" in doc and projection.get("_id") != 0:
                        new_doc["_id"] = doc["_id"]
                    filtered_results.append(new_doc)
                elif exclude:
                    new_doc = {k: v for k, v in doc.items() if k not in exclude}
                    filtered_results.append(new_doc)
                else:
                    filtered_results.append(doc)
            return filtered_results

        return results

    def find_one(self, query: Optional[Dict[str, Any]] = None, sort: Optional[List] = None) -> Optional[Dict[str, Any]]:
        results = self.find(query=query, sort=sort, limit=1)
        return results[0] if results else None

    def insert_one(self, doc: Dict[str, Any]):
        doc_copy = copy.deepcopy(doc)
        if "_id" not in doc_copy:
            doc_copy["_id"] = str(uuid.uuid4())
        with self.store.lock:
            if self.name not in self.store.data:
                self.store.data[self.name] = []
            # Check duplicate _id
            for i, existing in enumerate(self.store.data[self.name]):
                if existing.get("_id") == doc_copy["_id"]:
                    self.store.data[self.name][i] = doc_copy
                    self.store._save_locked()
                    class InsertResult:
                        inserted_id = doc_copy["_id"]
                    return InsertResult()
            self.store.data[self.name].append(doc_copy)
            self.store._save_locked()
        class InsertResult:
            inserted_id = doc_copy["_id"]
        return InsertResult()

    def insert_many(self, docs: List[Dict[str, Any]]):
        inserted_ids = []
        with self.store.lock:
            if self.name not in self.store.data:
                self.store.data[self.name] = []
            existing_ids = {d.get("_id"): i for i, d in enumerate(self.store.data[self.name])}
            for doc in docs:
                doc_copy = copy.deepcopy(doc)
                if "_id" not in doc_copy:
                    doc_copy["_id"] = str(uuid.uuid4())
                eid = doc_copy["_id"]
                if eid in existing_ids:
                    self.store.data[self.name][existing_ids[eid]] = doc_copy
                else:
                    self.store.data[self.name].append(doc_copy)
                    existing_ids[eid] = len(self.store.data[self.name]) - 1
                inserted_ids.append(eid)
            self.store._save_locked()
        class InsertManyResult:
            def __init__(self, ids):
                self.inserted_ids = ids
        return InsertManyResult(inserted_ids)

    def update_one(self, query: Dict[str, Any], update: Dict[str, Any], upsert: bool = False):
        with self.store.lock:
            docs = self.store.data.get(self.name, [])
            for doc in docs:
                if self._matches(doc, query):
                    if "$set" in update:
                        for k, v in update["$set"].items():
                            doc[k] = copy.deepcopy(v)
                    if "$inc" in update:
                        for k, v in update["$inc"].items():
                            doc[k] = doc.get(k, 0) + v
                    self.store._save_locked()
                    return {"matched_count": 1, "modified_count": 1}
            if upsert:
                new_doc = copy.deepcopy(query)
                if "$set" in update:
                    new_doc.update(copy.deepcopy(update["$set"]))
                if "_id" not in new_doc:
                    new_doc["_id"] = str(uuid.uuid4())
                if self.name not in self.store.data:
                    self.store.data[self.name] = []
                self.store.data[self.name].append(new_doc)
                self.store._save_locked()
                return {"matched_count": 0, "modified_count": 0, "upserted_id": new_doc["_id"]}
        return {"matched_count": 0, "modified_count": 0}

    def delete_many(self, query: Dict[str, Any]):
        with self.store.lock:
            docs = self.store.data.get(self.name, [])
            original_len = len(docs)
            kept = [doc for doc in docs if not self._matches(doc, query)]
            self.store.data[self.name] = kept
            deleted = original_len - len(kept)
            if deleted > 0:
                self.store._save_locked()
            return {"deleted_count": deleted}

    def count_documents(self, query: Optional[Dict[str, Any]] = None) -> int:
        return len(self.find(query=query))

    def distinct(self, field: str, query: Optional[Dict[str, Any]] = None) -> List[Any]:
        docs = self.find(query=query)
        vals = set()
        for doc in docs:
            v = doc.get(field)
            if isinstance(v, list):
                vals.update(v)
            elif v is not None:
                vals.add(v)
        return list(vals)


class OfflineDocumentStore:
    def __init__(self, file_path=OFFLINE_DB_PATH):
        self.file_path = file_path
        self.lock = threading.Lock()
        self.data: Dict[str, List[Dict[str, Any]]] = {
            "wallets": [],
            "transactions": [],
            "flags": [],
            "graph_edges": [],
            "clusters": []
        }
        self._load()

    def _load(self):
        if self.file_path.exists():
            try:
                with open(self.file_path, "r", encoding="utf-8") as f:
                    loaded = json.load(f)
                    if isinstance(loaded, dict):
                        self.data.update(loaded)
            except Exception as e:
                logger.warning(f"Could not load offline DB file: {e}")

    def _save_locked(self):
        try:
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump(self.data, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Error saving offline DB: {e}")

    def get_collection(self, name: str) -> EmbeddedCollection:
        return EmbeddedCollection(name, self)

    def __getitem__(self, name: str) -> EmbeddedCollection:
        return self.get_collection(name)


class MongoCollectionWrapper:
    """Wraps PyMongo collection to ensure consistent return types and helper methods."""
    def __init__(self, collection):
        self._col = collection

    def find(self, query: Optional[Dict[str, Any]] = None, projection: Optional[Dict[str, Any]] = None, sort: Optional[List] = None, limit: int = 0, skip: int = 0) -> List[Dict[str, Any]]:
        q = query or {}
        cursor = self._col.find(q, projection)
        if sort:
            cursor = cursor.sort(sort)
        if skip > 0:
            cursor = cursor.skip(skip)
        if limit > 0:
            cursor = cursor.limit(limit)
        return list(cursor)

    def find_one(self, query: Optional[Dict[str, Any]] = None, sort: Optional[List] = None) -> Optional[Dict[str, Any]]:
        q = query or {}
        if sort:
            return self._col.find_one(q, sort=sort)
        return self._col.find_one(q)

    def insert_one(self, doc: Dict[str, Any]):
        d = copy.deepcopy(doc)
        if "_id" not in d:
            d["_id"] = str(uuid.uuid4())
        return self._col.insert_one(d)

    def insert_many(self, docs: List[Dict[str, Any]]):
        if not docs:
            class EmptyRes:
                inserted_ids = []
            return EmptyRes()
        docs_copy = [copy.deepcopy(d) for d in docs]
        for d in docs_copy:
            if "_id" not in d:
                d["_id"] = str(uuid.uuid4())
        # Upsert or ignore duplicate keys seamlessly
        try:
            return self._col.insert_many(docs_copy, ordered=False)
        except Exception:
            # Fallback one by one
            for d in docs_copy:
                try:
                    self._col.replace_one({"_id": d["_id"]}, d, upsert=True)
                except Exception:
                    pass
            class FallbackRes:
                inserted_ids = [d["_id"] for d in docs_copy]
            return FallbackRes()

    def update_one(self, query: Dict[str, Any], update: Dict[str, Any], upsert: bool = False):
        return self._col.update_one(query, update, upsert=upsert)

    def delete_many(self, query: Dict[str, Any]):
        return self._col.delete_many(query)

    def count_documents(self, query: Optional[Dict[str, Any]] = None) -> int:
        return self._col.count_documents(query or {})

    def distinct(self, field: str, query: Optional[Dict[str, Any]] = None) -> List[Any]:
        return self._col.distinct(field, query or {})

    def __getattr__(self, name):
        return getattr(self._col, name)


class DatabaseManager:
    _instance = None
    _is_live_mongo = False

    def __init__(self):
        self.client = None
        self.db = None
        self._init_db()

    def _check_port_open(self, host: str, port: int, timeout: float = 0.1) -> bool:
        import socket
        try:
            with socket.create_connection((host, port), timeout=timeout):
                return True
        except Exception:
            return False

    def _init_db(self):
        is_atlas_or_remote = "mongodb+srv://" in MONGODB_URI or ("127.0.0.1" not in MONGODB_URI and "localhost" not in MONGODB_URI)
        
        if is_atlas_or_remote:
            try:
                from pymongo import MongoClient
                logger.info("Attempting connection to live MongoDB Atlas...")
                client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
                client.server_info()
                self.client = client
                self.db = client[DB_NAME]
                self._is_live_mongo = True
                print("\n" + "=" * 60)
                print(">>> [DATABASE STATUS]: db connected successfully! (MongoDB Atlas)")
                print(f">>> Database Name: '{DB_NAME}'")
                print("=" * 60 + "\n")
                logger.info(f"Successfully connected to live MongoDB Atlas ({DB_NAME})")
                return
            except Exception as e:
                print("\n" + "=" * 60)
                print(">>> [DATABASE STATUS]: not connected to MongoDB!")
                print(f">>> Error Detail: {e}")
                print(">>> Falling back to offline embedded document store.")
                print("=" * 60 + "\n")
                logger.warning(f"Could not connect to MongoDB Atlas ({e}). Falling back to embedded offline document store.")
        else:
            host = "127.0.0.1"
            port = 27017
            if self._check_port_open(host, port, timeout=0.15):
                try:
                    from pymongo import MongoClient
                    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=500)
                    client.server_info()
                    self.client = client
                    self.db = client[DB_NAME]
                    self._is_live_mongo = True
                    print("\n" + "=" * 60)
                    print(">>> [DATABASE STATUS]: db connected successfully! (Local MongoDB)")
                    print(f">>> Database Name: '{DB_NAME}'")
                    print("=" * 60 + "\n")
                    logger.info(f"Connected to live local MongoDB ({DB_NAME})")
                    return
                except Exception as e:
                    logger.info(f"Failed to connect to local MongoDB: {e}")

            print("\n" + "=" * 60)
            print(">>> [DATABASE STATUS]: not connected to MongoDB!")
            print(">>> No local MongoDB detected on port 27017.")
            print(">>> Running in offline zero-dependency embedded mode.")
            print("=" * 60 + "\n")

        logger.info("Using embedded zero-dependency offline document store.")
        self._is_live_mongo = False
        self.db = OfflineDocumentStore()

    @property
    def is_live_mongo(self) -> bool:
        return self._is_live_mongo

    def get_collection(self, name: str):
        if self._is_live_mongo:
            return MongoCollectionWrapper(self.db[name])
        return self.db[name]

    @property
    def wallets(self):
        return self.get_collection("wallets")

    @property
    def transactions(self):
        return self.get_collection("transactions")

    @property
    def flags(self):
        return self.get_collection("flags")

    @property
    def graph_edges(self):
        return self.get_collection("graph_edges")

    @property
    def clusters(self):
        return self.get_collection("clusters")

    def reset_all(self):
        """Clears all collections for fresh ingestion."""
        for col_name in ["wallets", "transactions", "flags", "graph_edges", "clusters"]:
            col = self.get_collection(col_name)
            col.delete_many({})


db_manager = DatabaseManager()
