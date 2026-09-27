# GeoIP Database Directory (MaxMind .mmdb)

This directory is configured to hold optional **MaxMind GeoLite2 binary database (`.mmdb`)** files for full-spectrum IP geolocation and Autonomous System (ASN) threat enrichment.

---

### Is this folder required?
**NO, it is 100% optional.**

The NTRO Bitcoin Forensics engine comes with a **built-in high-speed offline CIDR intelligence lookup table** in `backend/ingestion/geoip.py`. 
- Even if this folder is empty, the system successfully resolves IPs (including Cloudflare, Google Cloud, AWS, Tor exit nodes, Bulletproof hosting, Indian telecom ISPs, etc.) **without making any external network requests**.

---

### If you wish to install the full 4-million IP MaxMind database:
1. Create a free account at [MaxMind GeoLite2](https://www.maxmind.com/en/geolite2/signup).
2. Download the following two binary files (extract `.tar.gz` if needed):
   - **`GeoLite2-City.mmdb`** (Resolves IP to City, Country, Latitude/Longitude)
   - **`GeoLite2-ASN.mmdb`** (Resolves IP to ISP & Autonomous System Number)
3. Copy both `.mmdb` files directly into this directory:
   ```
   data/geoip/
   ├── README.md
   ├── GeoLite2-City.mmdb   (Optional)
   └── GeoLite2-ASN.mmdb    (Optional)
   ```
4. Restart the backend server (`uvicorn app.main:app --port 8000 --reload`). 
   The server will automatically detect and load the full MaxMind database into memory!
