import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Share2, 
  Info,
  Repeat,
  Copy,
  Check,
  Sparkles,
  Flame
} from 'lucide-react';

export default function FlagsTable({ 
  flags = [], 
  clusters = [], 
  onSelectFlag, 
  onViewInGraph, 
  selectedFlagId,
  onFilterChange,
  onReloadDemo
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCluster, setSelectedCluster] = useState('');
  const [sortBy, setSortBy] = useState('risk');
  const [filterTag, setFilterTag] = useState('all');
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (text, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (onFilterChange) onFilterChange({ search: val, clusterId: selectedCluster, sortBy });
  };

  const handleClusterSelect = (e) => {
    const val = e.target.value;
    setSelectedCluster(val);
    if (onFilterChange) onFilterChange({ search: searchTerm, clusterId: val, sortBy });
  };

  const handleSortChange = (e) => {
    const val = e.target.value;
    setSortBy(val);
    if (onFilterChange) onFilterChange({ search: searchTerm, clusterId: selectedCluster, sortBy: val });
  };

  // Client-side quick filter tags
  const displayedFlags = flags.filter(flag => {
    if (filterTag === 'critical') return (flag.risk_score || 0) >= 0.65;
    if (filterTag === 'peel') return flag.is_peel || (flag.reasons || []).some(r => r.toLowerCase().includes('peel'));
    if (filterTag === 'neighbors') return flag.embedding_neighbors && flag.embedding_neighbors.length > 0;
    return true;
  });

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      
      {/* Table Header and Control Toolbar */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-faint)' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px', height: '38px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-danger-surface)',
              border: '1px solid var(--color-danger-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <ShieldAlert size={18} color="var(--color-danger)" />
            </div>
            <div>
              <h2 className="heading-md" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Threat Leads &amp; Anomaly Flags
                <span className="badge badge-crimson">{flags.length} active</span>
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                Ranked by PageRank propagation &amp; Isolation Forest anomaly score.
              </p>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '240px' }}>
              <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '9px', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search wallet, tag, pattern…"
                value={searchTerm}
                onChange={handleSearch}
                className="input-field"
                style={{ paddingLeft: '30px', fontSize: '0.78rem' }}
              />
            </div>

            <select value={selectedCluster} onChange={handleClusterSelect} className="input-field" style={{ width: '145px', fontSize: '0.78rem' }}>
              <option value="">All Clusters</option>
              {clusters && clusters.slice(0, 30).map(c => {
                const cid = c.entity_id ?? c.cluster_id;
                return <option key={cid} value={cid}>Cluster #{cid} ({c.node_count})</option>;
              })}
            </select>

            <select value={sortBy} onChange={handleSortChange} className="input-field" style={{ width: '140px', fontSize: '0.78rem' }}>
              <option value="risk">Risk Score ↓</option>
              <option value="anomaly">Anomaly ↓</option>
              <option value="confidence">Confidence ↓</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span className="label-xs" style={{ marginRight: '2px' }}>Filter:</span>
          {[
            { key: 'all', label: `All (${flags.length})`, icon: null },
            { key: 'critical', label: 'Critical ≥0.65', icon: <Flame size={11} /> },
            { key: 'peel', label: 'Peeling Chains', icon: <Repeat size={11} /> },
            { key: 'neighbors', label: 'Soft Match', icon: null },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterTag(f.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '3px 10px', borderRadius: 'var(--radius-full)',
                fontSize: '0.72rem', fontWeight: 600,
                border: '1px solid',
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
                background: filterTag === f.key ? 'var(--brand-surface)' : 'transparent',
                borderColor: filterTag === f.key ? 'var(--brand-border)' : 'var(--border-default)',
                color: filterTag === f.key ? 'var(--brand-text)' : 'var(--text-tertiary)',
              }}
            >
              {f.icon}{f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Forensic Table Container */}

      <div className="forensics-table-container">
        <table className="forensics-table">
          <thead>
            <tr>
              <th style={{ width: '50px', textAlign: 'center' }}>Rank</th>
              <th style={{ width: '240px' }}>Target Wallet Entity</th>
              <th style={{ width: '130px' }}>Risk Priority</th>
              <th style={{ width: '95px' }}>Anomaly</th>
              <th style={{ width: '100px' }}>Entity ID</th>
              <th>Synthesized Forensic Reasoning (NTRO Heuristic Engine)</th>
              <th style={{ width: '160px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedFlags.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <ShieldAlert size={32} color="var(--text-dim)" />
                    <div>No threat leads match your current search or filters.</div>
                    {onReloadDemo && (
                      <button onClick={onReloadDemo} className="btn btn-secondary btn-sm" style={{ marginTop: '6px' }}>
                        <Sparkles size={13} color="#38bdf8" />
                        Reload Preloaded Leads
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              displayedFlags.map((flag, idx) => {
                const wid = flag.flagged_id || flag.entity_id;
                const riskScore = Number(flag.risk_score || 0);
                const anomalyScore = Number(flag.anomaly_score || 0);
                const isCriticalRisk = riskScore >= 0.65;
                const isSelected = selectedFlagId === flag._id || selectedFlagId === wid;
                const topReason = flag.summary || (flag.reasons && flag.reasons[0]) || 'Suspicious structural behavior detected by isolation forest.';

                return (
                  <tr 
                    key={flag._id || wid || idx}
                    onClick={() => onSelectFlag(flag)}
                    className={isSelected ? 'selected' : ''}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Rank */}
                    <td style={{ textAlign: 'center', fontWeight: 800, color: idx < 3 ? '#dc2626' : '#64748b' }}>
                      #{idx + 1}
                    </td>

                    {/* Target Wallet Entity */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="mono" style={{ 
                          fontWeight: 700, 
                          fontSize: '0.82rem', 
                          color: isCriticalRisk ? '#b91c1c' : '#0f172a',
                          background: isCriticalRisk ? '#fef2f2' : '#f8fafc',
                          padding: '2px 7px',
                          borderRadius: '5px',
                          border: `1px solid ${isCriticalRisk ? '#fecaca' : '#e2e8f0'}`,
                          display: 'inline-block'
                        }}>
                          {wid && wid.length > 20 ? `${wid.slice(0, 8)}...${wid.slice(-6)}` : (wid || 'Unknown')}
                        </span>
                        <button
                          onClick={(e) => handleCopy(wid, e)}
                          className="copy-btn"
                          title="Copy address"
                        >
                          {copiedId === wid ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '5px' }}>
                        {flag.is_peel && (
                          <span className="badge badge-amber" style={{ fontSize: '0.62rem' }}>
                            <Repeat size={9} /> Peeling Chain
                          </span>
                        )}
                        {flag.embedding_neighbors && flag.embedding_neighbors.length > 0 && (
                          <span className="badge badge-purple" style={{ fontSize: '0.62rem' }}>
                            Soft Match
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Risk Priority */}
                    <td>
                      <div className="risk-meter">
                        <span className={`badge ${isCriticalRisk ? 'badge-crimson' : 'badge-amber'}`}>
                          {riskScore.toFixed(2)}
                        </span>
                        <div className="risk-meter-bar">
                          <div 
                            className="risk-meter-fill"
                            style={{
                              width: `${Math.min(100, Math.round(riskScore * 100))}%`,
                              background: isCriticalRisk 
                                ? 'linear-gradient(90deg, #f59e0b, #ef4444)' 
                                : 'linear-gradient(90deg, #3b82f6, #f59e0b)'
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Anomaly Score */}
                    <td>
                      <span className="badge badge-gray mono">
                        {anomalyScore.toFixed(2)}
                      </span>
                    </td>

                    {/* Entity Cluster ID */}
                    <td>
                      <span className="badge badge-blue">
                        Entity #{flag.entity_cluster_id ?? flag.cluster_id ?? '1'}
                      </span>
                    </td>

                    {/* Forensic Reasoning */}
                    <td>
                      <div style={{ 
                        fontSize: '0.8125rem', 
                        color: '#1e293b', 
                        fontWeight: 500,
                        lineHeight: 1.45,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {topReason}
                      </div>
                      {flag.reasons && flag.reasons.length > 1 && (
                        <div style={{ fontSize: '0.72rem', color: '#2563eb', marginTop: '4px', fontWeight: 600 }}>
                          +{flag.reasons.length - 1} corroborated forensic signals
                        </div>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectFlag(flag);
                          }}
                          className="btn btn-ghost btn-xs"
                          title="Open detailed forensic dossier"
                        >
                          <Info size={12} />
                          <span>Dossier</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewInGraph(wid);
                          }}
                          className="btn btn-secondary btn-xs"
                          title="Trace and visualize in Link Graph"
                        >
                          <Share2 size={12} color="#2563eb" />
                          <span>Trace</span>
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
