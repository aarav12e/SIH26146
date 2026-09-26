import React, { useState } from 'react';
import { 
  Layers, 
  Users, 
  Activity, 
  ChevronRight, 
  AlertTriangle,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

export default function ClusterView({ clusters, onSelectWallet }) {
  const [selectedClusterId, setSelectedClusterId] = useState(null);

  const activeCluster = clusters.find(c => c.cluster_id === selectedClusterId) || (clusters.length > 0 ? clusters[0] : null);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px' }}>
      
      {/* Cluster List */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Layers size={20} color="var(--accent-purple)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Louvain Communities</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '600px' }}>
          {clusters.length === 0 ? (
            <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '30px' }}>
              No clusters detected yet. Run the ML pipeline.
            </div>
          ) : (
            clusters.map((c) => {
              const isSelected = activeCluster?.cluster_id === c.cluster_id;
              const isHighDensity = (c.density_ratio_vs_baseline || 1.0) >= 1.5;

              return (
                <div
                  key={c.cluster_id}
                  onClick={() => setSelectedClusterId(c.cluster_id)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: `1px solid ${isSelected ? 'var(--accent-purple)' : 'var(--border-color)'}`,
                    background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'rgba(15, 23, 42, 0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="badge badge-purple">
                        Community #{c.cluster_id}
                      </span>
                      {isHighDensity && (
                        <span className="badge badge-crimson" style={{ fontSize: '0.65rem' }}>
                          High Density
                        </span>
                      )}
                    </div>
                    <ChevronRight size={16} color={isSelected ? 'var(--accent-purple)' : 'var(--text-dim)'} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                    <span>{c.node_count} member nodes</span>
                    <span>{c.edge_count} internal edges</span>
                  </div>

                  <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    Density Ratio: <strong style={{ color: isHighDensity ? '#fca5a5' : '#38bdf8' }}>{c.density_ratio_vs_baseline || 1.0}x baseline</strong>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Cluster Detail Panel */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        {activeCluster ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <span className="badge badge-purple" style={{ marginBottom: '8px' }}>
                  Community Detail
                </span>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>
                  Community #{activeCluster.cluster_id} Forensics Dossier
                </h3>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Total Transacted Volume</div>
                <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                  {activeCluster.total_volume?.toFixed(4) || '0.0000'} BTC
                </div>
              </div>
            </div>

            {/* Metrics Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Cluster Node Size</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                  {activeCluster.node_count}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Wallets & Entities</div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Internal Edge Density</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
                  {(activeCluster.density * 100).toFixed(2)}%
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Graph connectivity</div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Density vs Baseline</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: (activeCluster.density_ratio_vs_baseline || 1) >= 1.5 ? '#ef4444' : '#10b981', marginTop: '4px' }}>
                  {activeCluster.density_ratio_vs_baseline || 1.0}x
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Baseline comparison</div>
              </div>
            </div>

            {/* Member Wallets */}
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-main)' }}>
                Member Wallets ({activeCluster.all_members?.length || 0})
              </h4>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '8px',
                maxHeight: '340px',
                overflowY: 'auto'
              }}>
                {(activeCluster.all_members || []).map((addr, idx) => (
                  <div
                    key={idx}
                    onClick={() => onSelectWallet && onSelectWallet(addr)}
                    style={{
                      background: 'rgba(15, 23, 42, 0.7)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background 0.15s'
                    }}
                  >
                    <span className="mono" style={{ fontSize: '0.775rem', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {addr}
                    </span>
                    <ExternalLink size={13} color="var(--text-dim)" style={{ flexShrink: 0, marginLeft: '6px' }} />
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '40px' }}>
            Select a community on the left to inspect metrics.
          </div>
        )}
      </div>

    </div>
  );
}
