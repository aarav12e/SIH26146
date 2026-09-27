import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Search, 
  RefreshCw, 
  Share2,
  Network,
  Filter,
  Eye,
  Crosshair
} from 'lucide-react';

export default function GraphView({ 
  graphData, 
  onNodeClick, 
  selectedNodeId, 
  onRefresh,
  onShowFullGraph,
  loading,
  hops = 2,
  onHopsChange
}) {
  const fgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 1000, height: 680 });
  const [searchTerm, setSearchTerm] = useState('');
  const [nodeFilter, setNodeFilter] = useState('all');

  // Resize canvas dynamically to exact container dimensions with zero window scroll
  useEffect(() => {
    if (!containerRef.current) return;

    function updateDimensions() {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        const rect = containerRef.current.getBoundingClientRect();
        const availableHeight = clientHeight > 100 
          ? clientHeight 
          : Math.max(480, Math.floor(window.innerHeight - rect.top - 20));
        
        setDimensions({
          width: clientWidth || 1000,
          height: availableHeight
        });
      }
    }

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Filter nodes & links safely
  const filteredData = useMemo(() => {
    const rawNodes = Array.isArray(graphData?.nodes) ? graphData.nodes : [];
    const rawLinks = Array.isArray(graphData?.links) ? graphData.links : [];

    let nodes = rawNodes;
    if (nodeFilter === 'flagged') {
      nodes = nodes.filter(n => n.is_flagged || (n.risk_score && n.risk_score >= 0.5));
    } else if (nodeFilter === 'wallets') {
      nodes = nodes.filter(n => n.node_type === 'wallet');
    } else if (nodeFilter === 'ips') {
      nodes = nodes.filter(n => n.node_type === 'ip');
    } else if (nodeFilter === 'peel') {
      nodes = nodes.filter(n => n.is_peel);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase().trim();
      nodes = nodes.filter(n => 
        String(n.id || '').toLowerCase().includes(q) || 
        String(n.label || '').toLowerCase().includes(q)
      );
    }

    const nodeSet = new Set(nodes.map(n => n.id));
    const links = rawLinks
      .map(l => ({
        ...l,
        source: typeof l.source === 'object' && l.source !== null ? l.source.id : l.source,
        target: typeof l.target === 'object' && l.target !== null ? l.target.id : l.target
      }))
      .filter(l => nodeSet.has(l.source) && nodeSet.has(l.target));

    return { 
      nodes: nodes.map(n => ({ ...n })), 
      links 
    };
  }, [graphData, nodeFilter, searchTerm]);

  // Configure D3 forces and Auto-Fit canvas whenever data changes
  useEffect(() => {
    if (fgRef.current) {
      // Strong repulsion to spread nodes across the canvas nicely
      try {
        fgRef.current.d3Force('charge')?.strength(-500);
        fgRef.current.d3Force('link')?.distance(80);
      } catch (e) {
        // safe ignore
      }

      // Reheat simulation
      fgRef.current.d3ReheatSimulation();

      // Zoom to fit so nodes are centered and prominent
      const timer = setTimeout(() => {
        if (fgRef.current && typeof fgRef.current.zoomToFit === 'function') {
          fgRef.current.zoomToFit(500, 70);
        }
      }, 350);

      return () => clearTimeout(timer);
    }
  }, [filteredData.nodes.length, graphData]);

  // Center on selected node if specified
  useEffect(() => {
    if (selectedNodeId && fgRef.current && filteredData?.nodes) {
      const target = filteredData.nodes.find(n => n.id === selectedNodeId);
      if (target && target.x !== undefined && target.y !== undefined) {
        try {
          if (typeof fgRef.current.centerAt === 'function') {
            fgRef.current.centerAt(target.x, target.y, 600);
          }
          if (typeof fgRef.current.zoom === 'function') {
            fgRef.current.zoom(2.0, 600);
          }
        } catch (e) {
          // ignore ref method errors during layout
        }
      }
    }
  }, [selectedNodeId, filteredData]);

  const handleZoomIn = () => {
    try {
      if (typeof fgRef.current?.zoom === 'function') {
        fgRef.current.zoom(fgRef.current.zoom() * 1.35, 300);
      }
    } catch (e) {}
  };

  const handleZoomOut = () => {
    try {
      if (typeof fgRef.current?.zoom === 'function') {
        fgRef.current.zoom(fgRef.current.zoom() / 1.35, 300);
      }
    } catch (e) {}
  };

  const handleFitView = () => {
    try {
      if (typeof fgRef.current?.zoomToFit === 'function') {
        fgRef.current.zoomToFit(500, 70);
      }
    } catch (e) {}
  };

  // Helper to draw rounded rectangle safely
  const drawRoundRect = (ctx, x, y, width, height, radius) => {
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, width, height, radius);
    } else {
      ctx.rect(x, y, width, height);
    }
  };

  // Custom high-definition node canvas rendering
  const renderNode = useCallback((node, ctx, globalScale) => {
    const isSelected = node.id === selectedNodeId;
    const isFlagged = node.is_flagged || (node.risk_score && node.risk_score >= 0.5);
    const isPeel = node.is_peel;
    const isIp = node.node_type === 'ip';
    const isTx = node.node_type === 'transaction';

    // Base radius
    let r = 8;
    if (isSelected) r = 11;
    else if (isFlagged) r = 9.5;
    else if (isTx) r = 6.5;

    // Node fill color
    let fillColor = '#4f46e5'; // default indigo wallet
    if (isFlagged) fillColor = '#dc2626'; // danger crimson
    else if (isPeel) fillColor = '#d97706'; // warning amber
    else if (isIp) fillColor = '#7c3aed'; // purple IP
    else if (isTx) fillColor = '#64748b'; // slate TX

    // Outer glow / halo
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 6, 0, 2 * Math.PI, false);
      ctx.fillStyle = 'rgba(79, 70, 229, 0.25)';
      ctx.fill();
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (isFlagged) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 5, 0, 2 * Math.PI, false);
      ctx.fillStyle = 'rgba(220, 38, 38, 0.2)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Node body
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner center point
    ctx.beginPath();
    ctx.arc(node.x, node.y, r * 0.35, 0, 2 * Math.PI, false);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Draw label
    const showLabel = globalScale > 0.6 || isSelected || isFlagged || filteredData.nodes.length <= 25;
    if (showLabel) {
      const rawId = String(node.label || node.id || '');
      let displayLabel = rawId;
      if (rawId.length > 14) {
        displayLabel = `${rawId.slice(0, 6)}...${rawId.slice(-4)}`;
      }
      if (isTx) {
        displayLabel = `TX: ${displayLabel}`;
      }

      const fontSize = Math.max(9, Math.min(12, 11 / Math.sqrt(globalScale || 1)));
      ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Inter", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const textWidth = ctx.measureText(displayLabel).width;
      const pillHeight = fontSize + 6;
      const pillY = node.y + r + 3;

      // Label background pill
      ctx.beginPath();
      drawRoundRect(ctx, node.x - textWidth / 2 - 5, pillY, textWidth + 10, pillHeight, 4);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#4f46e5' : isFlagged ? '#fca5a5' : '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label text
      ctx.fillStyle = isSelected ? '#3730a3' : isFlagged ? '#991b1b' : '#1e293b';
      ctx.fillText(displayLabel, node.x, pillY + pillHeight / 2);

      // Risk score mini badge on top
      if (isFlagged && node.risk_score) {
        const scoreText = `▲ ${(node.risk_score).toFixed(2)}`;
        const scoreWidth = ctx.measureText(scoreText).width;
        const scoreY = node.y - r - pillHeight - 2;

        ctx.beginPath();
        drawRoundRect(ctx, node.x - scoreWidth / 2 - 4, scoreY, scoreWidth + 8, pillHeight - 1, 3);
        ctx.fillStyle = '#fee2e2';
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#b91c1c';
        ctx.font = `700 ${fontSize - 1}px monospace`;
        ctx.fillText(scoreText, node.x, scoreY + (pillHeight - 1) / 2);
      }
    }
  }, [selectedNodeId, filteredData.nodes.length]);

  // Pointer detection area for click / hover
  const renderPointerArea = useCallback((node, color, ctx) => {
    const r = (node.id === selectedNodeId ? 14 : 11);
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    ctx.fill();
  }, [selectedNodeId]);

  const isSubgraphView = filteredData.nodes.length <= 20;

  return (
    <div className="card graph-card-full" style={{ 
      overflow: 'hidden', 
      position: 'relative',
      background: 'var(--white)',
      border: '1px solid var(--border-subtle)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      
      {/* Top Controls Toolbar — Clean Enterprise Light Theme */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--white)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        
        {/* Title, Badge & Subgraph Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px', height: '34px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--brand-surface)',
            border: '1px solid var(--brand-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <Share2 size={16} color="var(--brand)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="heading-md" style={{ fontSize: '0.92rem' }}>
                Forensic Link Graph
              </span>
              {isSubgraphView ? (
                <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>
                  Target Subgraph ({filteredData.nodes.length} nodes)
                </span>
              ) : (
                <span className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>
                  Network Graph ({filteredData.nodes.length} nodes)
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '1px' }}>
              {filteredData.links.length} directed UTXO flows active · Click any node to open evidence dossier
            </div>
          </div>

          {/* Quick toggle back to full graph if in subgraph mode */}
          {isSubgraphView && onShowFullGraph && (
            <button
              onClick={onShowFullGraph}
              className="btn btn-secondary btn-xs"
              style={{ marginLeft: '6px', fontSize: '0.72rem', gap: '5px' }}
              title="Expand view to complete 250-node ecosystem graph"
            >
              <Network size={12} color="var(--brand)" />
              <span>Show Full Network (250)</span>
            </button>
          )}
        </div>

        {/* Toolbar Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          
          {/* Quick search node */}
          <div style={{ position: 'relative', width: '180px' }}>
            <Search size={13} color="var(--text-tertiary)" style={{ position: 'absolute', left: '9px', top: '9px' }} />
            <input
              type="text"
              placeholder="Filter address, IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '28px', fontSize: '0.75rem', height: '32px' }}
            />
          </div>

          {/* Node Filter */}
          <select
            value={nodeFilter}
            onChange={(e) => setNodeFilter(e.target.value)}
            className="input-field"
            style={{ width: '135px', height: '32px', fontSize: '0.75rem' }}
          >
            <option value="all">All Entities</option>
            <option value="flagged">Threat Leads Only</option>
            <option value="wallets">Wallets Only</option>
            <option value="ips">Network IPs Only</option>
            <option value="peel">Peeling Chains</option>
          </select>

          {/* Hops Selector */}
          {onHopsChange && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              background: 'var(--gray-100)', 
              borderRadius: '7px', 
              border: '1px solid var(--border-subtle)', 
              padding: '2px', 
              gap: '2px' 
            }}>
              <span style={{ fontSize: '0.64rem', color: 'var(--text-tertiary)', padding: '0 6px', fontWeight: 700, letterSpacing: '0.04em' }}>HOPS</span>
              {[1, 2, 3].map(h => (
                <button
                  key={h}
                  onClick={() => onHopsChange(h)}
                  style={{
                    border: 'none',
                    background: hops === h ? 'var(--white)' : 'transparent',
                    color: hops === h ? 'var(--brand)' : 'var(--text-secondary)',
                    borderRadius: '5px',
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: hops === h ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.12s ease'
                  }}
                >
                  {h}
                </button>
              ))}
            </div>
          )}

          {/* Zoom & Fit Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '4px' }}>
            <button 
              onClick={handleFitView} 
              className="btn btn-secondary btn-xs" 
              title="Fit Graph to View"
              style={{ gap: '4px', fontSize: '0.72rem' }}
            >
              <Maximize2 size={13} />
              <span>Fit View</span>
            </button>
            <button onClick={handleZoomIn} className="btn btn-ghost btn-xs" title="Zoom In">
              <ZoomIn size={14} />
            </button>
            <button onClick={handleZoomOut} className="btn btn-ghost btn-xs" title="Zoom Out">
              <ZoomOut size={14} />
            </button>
            {onRefresh && (
              <button onClick={onRefresh} className="btn btn-ghost btn-xs" title="Refresh Graph Data">
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
            )}
          </div>

        </div>

      </div>

      {/* Force Graph Canvas Container with Blueprint Forensic Grid */}
      <div 
        ref={containerRef} 
        className="graph-canvas-box"
        style={{ 
          width: '100%', 
          height: '100%', 
          background: '#f8fafc',
          backgroundImage: 'radial-gradient(#cbd5e1 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
          position: 'relative' 
        }}
      >
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={filteredData}
          backgroundColor="transparent"
          nodeCanvasObject={renderNode}
          nodePointerAreaPaint={renderPointerArea}
          nodeLabel={(n) => `[${n.node_type?.toUpperCase() || 'WALLET'}] ${n.label || n.id}\nRisk Score: ${(n.risk_score || 0).toFixed(2)} | Entity #${n.entity_id || '1'}`}
          linkColor={() => 'rgba(148, 163, 184, 0.55)'}
          linkWidth={(l) => (l.type === 'peel_hop' ? 2.5 : 1.2)}
          linkDirectionalArrowLength={6}
          linkDirectionalArrowRelPos={0.95}
          linkCurvature={0.12}
          onNodeClick={(node) => {
            if (onNodeClick) onNodeClick(node);
          }}
          cooldownTicks={120}
          d3VelocityDecay={0.3}
          onEngineStop={() => {
            // Once initial layout settles, fit nicely into viewport
            if (fgRef.current && typeof fgRef.current.zoomToFit === 'function') {
              fgRef.current.zoomToFit(400, 70);
            }
          }}
        />

        {/* Tactical Legend Floating Card */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '0.72rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          zIndex: 10,
          boxShadow: 'var(--shadow-md)'
        }}>
          <span style={{ fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Entity Legend
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#dc2626' }} />
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Threat Lead (High Risk)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#d97706' }} />
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Peeling Chain Hop</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#4f46e5' }} />
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Monitored Wallet</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#7c3aed' }} />
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Network IP Origin</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#64748b' }} />
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Transaction Vertex</span>
          </div>
        </div>

        {/* Quick Instructions Overlay Banner */}
        <div style={{
          position: 'absolute',
          top: '14px',
          left: '16px',
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(6px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '6px',
          padding: '6px 12px',
          fontSize: '0.7rem',
          color: 'var(--text-tertiary)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          pointerEvents: 'none',
          boxShadow: 'var(--shadow-xs)'
        }}>
          <Crosshair size={12} color="var(--brand)" />
          <span>Scroll to zoom · Drag canvas to pan · Click node to inspect evidence</span>
        </div>

      </div>

    </div>
  );
}
