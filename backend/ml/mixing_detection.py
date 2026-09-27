import logging
import numpy as np
from typing import Dict, Any, List
from backend.db.mongo_client import db_manager
from backend.config import COINJOIN_MIN_INPUTS, COINJOIN_MIN_OUTPUTS, COINJOIN_STDDEV_EPSILON

logger = logging.getLogger("bitcoin_forensics.ml.mixing")

def detect_coinjoin_mixing(transactions: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """
    NTRO §6.4: CoinJoin / Mixer Detection via Per-Transaction Rule.
    Flags transactions with multi-party inputs and equal-denomination outputs
    (standard pattern for Wasabi, Whirlpool, JoinMarket).
    """
    mix_flags = {}

    for tx in transactions:
        txid = str(tx.get("txid") or tx.get("_id"))
        in_addrs = tx.get("input_addresses") or []
        out_addrs = tx.get("output_addresses") or []
        out_amts = tx.get("output_amounts") or []

        num_in = len(in_addrs)
        num_out = len(out_addrs)

        # Check multi-input, multi-output condition
        if num_in >= COINJOIN_MIN_INPUTS and num_out >= COINJOIN_MIN_OUTPUTS and len(out_amts) >= 2:
            out_std = float(np.std([float(a) for a in out_amts]))
            
            # Equal-denomination test
            if out_std < COINJOIN_STDDEV_EPSILON:
                flag_data = {
                    "is_coinjoin_like": True,
                    "participants_count": num_in,
                    "equal_outputs_count": num_out,
                    "denomination_std": round(out_std, 5),
                    "mix_pattern": "Equal-denomination CoinJoin mixing pool"
                }
                mix_flags[txid] = flag_data

                db_manager.transactions.update_one(
                    {"txid": txid},
                    {"$set": {"mix_flag": flag_data}}
                )

    logger.info(f"CoinJoin Detection: Identified {len(mix_flags)} mixer transactions.")
    return mix_flags
