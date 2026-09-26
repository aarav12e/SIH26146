import csv
import json
import xml.etree.ElementTree as ET
import xml.dom.minidom as minidom
import random
import datetime
from pathlib import Path

def generate_synthetic_data(output_dir: Path):
    output_dir.mkdir(parents=True, exist_ok=True)
    random.seed(42)

    base_time = datetime.datetime(2026, 9, 25, 10, 0, 0, tzinfo=datetime.timezone.utc)
    transactions = []

    # Known normal entities
    normal_wallets = [f"bc1q_norm_{i:04d}" for i in range(1, 25)]
    normal_ips = [
        ("115.112.45.12", "IN", "AS4755"),
        ("89.208.29.50", "DE", "AS24940"),
        ("34.120.55.91", "US", "AS15169"),
        ("51.15.10.22", "FR", "AS12876"),
        ("103.251.167.88", "IN", "AS133982")
    ]

    # --- Normal Transactions (staggered, random amounts, 1-to-1 or 2-to-2) ---
    for i in range(35):
        tx_time = base_time + datetime.timedelta(minutes=i * 12 + random.randint(1, 8))
        src_w = random.choice(normal_wallets)
        dst_w = random.choice([w for w in normal_wallets if w != src_w])
        ip_info = random.choice(normal_ips)
        amt = round(random.uniform(0.015, 2.45), 5)
        fee = round(random.uniform(0.0001, 0.0005), 6)

        transactions.append({
            "txid": f"tx_norm_{i:04d}_{hex(random.randint(0x1000, 0xffff))[2:]}",
            "timestamp": tx_time.isoformat(),
            "src_ip": ip_info[0],
            "dst_ip": "104.16.89.20",
            "src_port": random.randint(30000, 60000),
            "dst_port": 8333,
            "input_addresses": [src_w],
            "output_addresses": [dst_w],
            "input_amounts": [amt + fee],
            "output_amounts": [amt],
            "fee": fee,
            "script_type": "witness_v0_keyhash",
            "geo_country": ip_info[1],
            "asn": ip_info[2]
        })

    # --- Pattern 1: Peeling Chain (Classic Illicit Dispersal) ---
    # One wallet peeling off illicit funds: 1 main input, 1 peeled payment, 1 change address repeatedly
    peeling_attacker = "bc1q_peel_master_darknet"
    peeling_change = peeling_attacker
    current_amt = 48.5000
    peel_ips = [
        ("185.220.100.44", "SC", "AS208323"),  # Tor Exit
        ("185.220.100.89", "SC", "AS208323"),
        ("185.193.88.12", "RU", "AS48282"),    # Bulletproof
        ("198.51.100.90", "PA", "AS52468")     # Offshore Panama
    ]

    for p in range(8):
        tx_time = base_time + datetime.timedelta(minutes=40 + p * 6)
        peel_amt = round(random.uniform(2.5, 4.0), 4)
        fee = 0.0004
        change_amt = round(current_amt - peel_amt - fee, 4)
        current_amt = change_amt
        dest_sink = f"bc1q_peel_sink_{p:03d}"
        next_change = f"bc1q_peel_chg_{p:03d}" if p < 7 else "bc1q_mixer_input_001"
        ip_info = peel_ips[p % len(peel_ips)]

        transactions.append({
            "txid": f"tx_peel_{p:03d}_{hex(random.randint(0x1000, 0xffff))[2:]}",
            "timestamp": tx_time.isoformat(),
            "src_ip": ip_info[0],
            "dst_ip": "141.98.11.2",
            "src_port": random.randint(40000, 50000),
            "dst_port": 8333,
            "input_addresses": [peeling_change],
            "output_addresses": [dest_sink, next_change],
            "input_amounts": [round(peel_amt + change_amt + fee, 4)],
            "output_amounts": [peel_amt, change_amt],
            "fee": fee,
            "script_type": "P2SH",
            "geo_country": ip_info[1],
            "asn": ip_info[2]
        })
        peeling_change = next_change

    # --- Pattern 2: High-Velocity Coin Mixer Layering ---
    mixer_hub = "bc1q_mixer_layering_core"
    mixer_ips = [
        ("185.193.88.55", "RU", "AS48282"),
        ("194.26.29.101", "NL", "AS200000"),
        ("141.98.34.12", "BZ", "AS49870")
    ]
    for m in range(12):
        tx_time = base_time + datetime.timedelta(minutes=90 + m * 2)  # High velocity: every 2 minutes
        in_addr = f"bc1q_mix_in_{m:03d}"
        out_addrs = [f"bc1q_mix_clean_{m}_{k}" for k in range(3)]
        amt_each = 1.0  # Suspicious round amount
        ip_info = mixer_ips[m % len(mixer_ips)]

        transactions.append({
            "txid": f"tx_mix_{m:03d}_{hex(random.randint(0x1000, 0xffff))[2:]}",
            "timestamp": tx_time.isoformat(),
            "src_ip": ip_info[0],
            "dst_ip": "193.32.160.44",
            "src_port": random.randint(45000, 60000),
            "dst_port": 8333,
            "input_addresses": [in_addr, mixer_hub],
            "output_addresses": out_addrs,
            "input_amounts": [1.5002, 1.5002],
            "output_amounts": [1.0, 1.0, 1.0],
            "fee": 0.0004,
            "script_type": "P2WSH",
            "geo_country": ip_info[1],
            "asn": ip_info[2]
        })

    # --- Pattern 3: Structuring / Smurfing with Round Numbers & Rapid IP Switching ---
    smurf_master = "bc1q_smurf_structuring_ring"
    smurf_targets = [f"bc1q_smurf_mule_{j:02d}" for j in range(10)]
    smurf_ips = [
        ("185.220.100.12", "SC", "AS208323"),
        ("198.51.100.33", "PA", "AS52468"),
        ("45.154.255.88", "CY", "AS58061"),
        ("193.32.160.10", "RO", "AS60117"),
        ("185.193.88.99", "RU", "AS48282")
    ]
    for s in range(10):
        tx_time = base_time + datetime.timedelta(minutes=150 + s * 3)
        target = smurf_targets[s]
        ip_info = smurf_ips[s % len(smurf_ips)]
        round_amt = float(random.choice([5.0, 10.0, 2.0, 20.0]))

        transactions.append({
            "txid": f"tx_smurf_{s:03d}_{hex(random.randint(0x1000, 0xffff))[2:]}",
            "timestamp": tx_time.isoformat(),
            "src_ip": ip_info[0],
            "dst_ip": "185.193.88.1",
            "src_port": random.randint(35000, 55000),
            "dst_port": 8333,
            "input_addresses": [smurf_master],
            "output_addresses": [target],
            "input_amounts": [round_amt + 0.0003],
            "output_amounts": [round_amt],
            "fee": 0.0003,
            "script_type": "P2PKH",
            "geo_country": ip_info[1],
            "asn": ip_info[2]
        })

    # Write CSV
    csv_file = output_dir / "synthetic_bitcoin_traffic.csv"
    fieldnames = [
        "timestamp", "src_ip", "dst_ip", "src_port", "dst_port", "txid",
        "input_addresses", "output_addresses", "input_amounts", "output_amounts",
        "script_type", "fee", "geo_country", "asn"
    ]
    with open(csv_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for tx in transactions:
            row = dict(tx)
            row["input_addresses"] = ";".join(tx["input_addresses"])
            row["output_addresses"] = ";".join(tx["output_addresses"])
            row["input_amounts"] = ";".join(str(x) for x in tx["input_amounts"])
            row["output_amounts"] = ";".join(str(x) for x in tx["output_amounts"])
            writer.writerow(row)

    # Write JSON
    json_file = output_dir / "synthetic_bitcoin_traffic.json"
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(transactions, f, indent=2)

    # Write XML
    xml_file = output_dir / "synthetic_bitcoin_traffic.xml"
    root = ET.Element("transactions")
    for tx in transactions:
        tx_elem = ET.SubElement(root, "transaction")
        for k, v in tx.items():
            child = ET.SubElement(tx_elem, k)
            if isinstance(v, list):
                child.text = ";".join(str(x) for x in v)
            else:
                child.text = str(v)
    xml_str = minidom.parseString(ET.tostring(root)).toprettyxml(indent="  ")
    with open(xml_file, "w", encoding="utf-8") as f:
        f.write(xml_str)

    print(f"Generated synthetic datasets in {output_dir}: CSV ({len(transactions)} rows), JSON, and XML.")

if __name__ == "__main__":
    generate_synthetic_data(Path(__file__).parent / "data")
