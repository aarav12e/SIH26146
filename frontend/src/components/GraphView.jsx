import React, { useRef, useEffect, useState, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Search, 
  Filter, 
  Layers, 
  RefreshCw,
  Info
} from 'lucide-react';

export default function GraphView({ 
  graphData, 
  onNodeClick, 
  selectedNodeId, 
  onRefresh, 
  loading,
  hops = 2,
  onHopsChange
}) {
  const fgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 900, height: 620 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Dynamic window resizing
  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({
          width: clientWidth || 900,
          height: Math.max(clientHeight, 580)
        });
      }
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Center on selected node if changed
  useEffect(() => {
    if (selectedNodeId && fgRef.current && graphData?.nodes) {
      const target = graphData.nodes.find(n => n.id === selectedNodeId);
      if (target && target.x !== undefined && target.y !== undefined) {
        fgRef.current.centerAt(target.x, target.y, 800);
        fgRef.current.zoom(2.2, 800);
      }
    }
  }, [selectedNodeId, graphData]);

  // Filtered nodes and links
  const filteredData = useMemo(() => {
    if (!graphData || !graphData.nodes) return { nodes: [], links: [] };

    let nodes = graphData.nodes;
    if (filterType !== 'all') {
      if (filterType === 'flagged') {
        nodes = nodes.filter(n => n.is_flagged || (n.anomaly_score && n.anomaly_score >= 0.5));
      } else {
        nodes = nodes.filter(n => n.node_type === filterType);
      }
    }

    const nodeSet = new Set(nodes.map(n => n.id));
    const links = (graphData.links || []).filter(l => {
      const srcId = typeof l.source === 'object' ? l.source.id : l.source;
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
      return nodeSet.has(srcId) && nodeSet.has(tgtId);
    });

    return { nodes, links };
  }, [graphData, filterType]);

  const handleSearchNode = () => {
    if (!searchTerm.trim() || !graphData?.nodes || !fgRef.current) return;
    const term = searchTerm.toLowerCase().trim();
    const match = graphData.nodes.find(n => 
      n.id.toLowerCase().includes(term) || (n.label && n.label.toLowerCase().includes(term))
    );
    if (match && match.x !== undefined && match.y !== undefined) {
      fgRef.current.centerAt(match.x, match.y, 800);
      fgRef.current.zoom(2.5, 800);
      if (onNodeClick) onNodeClick(match);
    }
  };

  const getNodeColor = (node) => {
    if (node.id === selectedNodeId) return '#38bdf8'; // Electric highlight
    if (node.is_flagged || (node.anomaly_score && node.anomaly_score >= 0.6)) {
      return node.anomaly_score >= 0.8 ? '#ef4444' : '#f59e0b';
    }
    if (node.node_type === 'transaction') return '#eab308';
    if (node.node_type === 'ip') return '#06b6d4';
    return '#818cf8'; // Standard wallet
  };

  const getNodeVal = (node) => {
    if (node.id === selectedNodeId) return 12;
    if (node.is_flagged) return 9 + (node.anomaly_score || 0) * 5;
    if (node.node_type === 'transaction') return 6;
    if (node.node_type === 'ip') return 7;
    return 5;
  };

  return (
    <div className="glass-panel" ref={containerRef} style={{ position: 'relative', overflow: 'hidden', height: '680px', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Toolbar */}
      <div style={{
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-color)',
        background: 'rgba(15, 23, 42, 0.8)',
        zIndex: 10,
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={15} color="var(--text-dim)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              placeholder="Search wallet, TXID, or IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchNode()}
              className="input-field"
              style={{ paddingLeft: '32px', paddingRight: '30px', fontSize: '0.8rem', padding: '7px 32px' }}
            />
          </div>
          <button onClick={handleSearchNode} className="btn btn-ghost btn-sm">
            Locate
          </button>
        </div>

        {/* Filters and hops */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} color="var(--text-dim)" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input-field"
              style={{ width: '130px', padding: '6px 10px', fontSize: '0.775rem' }}
            >
              <option value="all">All Entities</option>
              <option value="flagged">Flagged Only</option>
              <option value="wallet">Wallets Only</option>
              <option value="transaction">Transactions Only</option>
              <option value="ip">IP Relays Only</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Hops:</span>
            {[1, 2, 3].map(h => (
              <button
                key={h}
                onClick={() => onHopsChange && onHopsChange(h)}
                className={`btn btn-sm ${hops === h ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              >
                {h}
              </button>
            ))}
          </div>

          {/* Canvas View Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => fgRef.current?.zoom(fgRef.current.zoom() * 1.3, 400)}
              className="btn btn-ghost btn-sm"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => fgRef.current?.zoom(fgRef.current.zoom() / 1.3, 400)}
              className="btn btn-ghost btn-sm"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <button
              onClick={() => fgRef.current?.zoomToFit(600, 40)}
              className="btn btn-ghost btn-sm"
              title="Reset View"
            >
              <Maximize2 size={14} />
            </button>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="btn btn-ghost btn-sm"
              title="Refresh Graph"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

        </div>

      </div>

      {/* Force Graph Canvas */}
      <div style={{ flex: 1, position: 'relative', background: '#070b13' }}>
        {filteredData.nodes.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)' }}>
            No graph nodes to display. Ingest a dataset or click "1-Click Demo Data".
          </div>
        ) : (
          <ForceGraph2D
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height - 50}
            graphData={filteredData}
            nodeLabel={node => `${node.node_type?.toUpperCase()}: ${node.id} ${node.is_flagged ? `(Threat Score: ${node.anomaly_score})` : ''}`}
            nodeColor={getNodeColor}
            nodeVal={getNodeVal}
            linkColor={() => 'rgba(255, 255, 255, 0.15)'}
            linkWidth={1.5}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            linkCurvature={0.15}
            onNodeClick={(node) => {
              if (onNodeClick) onNodeClick(node);
            }}
            cooldownTicks={120}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const label = node.label || node.id;
              const fontSize = Math.max(10 / globalScale, 3);
              const color = getNodeColor(node);
              const r = getNodeVal(node);

              // Outer glow for flagged or selected nodes
              if (node.is_flagged || node.id === selectedNodeId) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, r + 4, 0, 2 * Math.PI, false);
                ctx.fillStyle = node.id === selectedNodeId ? 'rgba(56, 189, 248, 0.35)' : 'rgba(239, 68, 68, 0.4)';
                ctx.fill();
              }

              // Main node body
              ctx.beginPath();
              ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
              ctx.fillStyle = color;
              ctx.fill();

              // Border
              ctx.strokeStyle = '#0a0e17';
              ctx.lineWidth = 1.5;
              ctx.stroke();

              // Text label
              if (globalScale > 1.2 || node.is_flagged || node.id === selectedNodeId) {
                ctx.font = `${fontSize}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(label, node.x, node.y + r + fontSize + 2);
              }
            }}
          />
        )}

        {/* Legend Overlay */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '0.725rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          zIndex: 5
        }}>
          <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: '2px' }}>GRAPH LEGEND</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
            <span>Critical Threat Wallet (Score &ge; 0.8)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
            <span>Medium Anomaly Wallet</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#818cf8', display: 'inline-block' }} />
            <span>Standard Wallet Node</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#eab308', display: 'inline-block' }} />
            <span>Transaction (TXID)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#06b6d4', display: 'inline-block' }} />
            <span>P2P Relay IP Address</span>
          </div>
        </div>

      </div>

    </div>
  );
}
