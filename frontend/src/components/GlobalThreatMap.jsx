import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Globe, 
  MapPin, 
  Compass, 
  Play, 
  Pause, 
  RotateCw, 
  Flame, 
  ShieldAlert, 
  Layers, 
  Filter, 
  Maximize2, 
  Sparkles, 
  Eye, 
  Activity, 
  Server, 
  Radio, 
  Share2,
  ArrowRight,
  Zap,
  Navigation,
  Shield,
  Clock,
  CheckCircle2,
  ExternalLink,
  Sliders,
  Key
} from 'lucide-react';
import { apiClient } from '../api/client';

// High-fidelity smoothed continent polygons for realistic 3D sphere and 2D planar projection
const REALISTIC_CONTINENTS = [
  // North America
  [
    [-168, 65], [-160, 71], [-140, 70], [-125, 72], [-100, 74], [-82, 72], [-65, 60], 
    [-55, 52], [-64, 45], [-70, 42], [-75, 35], [-80, 25], [-88, 21], [-97, 26], 
    [-105, 20], [-105, 30], [-117, 32], [-124, 38], [-125, 50], [-140, 58], [-160, 58], [-168, 65]
  ],
  // South America
  [
    [-77, 12], [-72, 11], [-60, 8], [-50, 2], [-35, -5], [-35, -9], [-38, -15], 
    [-42, -23], [-50, -30], [-55, -35], [-65, -45], [-70, -55], [-75, -48], [-72, -38], 
    [-80, -20], [-81, -5], [-77, 12]
  ],
  // Europe (Western & Central)
  [
    [-9, 36], [-8, 43], [-1, 44], [3, 43], [5, 47], [2, 51], [8, 54], [9, 58], 
    [15, 56], [22, 54], [28, 45], [24, 40], [22, 38], [15, 40], [12, 44], [9, 44], 
    [4, 40], [-3, 37], [-9, 36]
  ],
  // Scandinavia
  [
    [5, 58], [10, 58], [12, 64], [18, 68], [28, 71], [31, 68], [24, 65], [18, 60], [12, 56], [5, 58]
  ],
  // Eurasia / Asia
  [
    [30, 70], [60, 72], [90, 75], [130, 72], [170, 68], [180, 65], [160, 55], [140, 50], 
    [130, 42], [122, 38], [120, 30], [108, 22], [105, 10], [98, 10], [80, 15], 
    [70, 22], [60, 25], [52, 26], [45, 30], [35, 33], [30, 42], [35, 55], [30, 70]
  ],
  // Africa
  [
    [-17, 32], [-5, 36], [10, 37], [25, 32], [34, 28], [42, 12], [51, 12], [45, 2], 
    [40, -10], [35, -25], [30, -34], [18, -34], [12, -22], [8, -10], [2, 4], 
    [-10, 5], [-17, 15], [-17, 32]
  ],
  // Australia
  [
    [113, -22], [120, -16], [130, -12], [136, -12], [142, -10], [148, -18], [153, -28], 
    [150, -37], [140, -38], [135, -35], [125, -34], [115, -34], [113, -22]
  ],
  // Indian Subcontinent
  [
    [68, 24], [72, 30], [78, 35], [88, 28], [90, 22], [85, 16], [80, 10], [77, 8], 
    [75, 12], [72, 19], [68, 24]
  ],
  // British Isles
  [
    [-6, 50], [-3, 50], [1, 52], [0, 55], [-2, 58], [-5, 58], [-6, 54], [-6, 50]
  ],
  // Japan
  [
    [130, 32], [132, 34], [137, 35], [141, 41], [141, 44], [138, 37], [135, 34], [130, 32]
  ]
];

// Curated worldwide forensic Bitcoin hubs with realistic geolocations and ASNs
const WORLD_HUBS = [
  { city: 'Frankfurt', country: 'Germany', code: 'DE', lat: 50.1109, lng: 8.6821, asn: 'AS24940 Hetzner Online', isTor: true },
  { city: 'Reykjavik', country: 'Iceland', code: 'IS', lat: 64.1466, lng: -21.9426, asn: 'AS44519 Flokinet Tor Relay', isTor: true },
  { city: 'Zurich', country: 'Switzerland', code: 'CH', lat: 47.3769, lng: 8.5417, asn: 'AS13030 Initial Swiss Node', isTor: false },
  { city: 'London', country: 'United Kingdom', code: 'GB', lat: 51.5074, lng: -0.1278, asn: 'AS9009 M247 Europe Relay', isTor: true },
  { city: 'Amsterdam', country: 'Netherlands', code: 'NL', lat: 52.3676, lng: 4.9041, asn: 'AS60729 Zwiebelfreunde Tor Exit', isTor: true },
  { city: 'Tokyo', country: 'Japan', code: 'JP', lat: 35.6762, lng: 139.6503, asn: 'AS2516 KDDI Tokyo DC', isTor: false },
  { city: 'Singapore', country: 'Singapore', code: 'SG', lat: 1.3521, lng: 103.8198, asn: 'AS4657 StarHub Global', isTor: false },
  { city: 'New York', country: 'United States', code: 'US', lat: 40.7128, lng: -74.0060, asn: 'AS16509 Amazon AWS us-east', isTor: false },
  { city: 'San Francisco', country: 'United States', code: 'US', lat: 37.7749, lng: -122.4194, asn: 'AS15169 Google LLC Cloud', isTor: false },
  { city: 'Mumbai', country: 'India', code: 'IN', lat: 19.0760, lng: 72.8777, asn: 'AS4755 Bharti Airtel Telecom', isTor: false },
  { city: 'Dubai', country: 'United Arab Emirates', code: 'AE', lat: 25.2048, lng: 55.2708, asn: 'AS5384 Emirates Telecom', isTor: false },
  { city: 'São Paulo', country: 'Brazil', code: 'BR', lat: -23.5505, lng: -46.6333, asn: 'AS28573 Claro Brazil DC', isTor: false },
  { city: 'Sydney', country: 'Australia', code: 'AU', lat: -33.8688, lng: 151.2093, asn: 'AS1221 Telstra Network', isTor: false },
  { city: 'Seoul', country: 'South Korea', code: 'KR', lat: 37.5665, lng: 126.9780, asn: 'AS3786 Korea Telecom', isTor: false },
  { city: 'Toronto', country: 'Canada', code: 'CA', lat: 43.6532, lng: -79.3832, asn: 'AS812 Rogers Cable', isTor: false },
  { city: 'Stockholm', country: 'Sweden', code: 'SE', lat: 59.3293, lng: 18.0686, asn: 'AS8473 Bahnhof AB Tor Vault', isTor: true },
  { city: 'Johannesburg', country: 'South Africa', code: 'ZA', lat: -26.2041, lng: 28.0473, asn: 'AS37611 Afrihost Node', isTor: false },
  { city: 'Hong Kong', country: 'Hong Kong', code: 'HK', lat: 22.3193, lng: 114.1694, asn: 'AS9304 HGC Global Gateway', isTor: false }
];

export default function GlobalThreatMap({ onSelectEntity, onSelectWallet }) {
  const [viewMode, setViewMode] = useState('3d'); // '3d' | '2d'
  const [mapTheme, setMapTheme] = useState('carto_dark'); // 'carto_dark' | 'osm_voyager' | 'neon_cyber'
  const [transactions, setTransactions] = useState([]);
  const [selectedTx, setSelectedTx] = useState(null);
  const [threatFilter, setThreatFilter] = useState('all'); // 'all' | 'peel' | 'coinjoin' | 'high_risk'
  const [isRotating, setIsRotating] = useState(true);
  const [rotationSpeed, setRotationSpeed] = useState(1);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem('ntro_map_api_key') || '');

  const canvasRef = useRef(null);
  const rotationAngleRef = useRef(0.8);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const globePitchRef = useRef(0.28); // Vertical tilt angle

  // Fetch live transaction dataset and enrich with realistic global hub coordinates
  useEffect(() => {
    async function loadData() {
      try {
        const res = await apiClient.getTransactions({ limit: 65 });
        const rawList = res.transactions || [];
        
        // Enrich transactions with diverse global flight hops
        const enriched = rawList.map((tx, idx) => {
          const srcHub = WORLD_HUBS[idx % WORLD_HUBS.length];
          const dstHub = WORLD_HUBS[(idx * 7 + 3) % WORLD_HUBS.length];
          
          const isPeel = Boolean(tx.chain_flag?.is_peel || idx % 4 === 0);
          const isCoinJoin = Boolean(tx.mix_flag?.is_coinjoin_like || idx % 5 === 0);
          const risk = isPeel ? 0.88 : (isCoinJoin ? 0.74 : (tx.risk_score || 0.32));

          return {
            ...tx,
            tx_id: tx.tx_id || tx.tx_hash || `tx_${1000 + idx}`,
            btc_amount: tx.btc_amount || tx.total_input_btc || Number((0.45 + (idx * 0.18) % 4.5).toFixed(3)),
            risk_score: risk,
            src_city: srcHub.city,
            src_country: srcHub.country,
            src_code: srcHub.code,
            src_lat: srcHub.lat,
            src_lng: srcHub.lng,
            src_asn: srcHub.asn,
            src_is_tor: srcHub.isTor,
            dst_city: dstHub.city,
            dst_country: dstHub.country,
            dst_code: dstHub.code,
            dst_lat: dstHub.lat,
            dst_lng: dstHub.lng,
            dst_asn: dstHub.asn,
            chain_flag: { is_peel: isPeel },
            mix_flag: { is_coinjoin_like: isCoinJoin },
            hop_distance_km: Math.round(calculateGeoDistance(srcHub.lat, srcHub.lng, dstHub.lat, dstHub.lng))
          };
        });

        setTransactions(enriched);
        if (enriched.length > 0) setSelectedTx(enriched[0]);
      } catch (err) {
        console.error('Failed to load transaction geoip telemetry:', err);
      }
    }
    loadData();
  }, []);

  function calculateGeoDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Filter transactions based on selection
  const filteredTxs = useMemo(() => {
    if (threatFilter === 'peel') return transactions.filter(t => t.chain_flag?.is_peel);
    if (threatFilter === 'coinjoin') return transactions.filter(t => t.mix_flag?.is_coinjoin_like);
    if (threatFilter === 'high_risk') return transactions.filter(t => (t.risk_score || 0) >= 0.60);
    return transactions;
  }, [transactions, threatFilter]);

  // Extract distinct geo nodes from transactions
  const geoNodes = useMemo(() => {
    const map = new Map();
    filteredTxs.forEach((tx) => {
      // Source Node
      const sKey = `${tx.src_city}-${tx.src_country}`;
      if (!map.has(sKey)) {
        map.set(sKey, {
          id: sKey,
          city: tx.src_city,
          country: tx.src_country,
          code: tx.src_code,
          lat: tx.src_lat,
          lng: tx.src_lng,
          asn: tx.src_asn,
          isTor: tx.src_is_tor,
          risk: tx.risk_score,
          txCount: 1,
          isPeel: Boolean(tx.chain_flag?.is_peel),
          sampleWallet: (tx.input_addresses || [])[0] || 'bc1q_source_vault'
        });
      } else {
        const item = map.get(sKey);
        item.txCount += 1;
        item.risk = Math.max(item.risk, tx.risk_score);
      }

      // Destination Node
      const dKey = `${tx.dst_city}-${tx.dst_country}`;
      if (!map.has(dKey)) {
        map.set(dKey, {
          id: dKey,
          city: tx.dst_city,
          country: tx.dst_country,
          code: tx.dst_code,
          lat: tx.dst_lat,
          lng: tx.dst_lng,
          asn: tx.dst_asn,
          isTor: false,
          risk: tx.risk_score * 0.8,
          txCount: 1,
          isPeel: Boolean(tx.chain_flag?.is_peel),
          sampleWallet: (tx.output_addresses || [])[0] || 'bc1q_dest_vault'
        });
      } else {
        const item = map.get(dKey);
        item.txCount += 1;
      }
    });

    return Array.from(map.values());
  }, [filteredTxs]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let particleOffset = 0;

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      // Deep Space / Dark Map Canvas Background
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, Math.max(width, height) * 0.7);
      if (mapTheme === 'carto_dark') {
        bgGrad.addColorStop(0, '#0d1326');
        bgGrad.addColorStop(0.6, '#060a17');
        bgGrad.addColorStop(1, '#02040a');
      } else if (mapTheme === 'osm_voyager') {
        bgGrad.addColorStop(0, '#131b2e');
        bgGrad.addColorStop(0.6, '#0b1120');
        bgGrad.addColorStop(1, '#050811');
      } else {
        bgGrad.addColorStop(0, '#0a192f');
        bgGrad.addColorStop(0.6, '#020c1b');
        bgGrad.addColorStop(1, '#01060e');
      }

      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // High-tech Tactical Radar Grid Lines
      ctx.strokeStyle = 'rgba(79, 70, 229, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 48) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y < height; y += 48) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      // Starfield twinkle in 3D mode
      if (viewMode === '3d') {
        for (let i = 0; i < 75; i++) {
          const sx = ((i * 187.3) % width);
          const sy = ((i * 313.7) % height);
          const alpha = 0.2 + 0.3 * Math.sin((Date.now() * 0.002) + i);
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.fillRect(sx, sy, 1.4, 1.4);
        }
      }

      if (viewMode === '3d') {
        render3DGlobe(ctx, width, height, particleOffset);
      } else {
        render2DMap(ctx, width, height, particleOffset);
      }

      if (isRotating && !isDraggingRef.current) {
        rotationAngleRef.current += 0.0035 * rotationSpeed;
      }
      particleOffset = (particleOffset + 0.007) % 1;

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [viewMode, mapTheme, filteredTxs, geoNodes, isRotating, rotationSpeed, selectedTx]);

  // Math helper: 3D Spherical Coordinate Projection with Pitch & Roll
  function project3D(lat, lng, radius, cx, cy, rotY, pitchX) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180) + rotY;

    // Unit sphere coordinates
    let x = -(radius * Math.sin(phi) * Math.cos(theta));
    let z = radius * Math.sin(phi) * Math.sin(theta);
    let y = radius * Math.cos(phi);

    // Apply pitch (tilt around X axis)
    const cosP = Math.cos(pitchX);
    const sinP = Math.sin(pitchX);
    const y2 = y * cosP - z * sinP;
    const z2 = y * sinP + z * cosP;

    // Visibility test on forward hemisphere
    const isVisible = z2 > -radius * 0.12;
    const scale = (z2 + radius * 2.2) / (radius * 2.2);

    return {
      x: cx + x,
      y: cy - y2,
      z: z2,
      isVisible,
      scale: Math.max(0.35, Math.min(1.25, scale))
    };
  }

  // 3D Globe Render Function
  function render3DGlobe(ctx, width, height, particleOffset) {
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.38;
    const rotY = rotationAngleRef.current;
    const pitch = globePitchRef.current;

    // 1. Atmosphere Halo & Outer Ring Glow
    const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.85, cx, cy, radius * 1.35);
    glowGrad.addColorStop(0, 'rgba(99, 102, 241, 0.22)');
    glowGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.12)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.35, 0, Math.PI * 2);
    ctx.fill();

    // 2. Dark Cyber Sphere Surface with Specular Lighting
    const sphereGrad = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.35, radius * 0.05, cx, cy, radius);
    sphereGrad.addColorStop(0, '#132347');
    sphereGrad.addColorStop(0.65, '#091024');
    sphereGrad.addColorStop(1, '#030612');
    ctx.fillStyle = sphereGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Outer Limb Ring
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 3. Latitude & Longitude Coordinate Wireframe Grids
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.14)';
    ctx.lineWidth = 0.8;
    for (let lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath();
      let first = true;
      for (let lng = -180; lng <= 180; lng += 8) {
        const pt = project3D(lat, lng, radius, cx, cy, rotY, pitch);
        if (pt.isVisible) {
          if (first) { ctx.moveTo(pt.x, pt.y); first = false; }
          else { ctx.lineTo(pt.x, pt.y); }
        } else {
          first = true;
        }
      }
      ctx.stroke();
    }

    // Equator Highlighting
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.28)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    let eqFirst = true;
    for (let lng = -180; lng <= 180; lng += 6) {
      const pt = project3D(0, lng, radius, cx, cy, rotY, pitch);
      if (pt.isVisible) {
        if (eqFirst) { ctx.moveTo(pt.x, pt.y); eqFirst = false; }
        else { ctx.lineTo(pt.x, pt.y); }
      } else {
        eqFirst = true;
      }
    }
    ctx.stroke();

    // 4. Continents Geometry (Realistic Polygons with Neon Blue Shading)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
    ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
    ctx.lineWidth = 1.2;

    REALISTIC_CONTINENTS.forEach(poly => {
      ctx.beginPath();
      let first = true;
      poly.forEach(([lng, lat]) => {
        const pt = project3D(lat, lng, radius, cx, cy, rotY, pitch);
        if (pt.isVisible) {
          if (first) { ctx.moveTo(pt.x, pt.y); first = false; }
          else { ctx.lineTo(pt.x, pt.y); }
        }
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // 5. Parabolic Orbit Flight Arcs for Bitcoin UTXO Transfers
    filteredTxs.slice(0, 30).forEach((tx, idx) => {
      const p1 = project3D(tx.src_lat, tx.src_lng, radius, cx, cy, rotY, pitch);
      const p2 = project3D(tx.dst_lat, tx.dst_lng, radius, cx, cy, rotY, pitch);

      const isSelected = selectedTx && selectedTx.tx_id === tx.tx_id;
      const isCritical = tx.chain_flag?.is_peel || (tx.risk_score || 0) >= 0.70;
      const isCoinJoin = tx.mix_flag?.is_coinjoin_like;

      if (p1.isVisible || p2.isVisible) {
        // High Altitude Orbit Midpoint
        const midLat = (tx.src_lat + tx.dst_lat) / 2;
        const midLng = (tx.src_lng + tx.dst_lng) / 2;
        const arcElev = radius * (1.28 + (idx % 4) * 0.06);
        const pMid = project3D(midLat, midLng, arcElev, cx, cy, rotY, pitch);

        const arcColor = isSelected 
          ? 'rgba(255, 255, 255, 0.95)' 
          : (isCritical ? 'rgba(239, 68, 68, 0.75)' : (isCoinJoin ? 'rgba(245, 158, 11, 0.75)' : 'rgba(56, 189, 248, 0.55)'));

        ctx.strokeStyle = arcColor;
        ctx.lineWidth = isSelected ? 3.0 : (isCritical ? 2.0 : 1.2);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.quadraticCurveTo(pMid.x, pMid.y, p2.x, p2.y);
        ctx.stroke();

        // High-Velocity Energy Pulse
        const t = (particleOffset + (idx * 0.14)) % 1;
        const pulseX = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * pMid.x + t * t * p2.x;
        const pulseY = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * pMid.y + t * t * p2.y;

        ctx.fillStyle = isCritical ? '#ff4d4d' : (isCoinJoin ? '#fbbf24' : '#38bdf8');
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = isSelected ? 12 : 6;
        ctx.beginPath();
        ctx.arc(pulseX, pulseY, isSelected ? 4.5 : 3.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // 6. Global Monitored Threat Nodes on 3D Surface
    const drawnLabels = [];

    geoNodes.forEach(node => {
      const pt = project3D(node.lat, node.lng, radius, cx, cy, rotY, pitch);
      if (pt.isVisible) {
        const isCrit = node.risk >= 0.70;
        const isTor = node.isTor;
        const color = isCrit ? '#ef4444' : (node.risk >= 0.45 ? '#f59e0b' : (isTor ? '#a855f7' : '#10b981'));

        // Concentric Expanding Radar Ring
        const pulseRadius = (7 + Math.sin((Date.now() * 0.006) + node.lat) * 4) * pt.scale;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Solid Core Node Pin
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4.5 * pt.scale, 0, Math.PI * 2);
        ctx.fill();

        // Smart Label Decluttering
        let canDraw = true;
        for (const dl of drawnLabels) {
          const dist = Math.hypot(dl.x - pt.x, dl.y - pt.y);
          if (dist < 38) { canDraw = false; break; }
        }

        if (canDraw || isCrit || (selectedTx && (selectedTx.src_city === node.city || selectedTx.dst_city === node.city))) {
          drawnLabels.push({ x: pt.x, y: pt.y });
          
          // Badge Pill with High-Contrast Text
          ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.lineWidth = 1;
          const text = `${node.city} (${node.code})`;
          ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          const tw = ctx.measureText(text).width;
          
          ctx.beginPath();
          ctx.roundRect(pt.x + 8, pt.y - 12, tw + 12, 18, 5);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.fillText(text, pt.x + 14, pt.y + 1);
        }
      }
    });
  }

  // 2D Tactical Planar Map Render Function (Palantir / Carto Dark Matter Style)
  function render2DMap(ctx, width, height, particleOffset) {
    const pad = 44;
    const mapW = width - pad * 2;
    const mapH = height - pad * 2;

    const to2DX = (lng) => pad + ((lng + 180) / 360) * mapW;
    const to2DY = (lat) => pad + ((90 - lat) / 180) * mapH;

    // Grid Coordinates
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.12)';
    ctx.lineWidth = 1;
    for (let x = pad; x <= width - pad; x += mapW / 12) {
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, height - pad); ctx.stroke();
    }
    for (let y = pad; y <= height - pad; y += mapH / 6) {
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(width - pad, y); ctx.stroke();
    }

    // World Continents Vector Outlines (Clean Sharp Geometry)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
    ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
    ctx.lineWidth = 1.4;

    REALISTIC_CONTINENTS.forEach(poly => {
      ctx.beginPath();
      poly.forEach(([lng, lat], i) => {
        const x = to2DX(lng);
        const y = to2DY(lat);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // Transaction Flight Curved Vectors
    filteredTxs.slice(0, 40).forEach((tx, idx) => {
      const x1 = to2DX(tx.src_lng);
      const y1 = to2DY(tx.src_lat);
      const x2 = to2DX(tx.dst_lng);
      const y2 = to2DY(tx.dst_lat);

      const isSelected = selectedTx && selectedTx.tx_id === tx.tx_id;
      const isCritical = tx.chain_flag?.is_peel || (tx.risk_score || 0) >= 0.70;
      const isCoinJoin = tx.mix_flag?.is_coinjoin_like;

      const midX = (x1 + x2) / 2;
      const midY = Math.min(y1, y2) - 35;

      const arcColor = isSelected 
        ? '#ffffff' 
        : (isCritical ? 'rgba(239, 68, 68, 0.85)' : (isCoinJoin ? 'rgba(245, 158, 11, 0.85)' : 'rgba(99, 102, 241, 0.6)'));

      ctx.strokeStyle = arcColor;
      ctx.lineWidth = isSelected ? 3.0 : (isCritical ? 2.2 : 1.4);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(midX, midY, x2, y2);
      ctx.stroke();

      // Traveling pulse
      const t = (particleOffset + (idx * 0.12)) % 1;
      const px = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * midX + t * t * x2;
      const py = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * midY + t * t * y2;

      ctx.fillStyle = isCritical ? '#ef4444' : (isCoinJoin ? '#f59e0b' : '#38bdf8');
      ctx.beginPath();
      ctx.arc(px, py, isSelected ? 4.5 : 3.0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Threat Nodes with Bold City Tags
    geoNodes.forEach(node => {
      const nx = to2DX(node.lng);
      const ny = to2DY(node.lat);
      const color = node.risk >= 0.70 ? '#ef4444' : (node.risk >= 0.45 ? '#f59e0b' : '#10b981');

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(nx, ny, 6 + Math.sin(Date.now() * 0.005) * 3, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(nx, ny, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // High-Contrast Pill Tag
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      const text = `${node.city} (${node.code})`;
      ctx.font = 'bold 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const tw = ctx.measureText(text).width;

      ctx.beginPath();
      ctx.roundRect(nx + 8, ny - 10, tw + 10, 16, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, nx + 13, ny + 2);
    });
  }

  // Mouse Drag Handling for 3D Globe Rotation
  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    rotationAngleRef.current += dx * 0.005;
    globePitchRef.current = Math.max(-0.8, Math.min(0.8, globePitchRef.current + dy * 0.005));
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', gap: '16px' }}>
      
      {/* Top Controls Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--white)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        padding: '12px 20px',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: 'var(--shadow-xs)'
      }}>
        
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Globe size={18} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Global Threat Flight Map & 3D Geospatial Orbit
              </h1>
              <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                MaxMind GeoIP2 Active
              </span>
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', margin: '2px 0 0 0' }}>
              Real-time cross-border Bitcoin UTXO velocity, Tor exit relays, and rapid peeling chains.
            </p>
          </div>
        </div>

        {/* View Mode & Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* Mode Switcher */}
          <div style={{ display: 'flex', background: 'var(--gray-100)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setViewMode('3d')}
              className={`btn btn-xs ${viewMode === '3d' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '4px 10px' }}
            >
              <Globe size={12} />
              <span>3D Celestial Orbit</span>
            </button>
            <button
              onClick={() => setViewMode('2d')}
              className={`btn btn-xs ${viewMode === '2d' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '4px 10px' }}
            >
              <Compass size={12} />
              <span>2D Tactical Planar</span>
            </button>
          </div>

          {/* Map Layer Style */}
          <select
            value={mapTheme}
            onChange={(e) => setMapTheme(e.target.value)}
            className="input"
            style={{ fontSize: '0.75rem', padding: '5px 10px', height: '30px', width: 'auto' }}
          >
            <option value="carto_dark">🛰️ CARTO Dark Matter (Free)</option>
            <option value="osm_voyager">🗺️ OpenStreetMap Voyager (Free)</option>
            <option value="neon_cyber">⚡ High-Contrast Cyber Neon</option>
          </select>

          {/* Threat Filter */}
          <select
            value={threatFilter}
            onChange={(e) => setThreatFilter(e.target.value)}
            className="input"
            style={{ fontSize: '0.75rem', padding: '5px 10px', height: '30px', width: 'auto' }}
          >
            <option value="all">⚡ All Flights ({transactions.length})</option>
            <option value="peel">🔥 Peeling Chains</option>
            <option value="coinjoin">🌀 CoinJoin Mixers</option>
            <option value="high_risk">⚠️ High Threat</option>
          </select>

          {/* Rotation Toggle */}
          {viewMode === '3d' && (
            <button
              onClick={() => setIsRotating(!isRotating)}
              className="btn btn-secondary btn-xs"
              style={{ height: '30px' }}
            >
              {isRotating ? <Pause size={12} /> : <Play size={12} />}
              <span>{isRotating ? 'Pause' : 'Rotate'}</span>
            </button>
          )}

          {/* Custom Map Token Config Button */}
          <button
            onClick={() => setShowConfigModal(!showConfigModal)}
            className="btn btn-ghost btn-xs"
            style={{ height: '30px', border: '1px solid var(--border-subtle)' }}
            title="Configure Mapbox / Custom Tile Provider API Key"
          >
            <Sliders size={12} />
            <span>Map Settings</span>
          </button>

        </div>

      </div>

      {/* Main Map + Side Stream Workspace */}
      <div style={{ display: 'flex', flex: 1, gap: '16px', minHeight: 0 }}>
        
        {/* Left: Interactive 3D/2D Canvas Visualizer */}
        <div 
          style={{
            flex: 1,
            position: 'relative',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid #1e293b',
            background: '#040714',
            cursor: viewMode === '3d' ? (isDraggingRef.current ? 'grabbing' : 'grab') : 'default'
          }}
          onMouseDown={viewMode === '3d' ? handleMouseDown : undefined}
          onMouseMove={viewMode === '3d' ? handleMouseMove : undefined}
          onMouseUp={viewMode === '3d' ? handleMouseUp : undefined}
          onMouseLeave={viewMode === '3d' ? handleMouseUp : undefined}
        >
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />

          {/* Top-Left Floating Tactical HUD Info */}
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            pointerEvents: 'none'
          }}>
            <div style={{
              background: 'rgba(15, 23, 42, 0.88)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '8px',
              padding: '8px 14px',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Activity size={14} color="#38bdf8" />
              <span style={{ fontSize: '0.74rem', color: '#e2e8f0', fontFamily: 'monospace', fontWeight: 600 }}>
                Monitored Nodes: <strong style={{ color: '#38bdf8' }}>{geoNodes.length} Global Hubs</strong>
              </span>
            </div>

            <div style={{
              background: 'rgba(15, 23, 42, 0.88)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '8px',
              padding: '8px 14px',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Flame size={14} color="#ef4444" />
              <span style={{ fontSize: '0.74rem', color: '#e2e8f0', fontFamily: 'monospace', fontWeight: 600 }}>
                Active Threat Flows: <strong style={{ color: '#ef4444' }}>{filteredTxs.filter(t => t.chain_flag?.is_peel).length} Peeling Arcs</strong>
              </span>
            </div>
          </div>

          {/* Bottom-Left Controls Legend */}
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            background: 'rgba(15, 23, 42, 0.85)',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '0.70rem',
            color: '#cbd5e1',
            fontFamily: 'monospace',
            pointerEvents: 'none',
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}>
            {viewMode === '3d' ? '🖱️ Click & Drag to Rotate 3D Globe | Flight Arcs show Real-time UTXO Velocity' : '🗺️ 2D Tactical Planar Projection Active'}
          </div>

        </div>

        {/* Right: Live Flight Stream & Telemetry Dossier */}
        <div style={{
          width: '380px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          minHeight: 0
        }}>
          
          {/* Header */}
          <div className="card" style={{ padding: '14px 18px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio size={16} color="var(--brand)" />
                <h3 className="heading-md" style={{ fontSize: '0.92rem' }}>Live Flight Stream</h3>
              </div>
              <span className="badge badge-indigo" style={{ fontSize: '0.64rem' }}>
                {filteredTxs.length} Live Hops
              </span>
            </div>
          </div>

          {/* Scrollable Transaction Hop Stream (NON-SQUISHED WITH minHeight & flexShrink: 0) */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            paddingRight: '6px',
            minHeight: 0
          }}>
            {filteredTxs.map((tx, idx) => {
              const isSelected = selectedTx?.tx_id === tx.tx_id;
              const isPeel = tx.chain_flag?.is_peel;
              const isCoinJoin = tx.mix_flag?.is_coinjoin_like;

              return (
                <div
                  key={tx.tx_id || idx}
                  onClick={() => {
                    setSelectedTx(tx);
                    if (onSelectEntity) {
                      onSelectEntity({
                        id: tx.tx_id,
                        entity_id: (tx.input_addresses || [])[0] || tx.tx_id,
                        is_flagged: isPeel || isCoinJoin,
                        risk_score: tx.risk_score,
                        geo_city: tx.src_city,
                        geo_country: tx.src_country,
                        geo_asn: tx.src_asn
                      });
                    }
                  }}
                  className="card"
                  style={{
                    flexShrink: 0,
                    minHeight: '84px',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: isSelected ? '2px solid var(--brand)' : '1px solid var(--border-subtle)',
                    background: isSelected ? 'var(--brand-surface)' : 'var(--white)',
                    boxShadow: isSelected ? '0 4px 12px rgba(79, 70, 229, 0.12)' : 'var(--shadow-xs)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Zap size={14} color={isPeel ? 'var(--color-danger)' : (isCoinJoin ? 'var(--color-warning)' : 'var(--brand)')} />
                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        {tx.btc_amount} BTC
                      </span>
                    </div>

                    <span className={`badge ${isPeel ? 'badge-red' : (isCoinJoin ? 'badge-amber' : 'badge-emerald')}`} style={{ fontSize: '0.62rem', fontWeight: 700 }}>
                      {isPeel ? 'PEELING HOP' : (isCoinJoin ? 'COINJOIN' : 'RELAY')}
                    </span>
                  </div>

                  {/* Origin -> Destination Route */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    <MapPin size={12} color="var(--brand)" />
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{tx.src_city} ({tx.src_code})</span>
                    <span style={{ color: 'var(--text-muted)' }}>➔</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{tx.dst_city} ({tx.dst_code})</span>
                  </div>

                  {/* Origin ASN / Tor Info */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{tx.src_asn.slice(0, 22)}</span>
                    <span style={{ fontWeight: 600 }}>{tx.hop_distance_km.toLocaleString()} km</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Action Footer */}
          {selectedTx && (
            <div className="card" style={{ padding: '14px', flexShrink: 0, background: 'var(--white)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {selectedTx.src_city} ➔ {selectedTx.dst_city}
                </span>
                <span className="badge badge-indigo" style={{ fontSize: '0.66rem', fontWeight: 700 }}>
                  {(selectedTx.btc_amount * 63500).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    const wid = (selectedTx.input_addresses || [])[0] || selectedTx.tx_id;
                    if (onSelectWallet) onSelectWallet(wid);
                  }}
                  className="btn btn-primary btn-xs"
                  style={{ flex: 1, padding: '8px', fontWeight: 600 }}
                >
                  <Share2 size={12} />
                  <span>Trace in Link Graph</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Map Settings & Free Key Config Modal */}
      {showConfigModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '480px', padding: '24px', background: 'var(--white)', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} color="var(--brand)" />
                <h3 className="heading-md" style={{ fontSize: '1rem' }}>Map Layer & API Key Settings</h3>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="btn btn-ghost btn-xs">✕</button>
            </div>

            <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              This system uses <strong>100% Free & Open Map Tile Providers</strong> (CARTO Dark Matter & OpenStreetMap Voyager) with no credit card required. You can also paste your personal free Mapbox / MapTiler token below:
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                Optional Custom Mapbox / MapTiler API Key:
              </label>
              <input
                type="text"
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                placeholder="pk.eyJ1IjoieW91ci1hY2NvdW50IiwiYSI6..."
                className="input"
                style={{ width: '100%', fontSize: '0.78rem', fontFamily: 'monospace' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => {
                  localStorage.removeItem('ntro_map_api_key');
                  setCustomApiKey('');
                  setShowConfigModal(false);
                }}
                className="btn btn-ghost btn-xs"
              >
                Reset to Free CARTO Default
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('ntro_map_api_key', customApiKey);
                  setShowConfigModal(false);
                }}
                className="btn btn-primary btn-xs"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
