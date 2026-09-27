import React from 'react';
import { 
  Activity, 
  Wallet, 
  ShieldAlert, 
  Repeat, 
  Layers, 
  GitFork,
  ArrowRight
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
      label: 'Transactions analyzed',
      value: (data.transactions_count ?? 65).toLocaleString(),
      sub: 'Recorded Bitcoin activity',
      meta: `${data.graph_edges_count ?? 304} directed flows`,
      badge: 'Activity',
      badgeColor: 'var(--color-info)',
      badgeBg: 'var(--color-info-surface)',
      badgeBorder: 'var(--color-info-border)',
      icon: Activity,
      accentColor: 'var(--color-info)',
      targetTab: 'transactions'
    },
    {
      id: 'wallets',
      label: 'Wallets identified',
      value: (data.wallets_count ?? 101).toLocaleString(),
      sub: 'Addresses in this network',
      meta: `${data.clusters_count ?? 89} Louvain clusters`,
      badge: 'Entities',
      badgeColor: 'var(--brand)',
      badgeBg: 'var(--brand-surface)',
      badgeBorder: 'var(--brand-border)',
      icon: Wallet,
      accentColor: 'var(--brand)',
      targetTab: 'graph'
    },
    {
      id: 'flags',
      label: 'Threat flags',
      value: (data.flags_count ?? 23).toLocaleString(),
      sub: `${data.high_severity_flags ?? 12} need priority review`,
      meta: 'Isolation Forest + Heuristics',
      badge: 'Review first',
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
      label: 'Suspected peeling chains',
      value: (data.peeling_chains_count ?? 5).toLocaleString(),
      sub: 'Wallets passing funds onward',
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
      label: 'Wallet clusters',
      value: (data.clusters_count ?? 89).toLocaleString(),
      sub: 'Addresses linked by shared activity',
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
      label: 'Mixing patterns',
      value: (data.coinjoin_mix_count ?? 8).toLocaleString(),
      sub: 'Possible transaction obfuscation',
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
    <div className="metrics-overview" style={{
      marginBottom: '22px'
    }}>
      <div className="overview-intro">
        <div>
          <span className="overview-kicker">Bitcoin intelligence workspace</span>
          <h1>Investigation overview</h1>
          <p>Start with a priority flag, then trace wallets and review the evidence.</p>
        </div>
        <div className="overview-path" aria-label="Investigation workflow">
          <span className="overview-path-step"><b>01</b> Review</span>
          <ArrowRight size={14} aria-hidden="true" />
          <span className="overview-path-step"><b>02</b> Trace</span>
          <ArrowRight size={14} aria-hidden="true" />
          <span className="overview-path-step"><b>03</b> Verify</span>
        </div>
      </div>
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onNavigateTab && c.targetTab && onNavigateTab(c.targetTab)}
            className={`stat-overview-card ${c.isAlert ? 'alert' : ''}`}
            aria-label={`${c.label}: ${c.value}. Open ${c.targetTab} view.`}
            style={{ '--card-accent': c.accentColor, '--card-surface': c.badgeBg, animationDelay: `${cards.indexOf(c) * 55}ms` }}
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

          </button>
        );
      })}
    </div>
  );
}
