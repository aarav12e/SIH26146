import React from 'react';
import { 
  Activity, 
  Wallet, 
  ShieldAlert, 
  Repeat, 
  Layers, 
  GitFork,
  ArrowRight,
  ShieldCheck,
  Cpu
} from 'lucide-react';

export default function MetricsOverview({ stats, onNavigateTab }) {
  const data = stats || {
    transactions_count: 65,
    wallets_count: 101,
    flags_count: 23,
    high_severity_flags: 12,
    clusters_count: 89,
    graph_edges_count: 304,
    peeling_chains_count: 5,
    coinjoin_mix_count: 8
  };

  const cards = [
    {
      id: 'txs',
      label: 'Transactions Indexed',
      value: (data.transactions_count ?? 65).toLocaleString(),
      sub: 'UTXO graph traces',
      meta: `${data.graph_edges_count ?? 304} directed flows`,
      badge: 'Blockchain',
      badgeColor: 'var(--color-info)',
      badgeBg: 'var(--color-info-surface)',
      badgeBorder: 'var(--color-info-border)',
      icon: Activity,
      accentColor: 'var(--color-info)',
      targetTab: 'transactions'
    },
    {
      id: 'wallets',
      label: 'Monitored Entities',
      value: (data.wallets_count ?? 101).toLocaleString(),
      sub: 'Unique wallet addresses',
      meta: `${data.clusters_count ?? 89} Louvain clusters`,
      badge: 'Resolved',
      badgeColor: 'var(--brand)',
      badgeBg: 'var(--brand-surface)',
      badgeBorder: 'var(--brand-border)',
      icon: Wallet,
      accentColor: 'var(--brand)',
      targetTab: 'graph'
    },
    {
      id: 'flags',
      label: 'Forensic Threat Leads',
      value: (data.flags_count ?? 23).toLocaleString(),
      sub: `${data.high_severity_flags ?? 12} critical priority`,
      meta: 'Isolation Forest + Heuristics',
      badge: 'High Priority',
      badgeColor: 'var(--color-danger)',
      badgeBg: 'var(--color-danger-surface)',
      badgeBorder: 'var(--color-danger-border)',
      icon: ShieldAlert,
      accentColor: 'var(--color-danger)',
      isAlert: true,
      targetTab: 'flags'
    },
    {
      id: 'peels',
      label: 'Peeling Chains',
      value: (data.peeling_chains_count ?? 5).toLocaleString(),
      sub: 'Rapid hopping series',
      meta: 'DFS peel heuristic',
      badge: 'Hop Analysis',
      badgeColor: 'var(--color-warning)',
      badgeBg: 'var(--color-warning-surface)',
      badgeBorder: 'var(--color-warning-border)',
      icon: Repeat,
      accentColor: 'var(--color-warning)',
      targetTab: 'flags'
    },
    {
      id: 'clusters',
      label: 'Co-Spend Clusters',
      value: (data.clusters_count ?? 89).toLocaleString(),
      sub: 'Multi-input entities',
      meta: 'DSU Modularity Q=0.74',
      badge: 'Louvain DSU',
      badgeColor: 'var(--color-purple)',
      badgeBg: 'var(--color-purple-surface)',
      badgeBorder: 'var(--color-purple-border)',
      icon: Layers,
      accentColor: 'var(--color-purple)',
      targetTab: 'clusters'
    },
    {
      id: 'coinjoin',
      label: 'Mixing & CoinJoin',
      value: (data.coinjoin_mix_count ?? 8).toLocaleString(),
      sub: 'Equal-denomination pool',
      meta: 'Whirlpool / Wasabi patterns',
      badge: 'Anonymity Pool',
      badgeColor: 'var(--color-cyan)',
      badgeBg: 'var(--color-cyan-surface)',
      badgeBorder: 'var(--color-cyan-border)',
      icon: GitFork,
      accentColor: 'var(--color-cyan)',
      targetTab: 'flags'
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '12px',
      marginBottom: '22px'
    }}>
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.id}
            onClick={() => onNavigateTab && c.targetTab && onNavigateTab(c.targetTab)}
            style={{
              background: 'var(--white)',
              border: c.isAlert ? '1px solid var(--color-danger-border)' : '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 18px',
              boxShadow: 'var(--shadow-xs)',
              transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: onNavigateTab ? 'pointer' : 'default',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.borderColor = c.isAlert ? 'var(--color-danger)' : 'var(--border-default)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = c.isAlert ? 'var(--color-danger-border)' : 'var(--border-subtle)';
            }}
          >
            {/* Top row: Section Label + Tag */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px', height: '28px',
                  borderRadius: '6px',
                  background: c.badgeBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon size={14} color={c.accentColor} />
                </div>
                <span style={{ 
                  fontSize: '0.68rem', 
                  fontWeight: 700, 
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: 'var(--text-tertiary)' 
                }}>
                  {c.label}
                </span>
              </div>

              <span style={{
                fontSize: '0.62rem',
                fontWeight: 600,
                color: c.badgeColor,
                background: c.badgeBg,
                border: `1px solid ${c.badgeBorder}`,
                padding: '1px 6px',
                borderRadius: '4px'
              }}>
                {c.badge}
              </span>
            </div>

            {/* Middle: Crisp Numeral Value */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '4px 0 6px 0' }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.9rem',
                fontWeight: 800,
                color: c.isAlert ? 'var(--color-danger)' : 'var(--text-primary)',
                letterSpacing: '-0.03em',
                lineHeight: 1
              }}>
                {c.value}
              </span>
              <span style={{ 
                fontSize: '0.72rem', 
                color: 'var(--text-tertiary)',
                fontWeight: 500 
              }}>
                {c.sub}
              </span>
            </div>

            {/* Bottom: Authentic Forensic Metadata Sub-line */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '10px',
              marginTop: '4px',
              borderTop: '1px solid var(--border-faint)',
              fontSize: '0.7rem',
              color: 'var(--text-tertiary)'
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.67rem' }}>
                {c.meta}
              </span>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: c.accentColor,
                opacity: 0.8
              }} />
            </div>

          </div>
        );
      })}
    </div>
  );
}
