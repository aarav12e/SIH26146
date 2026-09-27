import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Share2, 
  UploadCloud, 
  Layers, 
  FileText, 
  RotateCcw,
  Sparkles,
  Activity,
  CheckCircle2,
  AlertCircle,
  Info,
  Zap,
  ChevronDown,
  LogOut,
  User,
  Lock
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  onReset, 
  backendStatus, 
  onQuickSeed, 
  seeding,
  stats,
  currentUser,
  onLogout,
  onShowLogin
}) {
  const [showStatusHelp, setShowStatusHelp] = useState(false);
  const isLive = backendStatus?.isLive;

  const navItems = [
    { id: 'flags',        label: 'Threat Flags',     icon: ShieldAlert,  count: stats?.flags_count ?? 23 },
    { id: 'graph',        label: 'Link Graph',        icon: Share2,       count: stats?.graph_edges_count ?? 304 },
    { id: 'clusters',     label: 'Entity Clusters',   icon: Layers,       count: stats?.clusters_count ?? 89 },
    { id: 'transactions', label: 'Ledger',            icon: FileText,     count: stats?.transactions_count ?? 65 },
    { id: 'ingest',       label: 'Ingest Data',       icon: UploadCloud },
  ];

  return (
    <header style={{ 
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(255,255,255,0.95)',
      borderBottom: '1px solid var(--border-subtle)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
        maxWidth: '1760px', margin: '0 auto', padding: '0 28px',
        height: '58px', gap: '16px'
      }}>
        
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <div style={{
            width: '32px', height: '32px',
            borderRadius: '9px',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(79,70,229,0.3)',
            flexShrink: 0
          }}>
            <Zap size={16} color="#fff" fill="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                NTRO Bitcoin Intelligence
              </span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', margin: '0 4px' }} />

          {/* Status indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', position: 'relative' }}>
            <span className={`pulse-indicator ${isLive ? 'pulse-emerald' : 'pulse-amber'}`} />
            <span style={{ 
              fontSize: '0.72rem', fontWeight: 500, 
              color: isLive ? 'var(--color-success)' : 'var(--color-warning)' 
            }}>
              {isLive ? 'Live' : 'Standalone Mode'}
            </span>
            <button 
              onClick={() => setShowStatusHelp(!showStatusHelp)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '1px', lineHeight: 1 }}
            >
              <Info size={11} />
            </button>

            {showStatusHelp && (
              <div className="tooltip" style={{ top: '28px', left: 0, width: '330px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                    {isLive 
                      ? <><CheckCircle2 size={13} color="var(--color-success)" /> Live Backend Connected</>
                      : <><AlertCircle size={13} color="var(--color-warning)" /> Standalone Mode</>
                    }
                  </strong>
                  <button onClick={() => setShowStatusHelp(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>✕</button>
                </div>
                <p style={{ color: 'var(--text-tertiary)', marginBottom: '8px', lineHeight: 1.5 }}>
                  {isLive 
                    ? 'Connected to Python FastAPI backend on port 8000.'
                    : '101 wallets, 65 transactions, 23 flags, and 89 clusters loaded in memory.'
                  }
                </p>
                {!isLive && (
                  <div style={{ background: 'var(--gray-50)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: '3px', fontSize: '0.7rem' }}>Start the live server:</span>
                    <code style={{ color: 'var(--brand)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>./run_all.sh</code>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="nav-pill-group">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`nav-pill ${isActive ? 'active' : ''}`}
              >
                <Icon size={13} />
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span className="count">{item.count}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            id="btn-reload-demo"
            onClick={() => onQuickSeed('csv')}
            disabled={seeding}
            className="btn btn-secondary btn-sm"
          >
            <Sparkles size={12} color="var(--brand)" className={seeding ? 'animate-spin' : ''} />
            <span>{seeding ? 'Loading…' : 'Reload Demo'}</span>
          </button>

          <button
            id="btn-reset"
            onClick={onReset}
            className="btn btn-ghost btn-sm"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>

          {/* Authenticated Investigator Profile & Sign Out or Officer Login */}
          {currentUser ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              paddingLeft: '10px', 
              marginLeft: '4px',
              borderLeft: '1.5px solid var(--border-subtle)' 
            }}>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {currentUser.name}
                </span>
                <span style={{ fontSize: '0.62rem', color: 'var(--brand)', fontFamily: 'var(--font-mono, monospace)', fontWeight: 600, lineHeight: 1.2 }}>
                  {currentUser.id}
                </span>
              </div>

              {onLogout && (
                <button
                  id="btn-signout"
                  onClick={onLogout}
                  className="btn btn-secondary btn-sm"
                  style={{ 
                    borderColor: 'var(--color-danger-border)',
                    color: 'var(--color-danger)', 
                    background: 'var(--color-danger-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontWeight: 700,
                    padding: '4px 10px'
                  }}
                  title="Sign Out & Lock Intelligence Terminal"
                >
                  <LogOut size={13} color="var(--color-danger)" />
                  <span>Log Out</span>
                </button>
              )}
            </div>
          ) : (
            <div style={{ paddingLeft: '8px', marginLeft: '4px', borderLeft: '1.5px solid var(--border-subtle)' }}>
              <button
                id="btn-signin"
                onClick={onShowLogin}
                className="btn btn-primary btn-sm"
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 700,
                  padding: '5px 12px'
                }}
              >
                <Lock size={13} />
                <span>Officer Login</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
