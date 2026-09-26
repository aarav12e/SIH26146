import React from 'react';
import { 
  X, 
  ShieldAlert, 
  CheckCircle2, 
  Globe, 
  Layers, 
  Repeat, 
  Radio, 
  Cpu, 
  Network,
  Share2,
  GitBranch
} from 'lucide-react';

export default function EvidencePanel({ 
  selectedEntity, 
  evidenceData, 
  onClose,
  onViewSubgraph
}) {
  if (!selectedEntity) return null;

  const flag = evidenceData?.flag || selectedEntity.flag || (selectedEntity.is_flagged ? selectedEntity : null);
  const wallet = evidenceData?.wallet_details || selectedEntity;
  const cluster = evidenceData?.cluster_context;

  const entityId = selectedEntity.id || selectedEntity._id || selectedEntity.flagged_id || selectedEntity.entity_id;
  const riskScore = wallet?.risk_score ?? flag?.risk_score ?? 0;
  const anomalyScore = wallet?.anomaly_score ?? flag?.anomaly_score ?? 0;
  const entityClusterId = wallet?.entity_id ?? flag?.entity_cluster_id ?? flag?.cluster_id ?? '1';
  const isPeel = flag?.is_peel || (wallet?.peel_length && wallet.peel_length > 0);
  const embeddingNeighbors = wallet?.embedding_neighbors || flag?.embedding_neighbors || [];
  const features = wallet?.features || flag?.feature_snapshot || {};

  const isCriticalRisk = riskScore >= 0.65;

  return (
    <div className="glass-panel" style={{
      width: '430px',
      maxHeight: 'calc(100vh - 120px)',
      overflowY: 'auto',
      padding: '24px',
      borderLeft: '2px solid var(--accent-indigo)',
      boxShadow: 'var(--shadow-card)',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className={`badge ${isCriticalRisk ? 'badge-crimson' : 'badge-amber'}`}>
              Investigative Lead
            </span>
            <span className="badge badge-purple">
              Entity #{entityClusterId}
            </span>
            {isPeel && (
              <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>
                <Repeat size={10} /> Peeling Walk
              </span>
            )}
          </div>
          <h3 className="mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', marginTop: '8px', wordBreak: 'break-all' }}>
            {entityId}
          </h3>
        </div>

        <button 
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Dual Scores Card: Risk Propagation & Anomaly Score */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.7)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '16px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px'
      }}>
        {/* Risk Score (Personalized PageRank) */}
        <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: '10px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Risk Score (PageRank)
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: isCriticalRisk ? '#fca5a5' : '#fbbf24', marginTop: '4px' }}>
            {riskScore.toFixed(3)}
          </div>
          <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
            Guilt-by-association propagation
          </div>
        </div>

        {/* Anomaly Score (Isolation Forest) */}
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Anomaly (iForest)
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
            {anomalyScore.toFixed(3)}
          </div>
          <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
            Unsupervised behavioral outlier
          </div>
        </div>
      </div>

      {/* Official NTRO Explainability Dossier */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <ShieldAlert size={16} color="var(--accent-crimson)" />
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Synthesized Evidence Dossier
          </h4>
        </div>

        {flag?.summary && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            borderLeft: '3px solid var(--accent-crimson)',
            padding: '10px 12px',
            borderRadius: '6px',
            fontSize: '0.775rem',
            color: '#fca5a5',
            lineHeight: 1.45,
            marginBottom: '12px'
          }}>
            {flag.summary}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(flag?.reasons || []).map((reason, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              fontSize: '0.775rem',
              color: 'var(--text-muted)',
              lineHeight: 1.35
            }}>
              <CheckCircle2 size={14} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{reason}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Node2Vec Soft Embedding Neighbors */}
      {embeddingNeighbors.length > 0 && (
        <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '10px', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <Network size={14} color="var(--accent-purple)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c084fc', textTransform: 'uppercase' }}>
              Node2Vec Soft Entity Neighbors
            </span>
          </div>
          <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginBottom: '8px' }}>
            High cosine similarity in graph embedding space (candidate same-entity rotating wallets):
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {embeddingNeighbors.slice(0, 3).map((w, idx) => (
              <span key={idx} className="mono" style={{ fontSize: '0.725rem', color: '#e0e7ff', background: 'rgba(15, 23, 42, 0.6)', padding: '4px 8px', borderRadius: '4px' }}>
                {w}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Engineered Features */}
      {Object.keys(features).length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Cpu size={16} color="var(--accent-cyan)" />
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Engineered Feature Metrics
            </h4>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            fontSize: '0.75rem'
          }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-dim)' }}>Fan-Out / Fan-In</div>
              <div className="mono" style={{ fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                {features.fan_out ?? 0} : {features.fan_in ?? 0} ({features.fan_ratio ?? 1}:1)
              </div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-dim)' }}>Velocity</div>
              <div className="mono" style={{ fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                {features.velocity ?? 0} tx/hr
              </div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-dim)' }}>Round Amount Freq</div>
              <div className="mono" style={{ fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                {Math.round((features.round_number_freq ?? 0) * 100)}%
              </div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-dim)' }}>IP Diversity</div>
              <div className="mono" style={{ fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                {features.ip_diversity ?? 0} distinct
              </div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-dim)' }}>Betweenness Centrality</div>
              <div className="mono" style={{ fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                {features.betweenness_centrality?.toFixed(5) ?? '0.000'}
              </div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-dim)' }}>Amount Variance</div>
              <div className="mono" style={{ fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                {features.amount_variance?.toFixed(4) ?? '0.000'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Associated IPs and ASNs */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Globe size={16} color="var(--accent-amber)" />
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Associated IPs & ASNs
          </h4>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {(wallet?.associated_ips || flag?.associated_ips || []).map((ip, i) => (
            <span key={i} className="badge badge-cyan mono" style={{ fontSize: '0.7rem' }}>
              {ip}
            </span>
          ))}
          {(wallet?.associated_asns || flag?.associated_asns || []).map((asn, i) => (
            <span key={i} className="badge badge-purple mono" style={{ fontSize: '0.7rem' }}>
              {asn}
            </span>
          ))}
        </div>
      </div>

      <button
        onClick={() => onViewSubgraph && onViewSubgraph(entityId)}
        className="btn btn-primary"
        style={{ width: '100%', marginTop: 'auto' }}
      >
        <Radio size={16} />
        <span>Expand Subgraph Neighborhood</span>
      </button>

    </div>
  );
}
