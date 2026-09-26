import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Search, 
  ExternalLink, 
  Share2, 
  Filter, 
  SlidersHorizontal,
  Info,
  Repeat,
  Radio
} from 'lucide-react';

export default function FlagsTable({ 
  flags, 
  clusters, 
  onSelectFlag, 
  onViewInGraph, 
  selectedFlagId,
  onFilterChange 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCluster, setSelectedCluster] = useState('');
  const [sortBy, setSortBy] = useState('risk');

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

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      
      {/* Header and Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={22} color="var(--accent-crimson)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Prioritized Investigative Leads</h2>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Ranked by Personalized PageRank risk propagation and Isolation Forest anomaly score (NTRO §6.5).
          </p>
        </div>

        {/* Filter controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          
          {/* Search box */}
          <div style={{ position: 'relative', width: '250px' }}>
            <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input
              type="text"
              placeholder="Search wallet, pattern, seed..."
              value={searchTerm}
              onChange={handleSearch}
              className="input-field"
              style={{ paddingLeft: '36px' }}
            />
          </div>

          {/* Cluster filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={15} color="var(--text-dim)" />
            <select
              value={selectedCluster}
              onChange={handleClusterSelect}
              className="input-field"
              style={{ width: '150px', padding: '9px 12px' }}
            >
              <option value="">All Entities</option>
              {clusters && clusters.slice(0, 30).map(c => (
                <option key={c.entity_id || c.cluster_id} value={c.entity_id || c.cluster_id}>
                  Entity #{c.entity_id || c.cluster_id} ({c.node_count} addrs)
                </option>
              ))}
            </select>
          </div>

          {/* Sort order */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <SlidersHorizontal size={15} color="var(--text-dim)" />
            <select
              value={sortBy}
              onChange={handleSortChange}
              className="input-field"
              style={{ width: '160px', padding: '9px 12px' }}
            >
              <option value="risk">Risk Propagation</option>
              <option value="anomaly">Anomaly Score</option>
              <option value="time">Most Recent</option>
            </select>
          </div>

        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
        <table className="forensics-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>Rank</th>
              <th style={{ width: '220px' }}>Wallet Entity</th>
              <th style={{ width: '120px' }}>Risk Score</th>
              <th style={{ width: '110px' }}>Anomaly</th>
              <th style={{ width: '110px' }}>Entity ID</th>
              <th>Synthesized Forensic Reasoning (NTRO Template)</th>
              <th style={{ width: '150px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {flags.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                  No investigative leads found. Ingest dataset and run analysis.
                </td>
              </tr>
            ) : (
              flags.map((flag, idx) => {
                const wid = flag.flagged_id || flag.entity_id;
                const riskScore = flag.risk_score || 0;
                const anomalyScore = flag.anomaly_score || 0;
                const isCriticalRisk = riskScore >= 0.65;
                const isSelected = selectedFlagId === flag._id || selectedFlagId === wid;
                const topReason = flag.summary || (flag.reasons && flag.reasons[0]);

                return (
                  <tr 
                    key={flag._id || wid}
                    onClick={() => onSelectFlag(flag)}
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent'
                    }}
                  >
                    <td style={{ fontWeight: 700, color: idx < 3 ? 'var(--accent-crimson)' : 'var(--text-dim)' }}>
                      #{idx + 1}
                    </td>

                    <td>
                      <div className="mono" style={{ fontWeight: 600, fontSize: '0.825rem', color: isCriticalRisk ? '#fca5a5' : '#ffffff' }}>
                        {wid}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                        {flag.is_peel && (
                          <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>
                            <Repeat size={10} /> Peeling Chain
                          </span>
                        )}
                        {flag.embedding_neighbors?.length > 0 && (
                          <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
                            Node2Vec Soft Match
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Risk Score */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`badge ${isCriticalRisk ? 'badge-crimson' : 'badge-amber'}`}>
                          {riskScore.toFixed(2)}
                        </span>
                        <div style={{ flex: 1, height: '4px', background: '#1e293b', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.round(riskScore * 100)}%`,
                            height: '100%',
                            background: isCriticalRisk ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #38bdf8, #f59e0b)'
                          }} />
                        </div>
                      </div>
                    </td>

                    {/* Anomaly Score */}
                    <td>
                      <span className="badge badge-gray mono">
                        {anomalyScore.toFixed(2)}
                      </span>
                    </td>

                    {/* Entity Cluster ID (Union-Find) */}
                    <td>
                      <span className="badge badge-purple">
                        Entity #{flag.entity_cluster_id || flag.cluster_id || '1'}
                      </span>
                    </td>

                    {/* Explainability string */}
                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {topReason}
                      </div>
                      {flag.reasons?.length > 1 && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', marginTop: '3px' }}>
                          +{flag.reasons.length - 1} corroborating evidence signals
                        </div>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectFlag(flag);
                          }}
                          className="btn btn-ghost btn-sm"
                          title="Open Evidence Dossier"
                        >
                          <Info size={13} />
                          <span>Dossier</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewInGraph(wid);
                          }}
                          className="btn btn-ghost btn-sm"
                          title="View In Graph"
                        >
                          <Share2 size={13} />
                          <span>Graph</span>
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
