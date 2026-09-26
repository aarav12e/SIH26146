import React from 'react';
import { 
  Activity, 
  Wallet, 
  ShieldAlert, 
  GitFork, 
  Globe2, 
  Cpu,
  Layers,
  Repeat
} from 'lucide-react';

export default function MetricsOverview({ stats }) {
  if (!stats) return null;

  const cards = [
    {
      label: 'Transactions Ingested',
      value: stats.transactions_count || 0,
      sub: `${stats.graph_edges_count || 0} graph edges`,
      icon: Activity,
      color: 'var(--accent-cyan)',
      glow: 'rgba(6, 182, 212, 0.2)'
    },
    {
      label: 'Wallets Tracked',
      value: stats.wallets_count || 0,
      sub: `${stats.clusters_count || 0} Union-Find entities`,
      icon: Wallet,
      color: 'var(--accent-indigo)',
      glow: 'rgba(99, 102, 241, 0.2)'
    },
    {
      label: 'Prioritized Risk Leads',
      value: stats.flags_count || 0,
      sub: `${stats.high_severity_flags || 0} high risk score (>=0.60)`,
      icon: ShieldAlert,
      color: 'var(--accent-crimson)',
      glow: 'rgba(239, 68, 68, 0.25)',
      isAlert: (stats.flags_count || 0) > 0
    },
    {
      label: 'Peeling Chains Detected',
      value: stats.peeling_chains_count || 0,
      sub: 'Output-input graph walks',
      icon: Repeat,
      color: 'var(--accent-amber)',
      glow: 'rgba(245, 158, 11, 0.2)'
    },
    {
      label: 'Entity Clusters (DSU)',
      value: stats.clusters_count || 0,
      sub: 'Common-input heuristic',
      icon: Layers,
      color: 'var(--accent-purple)',
      glow: 'rgba(139, 92, 246, 0.2)'
    },
    {
      label: '4-Area Forensic Engine',
      value: 'PageRank + iForest',
      sub: 'Node2Vec & Peeling DFS',
      icon: Cpu,
      color: 'var(--accent-emerald)',
      glow: 'rgba(16, 185, 129, 0.2)'
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    }}>
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div
            key={idx}
            className={`glass-panel ${c.isAlert ? 'animate-pulse-red' : ''}`}
            style={{
              padding: '16px 20px',
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.2s',
              cursor: 'default'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {c.label}
              </span>
              <div style={{
                padding: '6px',
                borderRadius: '8px',
                background: c.glow,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon size={16} color={c.color} />
              </div>
            </div>

            <div style={{ fontSize: typeof c.value === 'number' ? '1.8rem' : '1.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '4px' }}>
              {c.value}
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {c.sub}
            </div>

            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: `linear-gradient(90deg, transparent, ${c.color}, transparent)`
            }} />
          </div>
        );
      })}
    </div>
  );
}
