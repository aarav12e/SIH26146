import React, { useState } from 'react';
import { 
  X, 
  Globe, 
  Share2, 
  Copy, 
  Check, 
  Download, 
  Flame, 
  Server,
  FileText,
  Layers
} from 'lucide-react';

export default function EvidencePanel({ 
  selectedEntity, 
  evidenceData, 
  onClose,
  onViewSubgraph,
  onViewLedger,
  onViewCluster
}) {
  const [copied, setCopied] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('summary');

  if (!selectedEntity) return null;

  const flag = evidenceData?.flag || selectedEntity.flag || (selectedEntity.is_flagged ? selectedEntity : null);
  const wallet = evidenceData?.wallet_details || selectedEntity;

  const entityId = selectedEntity.id || selectedEntity._id || selectedEntity.flagged_id || selectedEntity.entity_id;
  const riskScore = Number(wallet?.risk_score ?? flag?.risk_score ?? 0);
  const anomalyScore = Number(wallet?.anomaly_score ?? flag?.anomaly_score ?? 0);
  const entityClusterId = wallet?.entity_id ?? flag?.entity_cluster_id ?? flag?.cluster_id ?? '1';
  const isPeel = flag?.is_peel || (wallet?.peel_length && wallet.peel_length > 0);
  const embeddingNeighbors = wallet?.embedding_neighbors || flag?.embedding_neighbors || [];
  const reasons = flag?.reasons || [];
  const associatedIps = wallet?.associated_ips || flag?.associated_ips || (selectedEntity.node_type === 'ip' ? [selectedEntity.id] : ['194.26.29.112']);
  const associatedAsns = wallet?.associated_asns || flag?.associated_asns || ['AS9009 M247'];

  const isCriticalRisk = riskScore >= 0.65;

  const handleCopy = () => {
    navigator.clipboard.writeText(entityId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportDossier = () => {
    const report = {
      investigation_id: `INV-${Date.now()}`,
      target_entity: entityId,
      classification: isCriticalRisk ? 'CRITICAL THREAT' : 'INVESTIGATIVE LEAD',
      risk_score: riskScore,
      anomaly_score: anomalyScore,
      entity_cluster_id: entityClusterId,
      heuristics: {
        is_peeling_chain: Boolean(isPeel),
        common_input_cluster: entityClusterId,
        node2vec_soft_matches: embeddingNeighbors
      },
      telemetry: {
        associated_ips: associatedIps,
        associated_asns: associatedAsns
      },
      forensic_reasons: reasons,
      exported_at: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NTRO_Dossier_${entityId.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card" style={{
      width: '440px',
      maxHeight: 'calc(100vh - 90px)',
      height: '100%',
      overflowY: 'auto',
      padding: '20px',
      borderLeft: '3px solid var(--brand)',
      boxShadow: 'var(--shadow-xl)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      flexShrink: 0,
      background: 'var(--white)'
    }}>
      
      {/* Dossier Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <span className={`badge ${isCriticalRisk ? 'badge-crimson' : 'badge-amber'}`}>
              <Flame size={11} /> {isCriticalRisk ? 'Critical Priority' : 'Investigative Lead'}
            </span>
            <span className="badge badge-blue">
              Entity #{entityClusterId}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {entityId && entityId.length > 22 ? `${entityId.slice(0, 10)}...${entityId.slice(-6)}` : (entityId || 'Unknown')}
            </span>
            <button onClick={handleCopy} className="copy-btn" title="Copy entity ID">
              {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        <button onClick={onClose} className="btn btn-ghost btn-xs" style={{ padding: '4px 6px' }}>
          <X size={15} />
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="nav-pill-group" style={{ width: '100%' }}>
        {[
          { id: 'summary', label: 'Forensics' },
          { id: 'telemetry', label: 'Network / IP' },
          { id: 'heuristics', label: 'Heuristics' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`nav-pill ${activeSubTab === tab.id ? 'active' : ''}`}
            style={{ flex: 1, justifyContent: 'center', fontSize: '0.73rem' }}
          >
            {tab.label}
          </button>
        ))}
      </div>


      {/* Risk Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div style={{
          background: 'var(--gray-50)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '10px 12px'
        }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>
            Risk Score
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
            <span className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: isCriticalRisk ? 'var(--color-danger)' : 'var(--color-warning)' }}>
              {riskScore.toFixed(2)}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>/ 1.0</span>
          </div>
          <div className="risk-meter-bar" style={{ marginTop: '6px' }}>
            <div 
              className="risk-meter-fill"
              style={{
                width: `${Math.round(riskScore * 100)}%`,
                background: isCriticalRisk ? 'var(--color-danger)' : 'var(--color-warning)'
              }}
            />
          </div>
        </div>

        <div style={{
          background: 'var(--gray-50)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '10px 12px'
        }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>
            iForest Anomaly
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
            <span className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--brand)' }}>
              {anomalyScore.toFixed(2)}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>z-score</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: '6px' }}>
            Isolation Forest ML
          </div>
        </div>
      </div>

      {/* Tab: Forensics & Reasoning */}
      {activeSubTab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Synthesized Forensic Reasoning (NTRO §6.5)
            </span>
            <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {reasons.length === 0 ? (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  background: 'var(--color-danger-surface)',
                  border: '1px solid var(--color-danger-border)',
                  fontSize: '0.78rem',
                  lineHeight: 1.45,
                  color: 'var(--color-danger-text)'
                }}>
                  {flag?.summary || 'Target address exhibits anomalous structural out-degree and rapid succession peeling behavior.'}
                </div>
              ) : (
                reasons.map((r, i) => (
                  <div 
                    key={i}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'var(--gray-50)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.77rem',
                      lineHeight: 1.45,
                      color: 'var(--text-primary)',
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'flex-start'
                    }}
                  >
                    <span style={{ color: 'var(--color-danger)', fontWeight: 700, fontSize: '0.8rem' }}>•</span>
                    <span>{r}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Network Telemetry */}
      {activeSubTab === 'telemetry' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Correlated Network IPs
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              {associatedIps.map((ip, idx) => (
                <span key={idx} className="badge badge-purple mono" style={{ fontSize: '0.72rem' }}>
                  <Server size={10} /> {ip}
                </span>
              ))}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Associated Autonomous Systems (ASNs)
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              {associatedAsns.map((asn, idx) => (
                <span key={idx} className="badge badge-gray mono" style={{ fontSize: '0.72rem' }}>
                  <Globe size={10} /> {asn}
                </span>
              ))}
            </div>
          </div>

          <div style={{
            background: 'var(--gray-50)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '10px',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)'
          }}>
            <div><strong>First Seen:</strong> 2026-03-12 14:22:01 UTC</div>
            <div style={{ marginTop: '4px' }}><strong>Last Active:</strong> 2026-09-26 21:04:18 UTC</div>
            <div style={{ marginTop: '4px' }}><strong>Network Layer:</strong> P2P Broadcast node via Tor/VPN proxy</div>
          </div>
        </div>
      )}

      {/* Tab: Heuristics */}
      {activeSubTab === 'heuristics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Graph Heuristics (NTRO §6.2)
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--gray-50)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Common-Input Heuristic:</span>
                <span className="badge badge-blue">Cluster #{entityClusterId}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--gray-50)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Peeling Chain Detected:</span>
                <span className={`badge ${isPeel ? 'badge-amber' : 'badge-gray'}`}>
                  {isPeel ? 'YES (Hop Chain)' : 'NO'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--gray-50)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Soft Matches (Node2Vec):</span>
                <span className="badge badge-purple">{embeddingNeighbors.length} addresses</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Next-Step Forensic Investigation Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Investigative Next Steps
        </span>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button
            onClick={() => onViewSubgraph && onViewSubgraph(entityId)}
            className="btn btn-primary btn-sm"
            title="Focus and visualize target in link graph"
          >
            <Share2 size={13} />
            <span>Trace Subgraph</span>
          </button>

          {onViewLedger && (
            <button
              onClick={() => onViewLedger(entityId)}
              className="btn btn-secondary btn-sm"
              title="Inspect raw transaction flows for this entity"
            >
              <FileText size={13} color="var(--brand)" />
              <span>Ledger Flows</span>
            </button>
          )}

          {onViewCluster && (
            <button
              onClick={() => onViewCluster(entityClusterId)}
              className="btn btn-secondary btn-sm"
              title="Inspect multi-input co-spent cluster"
            >
              <Layers size={13} color="#a855f7" />
              <span>Cluster #{entityClusterId}</span>
            </button>
          )}

          <button
            onClick={handleExportDossier}
            className="btn btn-ghost btn-sm"
            title="Download complete evidence dossier report in JSON"
          >
            <Download size={13} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

    </div>
  );
}
