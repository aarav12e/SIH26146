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
  Lock,
  Globe
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
    { id: 'map',          label: 'Threat Map',       icon: Globe,        count: '3D/2D' },
    { id: 'graph',        label: 'Link Graph',        icon: Share2,       count: stats?.graph_edges_count ?? 304 },
    { id: 'clusters',     label: 'Entity Clusters',   icon: Layers,       count: stats?.clusters_count ?? 89 },
    { id: 'transactions', label: 'Ledger',            icon: FileText,     count: stats?.transactions_count ?? 65 },
    { id: 'ingest',       label: 'Ingest Data',       icon: UploadCloud },
  ];

  return (
    <header style={{ 
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(255,255,255,0.96)',
      borderBottom: '1px solid var(--border-subtle)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      width: '100%',
      overflowX: 'clip'
    }}>
      <div style={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
        width: '100%', maxWidth: '100%', margin: '0 auto', padding: '0 16px',
        height: '56px', gap: '10px'
      }}>
        
        {/* Brand & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{
            width: '28px', height: '28px',
            borderRadius: '7px',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(79,70,229,0.25)',
            flexShrink: 0
          }}>
            <Zap size={14} color="#fff" fill="#fff" />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
              NTRO Bitcoin Intelligence
            </span>
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)', margin: '0 2px' }} />

          {/* Status indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
            <span className={`pulse-indicator ${isLive ? 'pulse-emerald' : 'pulse-amber'}`} />
            <span style={{ 
              fontSize: '0.68rem', fontWeight: 600, 
              color: isLive ? 'var(--color-success)' : 'var(--color-warning)',
              whiteSpace: 'nowrap'
            }}>
              {isLive ? 'Live MongoDB' : 'Standalone'}
            </span>
            <button 
              onClick={() => setShowStatusHelp(!showStatusHelp)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '1px', lineHeight: 1 }}
            >
              <Info size={11} />
            </button>

            {showStatusHelp && (
              <div className="tooltip" style={{ top: '28px', left: 0, width: '300px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.80rem' }}>
                    {isLive 
                      ? <><CheckCircle2 size={13} color="var(--color-success)" /> Live Backend & MongoDB Active</>
                      : <><AlertCircle size={13} color="var(--color-warning)" /> Offline Enclave Mode</>
                    }
                  </strong>
                  <button onClick={() => setShowStatusHelp(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>✕</button>
                </div>
                <p style={{ color: 'var(--text-tertiary)', marginBottom: '8px', lineHeight: 1.4, fontSize: '0.74rem' }}>
                  {isLive 
                    ? 'Connected to Python FastAPI backend & MongoDB on port 8000.'
                    : '101 wallets, 65 transactions, 23 flags, and 89 clusters loaded in memory.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-pill-group" style={{ flexShrink: 1, overflowX: 'auto' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`nav-pill ${isActive ? 'active' : ''}`}
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              >
                <Icon size={12} />
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span className="count" style={{ fontSize: '0.62rem' }}>{item.count}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Actions & Compact Officer Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button
            id="btn-reload-demo"
            onClick={() => onQuickSeed('csv')}
            disabled={seeding}
            className="btn btn-secondary btn-xs"
            style={{ padding: '4px 8px', height: '28px' }}
            title="Reload Calibrated Demo Scenario"
          >
            <Sparkles size={11} color="var(--brand)" className={seeding ? 'animate-spin' : ''} />
            <span>{seeding ? '...' : 'Demo Data'}</span>
          </button>

          <button
            id="btn-reset"
            onClick={onReset}
            className="btn btn-ghost btn-xs"
            style={{ padding: '4px 8px', height: '28px' }}
            title="Reset Forensic Database"
          >
            <RotateCcw size={11} />
            <span>Reset</span>
          </button>

          {/* Unified Compact Officer Badge + Logout */}
          {currentUser ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              background: 'var(--gray-50)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '2px 6px',
              height: '32px'
            }}>
              <div style={{
                width: '20px', height: '20px',
                borderRadius: '5px',
                background: 'var(--brand-surface)',
                border: '1px solid var(--brand-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <User size={11} color="var(--brand)" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                  {currentUser.name.split(' ')[0]} {currentUser.name.split(' ')[1] || ''}
                </span>
                <span style={{ fontSize: '0.58rem', color: 'var(--brand)', fontFamily: 'var(--font-mono, monospace)', fontWeight: 600, lineHeight: 1.1 }}>
                  {currentUser.id}
                </span>
              </div>

              {onLogout && (
                <button
                  id="btn-signout"
                  onClick={onLogout}
                  className="btn btn-ghost btn-xs"
                  style={{ 
                    padding: '2px 4px',
                    height: '22px',
                    color: 'var(--color-danger)',
                    marginLeft: '2px'
                  }}
                  title="Sign Out & Lock Intelligence Terminal"
                >
                  <LogOut size={12} color="var(--color-danger)" />
                </button>
              )}
            </div>
          ) : (
            <button
              id="btn-signin"
              onClick={onShowLogin}
              className="btn btn-primary btn-xs"
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontWeight: 700,
                padding: '4px 10px',
                height: '28px'
              }}
            >
              <Lock size={12} />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
