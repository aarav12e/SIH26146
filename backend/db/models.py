from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class TransactionModel(BaseModel):
    txid: str
    timestamp: Optional[Any] = None
    src_ip: Optional[str] = None
    dst_ip: Optional[str] = None
    src_port: Optional[int] = None
    dst_port: Optional[int] = None
    input_addresses: List[str] = Field(default_factory=list)
    output_addresses: List[str] = Field(default_factory=list)
    input_amounts: List[float] = Field(default_factory=list)
    output_amounts: List[float] = Field(default_factory=list)
    geo_country: Optional[str] = "Unknown"
    geo_asn: Optional[str] = "Unknown"
    geo_city: Optional[str] = None
    chain_flag: Optional[Dict[str, Any]] = None
    mix_flag: Optional[Dict[str, Any]] = None

class WalletFeatures(BaseModel):
    fan_in: int = 0
    fan_out: int = 0
    fan_ratio: float = 1.0
    velocity: float = 0.0
    amount_mean: float = 0.0
    amount_variance: float = 0.0
    amount_sum: float = 0.0
    round_number_freq: float = 0.0
    ip_diversity: int = 1
    degree_centrality: float = 0.0
    betweenness_centrality: float = 0.0

class WalletModel(BaseModel):
    wallet_address: str
    entity_id: Optional[str] = "1"
    features: Optional[WalletFeatures] = None
    anomaly_score: float = 0.0
    risk_score: float = 0.0
    is_flagged: bool = False
    is_peel: bool = False
    peel_length: int = 0
    associated_ips: List[str] = Field(default_factory=list)
    associated_asns: List[str] = Field(default_factory=list)
    embedding_neighbors: List[str] = Field(default_factory=list)

class FlagModel(BaseModel):
    flagged_id: str
    target_type: str = "wallet"
    anomaly_score: float = 0.0
    risk_score: float = 0.0
    entity_cluster_id: str = "1"
    is_peel: bool = False
    reasons: List[str] = Field(default_factory=list)
    summary: str = ""
    associated_ips: List[str] = Field(default_factory=list)
    associated_asns: List[str] = Field(default_factory=list)

class GraphEdgeModel(BaseModel):
    source: str
    target: str
    type: str = "sent"  # 'sent', 'received', 'originated_from'
    weight: float = 1.0
    txid: Optional[str] = None
    amount: Optional[float] = None
    timestamp: Optional[Any] = None
