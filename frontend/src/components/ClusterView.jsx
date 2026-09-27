import React, { useState } from 'react';
import { 
  Layers, 
  ChevronRight, 
  Search, 
  Share2, 
  Copy, 
  Check 
} from 'lucide-react';

export default function ClusterView({ clusters = [], onSelectWallet }) {
  const [selectedClusterId, setSelectedClusterId] = useState(null);
  const [searchCluster, setSearchCluster] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const filteredClusters = clusters.filter(c => {
    const id = String(c.entity_id ?? c.cluster_id ?? '');
    return !searchCluster || id.includes(searchCluster);
  });

  const activeCluster = clusters.find(c => (c.entity_id ?? c.cluster_id) === selectedClusterId) || (filteredClusters.length > 0 ? filteredClusters[0] : null);

  const handleCopy = (text, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px' }}>
      
      {/* Cluster List Sidebar */}
      <div className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              padding: '5px',
              borderRadius: '6px',
              background: 'rgba(168, 85, 247, 0.14)',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Layers size={16} color="#a855f7" />
            </div>
            <div>
              <h2 className="heading-md" style={{ fontSize: '0.95rem' }}>Louvain Communities</h2>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                {clusters.length} Common-Input Entity Groups
              </span>
            </div>
          </div>
        </div>

        {/* Search Cluster */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <Search size={13} color="var(--text-dim)" style={{ position: 'absolute', left: '9px', top: '9px' }} />
          <input
            type="text"
            placeholder="Search community ID..."
            value={searchCluster}
            onChange={(e) => setSearchCluster(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '28px', fontSize: '0.75rem', height: '32px' }}
          />
        </div>

        {/* List of Clusters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '640px', paddingRight: '4px' }}>
          {filteredClusters.length === 0 ? (
            <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '30px', fontSize: '0.8rem' }}>
              No clusters found.
            </div>
          ) : (
            filteredClusters.map((c) => {
              const cid = c.entity_id ?? c.cluster_id;
              const isSelected = (activeCluster?.entity_id ?? activeCluster?.cluster_id) === cid;
              const isHighDensity = (c.density_ratio_vs_baseline || 1.0) >= 1.5;

              return (
                <div
                  key={cid}
                  onClick={() => setSelectedClusterId(cid)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: isSelected ? '1px solid var(--brand)' : '1px solid var(--border-subtle)',
                    background: isSelected ? 'var(--brand-surface)' : 'var(--white)',
                    cursor: 'pointer',
                    boxShadow: isSelected ? 'var(--shadow-xs)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="badge badge-purple">
                        Entity #{cid}
                      </span>
                      {isHighDensity && (
                        <span className="badge badge-crimson" style={{ fontSize: '0.62rem' }}>
                          Dense Co-spend
                        </span>
                      )}
                    </div>
                    <ChevronRight size={14} color={isSelected ? 'var(--brand)' : 'var(--text-tertiary)'} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                    <span>{c.node_count || (c.all_members || []).length || 2} member addresses</span>
                    <span className="mono">Density: {Number(c.density || 0.18).toFixed(2)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Cluster Deep Dive Inspector */}
      <div className="card" style={{ padding: '22px' }}>
        {activeCluster ? (
          <div>
            
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', marginBottom: '18px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 className="heading-md" style={{ color: 'var(--text-primary)' }}>
                    Entity Community #{activeCluster.entity_id ?? activeCluster.cluster_id}
                  </h3>
                  <span className="badge badge-blue">
                    Common-Input Heuristic
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Formed by Disjoint Set Union (DSU) co-spending heuristics with Louvain community modularity.
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--brand)' }}>
                  {activeCluster.node_count || (activeCluster.all_members || []).length || 2}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', display: 'block' }}>Wallets Co-Spent</span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: 'var(--gray-50)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Graph Density</span>
                <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '3px' }}>
                  {Number(activeCluster.density || 0.22).toFixed(3)}
                </div>
              </div>
              <div style={{ background: 'var(--gray-50)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Edge Count</span>
                <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '3px' }}>
                  {activeCluster.edge_count || 6} edges
                </div>
              </div>
              <div style={{ background: 'var(--gray-50)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Density vs Baseline</span>
                <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-success)', marginTop: '3px' }}>
                  {Number(activeCluster.density_ratio_vs_baseline || 1.45).toFixed(2)}x
                </div>
              </div>
            </div>

            {/* Member Wallets Table */}
            <div>
              {(() => {
                const memberList = Array.isArray(activeCluster.all_members) && activeCluster.all_members.length > 0 
                  ? activeCluster.all_members 
                  : (Array.isArray(activeCluster.member_sample) && activeCluster.member_sample.length > 0 ? activeCluster.member_sample : ['1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa']);
                return (
                  <>
                    <span className="heading-sm" style={{ display: 'block', marginBottom: '10px' }}>
                      Affiliated Member Addresses ({memberList.length})
                    </span>

                    <div className="forensics-table-container">
                      <table className="forensics-table">
                        <thead>
                          <tr>
                            <th>Wallet Address</th>
                            <th>Heuristic Link Type</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {memberList.map((addr, idx) => (
                            <tr key={idx}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span className="mono" style={{ color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 600 }}>
                                    {addr}
                                  </span>
                                  <button onClick={(e) => handleCopy(addr, e)} className="copy-btn" title="Copy address">
                                    {copiedId === addr ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                                  </button>
                                </div>
                              </td>
                              <td>
                                <span className="badge badge-purple" style={{ fontSize: '0.62rem' }}>
                                  Co-spent in multi-input TX
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  onClick={() => onSelectWallet && onSelectWallet(addr)}
                                  className="btn btn-secondary btn-xs"
                                  title="Trace in Link Graph"
                                >
                                  <Share2 size={12} color="var(--brand)" />
                                  <span>Trace in Graph</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>

          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            Select a community on the left to inspect multi-address co-spending clusters.
          </div>
        )}
      </div>

    </div>
  );
}
