import React from 'react';
import { 
  ShieldAlert, 
  Share2, 
  UploadCloud, 
  Network, 
  Layers, 
  FileText, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onReset, isLiveMongo, onQuickSeed, seeding }) {
  const navItems = [
    { id: 'flags', label: 'Threat Flags', icon: ShieldAlert, countBadge: null },
    { id: 'graph', label: 'Link Graph Analysis', icon: Share2 },
    { id: 'ingest', label: 'Data Ingestion', icon: UploadCloud },
    { id: 'clusters', label: 'Communities (Louvain)', icon: Layers },
    { id: 'transactions', label: 'Transactions Ledger', icon: FileText },
  ];

  return (
    <header className="glass-panel" style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none', padding: '12px 24px', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1600px', margin: '0 auto' }}>
        
        {/* Brand / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
          }}>
            <Network size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                BITCOIN FORENSICS
              </span>
              <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
                NTRO · SIH26146
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>AI P2P Traffic & Entity Intelligence</span>
              <span>•</span>
              <span style={{ color: isLiveMongo ? '#10b981' : '#38bdf8' }}>
                {isLiveMongo ? '● MongoDB Connected' : '● Offline Embedded Store'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(15, 23, 42, 0.6)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: isActive ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-muted)',
                  boxShadow: isActive ? '0 2px 10px rgba(99, 102, 241, 0.4)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Top Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => onQuickSeed('csv')}
            disabled={seeding}
            className="btn btn-primary btn-sm"
            title="Preload synthetic multi-threat Bitcoin traffic and auto-run pipeline"
          >
            <Sparkles size={14} className={seeding ? 'animate-spin' : ''} />
            <span>{seeding ? 'Processing...' : '1-Click Demo Data'}</span>
          </button>

          <button
            onClick={onReset}
            className="btn btn-ghost btn-sm"
            title="Clear all stored entities and reset database"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>

      </div>
    </header>
  );
}
