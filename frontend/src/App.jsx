import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import MetricsOverview from './components/MetricsOverview';
import IngestionView from './components/IngestionView';
import FlagsTable from './components/FlagsTable';
import GraphView from './components/GraphView';
import EvidencePanel from './components/EvidencePanel';
import ClusterView from './components/ClusterView';
import TransactionsLedger from './components/TransactionsLedger';
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './components/LoginPage';
import { apiClient } from './api/client';
import { 
  RefreshCw,
  X
} from 'lucide-react';

const VALID_TABS = ['flags', 'graph', 'clusters', 'transactions', 'ingest'];

const TAB_URL_MAP = {
  flags: '/flags',
  graph: '/graph',
  clusters: '/clusters',
  transactions: '/transactions',
  ingest: '/ingest'
};

const TAB_PAGE_TITLES = {
  flags: 'Threat Flags & Triage · NTRO Bitcoin Intelligence',
  graph: 'Forensic Link Graph · NTRO Bitcoin Intelligence',
  clusters: 'Entity Clusters · NTRO Bitcoin Intelligence',
  transactions: 'UTXO Ledger Explorer · NTRO Bitcoin Intelligence',
  ingest: 'Data Ingestion & Pipeline · NTRO Bitcoin Intelligence'
};

function getTabFromUrl() {
  if (typeof window === 'undefined') return 'flags';
  // 1. Check pathname: /graph -> 'graph'
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
  if (VALID_TABS.includes(path)) return path;

  // 2. Check hash fallback: #/graph or #graph
  const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  if (VALID_TABS.includes(hash)) return hash;

  return 'flags';
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ntro_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [showLoginScreen, setShowLoginScreen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => getTabFromUrl());
  const [stats, setStats] = useState(null);
  const [flags, setFlags] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [evidenceData, setEvidenceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [graphHops, setGraphHops] = useState(2);
  const [backendStatus, setBackendStatus] = useState({ isLive: false, mode: 'standalone_demo', port: 8000 });
  const [showBanner, setShowBanner] = useState(true);

  // Synchronize browser URL bar and Document Title whenever activeTab changes
  useEffect(() => {
    const targetPath = TAB_URL_MAP[activeTab] || '/flags';
    const currentPath = window.location.pathname;
    if (currentPath !== targetPath && !(currentPath === '/' && activeTab === 'flags')) {
      window.history.pushState({ tab: activeTab }, '', targetPath);
    }
    document.title = TAB_PAGE_TITLES[activeTab] || 'NTRO Bitcoin Intelligence';
  }, [activeTab]);

  // Support Browser Back / Forward buttons and Hash changes
  useEffect(() => {
    const handleNavigation = () => {
      const currentTab = getTabFromUrl();
      setActiveTab(currentTab);
    };
    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);
    return () => {
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('hashchange', handleNavigation);
    };
  }, []);

  // Subscribe to backend health status updates
  useEffect(() => {
    const unsubscribe = apiClient.subscribeStatus((status) => {
      setBackendStatus(status);
    });
    apiClient.checkHealth();
    return unsubscribe;
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const statsRes = await apiClient.getStats();
      setStats(statsRes);

      const flagsRes = await apiClient.getFlags({ limit: 100 });
      setFlags(flagsRes.flags || []);

      const clustersRes = await apiClient.getClusters();
      setClusters(clustersRes.clusters || []);

      const graphRes = await apiClient.getFullGraph(250);
      setGraphData(graphRes || { nodes: [], links: [] });
    } catch (err) {
      console.warn('Data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // When investigator clicks any threat lead in the table
  const handleSelectFlag = async (flag) => {
    setSelectedEntity(flag);
    try {
      const evidence = await apiClient.getFlagEvidence(flag._id || flag.flagged_id || flag.entity_id);
      setEvidenceData(evidence);
    } catch (err) {
      console.error('Error fetching flag evidence:', err);
    }
  };

  // When investigator clicks a node inside Link Graph
  const handleNodeClick = async (node) => {
    setSelectedEntity(node);
    try {
      if (node.is_flagged || node.node_type === 'wallet') {
        const evidence = await apiClient.getFlagEvidence(node.id);
        setEvidenceData(evidence);
      } else {
        const wallet = await apiClient.getWallet(node.id);
        setEvidenceData({ wallet_details: wallet });
      }
    } catch (err) {
      console.error('Error fetching node details:', err);
    }
  };

  // Next-step Action 1: Trace Entity in Link Graph
  const handleViewInGraph = async (walletId) => {
    setActiveTab('graph');
    setSelectedEntity({ id: walletId, node_type: 'wallet' });
    try {
      const subg = await apiClient.getWalletGraph(walletId, graphHops);
      if (subg?.nodes?.length > 0) {
        setGraphData(subg);
      }
      const wallet = await apiClient.getWallet(walletId);
      setEvidenceData({ wallet_details: wallet, flag: wallet?.flag });
    } catch (err) {
      console.error('Error loading subgraph:', err);
    }
  };

  // Next-step Action 2: Inspect in Forensic Ledger
  const handleViewInLedger = (_walletId) => {
    setActiveTab('transactions');
  };

  // Next-step Action 3: Inspect Louvain Community Cluster
  const handleViewInCluster = (_clusterId) => {
    setActiveTab('clusters');
  };

  const handleHopsChange = async (newHops) => {
    setGraphHops(newHops);
    if (selectedEntity?.id || selectedEntity?.entity_id || selectedEntity?.flagged_id) {
      const wid = selectedEntity.id || selectedEntity.entity_id || selectedEntity.flagged_id;
      try {
        const subg = await apiClient.getWalletGraph(wid, newHops);
        if (subg?.nodes?.length > 0) {
          setGraphData(subg);
        }
      } catch (err) {
        console.error('Error updating hops:', err);
      }
    }
  };

  const handleQuickSeed = async (format = 'csv') => {
    setSeeding(true);
    try {
      await apiClient.seedSampleData(format);
      await loadAllData();
      setActiveTab('flags');
    } catch (err) {
      console.error('Seeding error:', err);
    } finally {
      setSeeding(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset all Bitcoin forensic data back to clean baseline state?')) {
      try {
        await apiClient.resetDatabase();
        setSelectedEntity(null);
        setEvidenceData(null);
        await loadAllData();
      } catch (err) {
        console.error('Reset error:', err);
      }
    }
  };

  const handleShowFullGraph = async () => {
    setLoading(true);
    try {
      const g = await apiClient.getFullGraph(250);
      if (g?.nodes?.length > 0) {
        setGraphData(g);
      }
    } catch (err) {
      console.error('Error loading full graph:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'ingest') {
      setSelectedEntity(null);
      setEvidenceData(null);
    } else if (tabId === 'graph' && (!graphData?.nodes || graphData.nodes.length <= 15)) {
      handleShowFullGraph();
    }
  };

  if (!currentUser || showLoginScreen) {
    return (
      <LoginPage 
        onLogin={(userProfile) => {
          setCurrentUser(userProfile);
          setShowLoginScreen(false);
        }} 
        onCancel={currentUser ? () => setShowLoginScreen(false) : null}
      />
    );
  }

  return (
    <div className={`app-container ${activeTab === 'graph' ? 'graph-viewport-mode' : ''}`}>
      
      {/* Top Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onReset={handleReset}
        backendStatus={backendStatus}
        onQuickSeed={handleQuickSeed}
        seeding={seeding}
        stats={stats}
        currentUser={currentUser}
        onShowLogin={() => setShowLoginScreen(true)}
        onLogout={() => {
          localStorage.removeItem('ntro_auth_user');
          setCurrentUser(null);
          setShowLoginScreen(true);
        }}
      />

      {/* Offline / Standalone Forensics Status Banner */}
      {!backendStatus.isLive && showBanner && (
        <div className="status-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="badge badge-cyan">Preloaded Dataset</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>101 Wallets</strong>
              {' · '}
              <strong style={{ color: 'var(--text-primary)' }}>65 Transactions</strong>
              {' · '}
              <strong style={{ color: 'var(--text-primary)' }}>23 Flags</strong>
              {' · '}
              <strong style={{ color: 'var(--text-primary)' }}>89 Clusters</strong>
              {' — all loaded in memory.'}
            </span>
            <span className="dot-sep" />
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
              Start live server: <code style={{ color: 'var(--brand)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>./run_all.sh</code>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => apiClient.checkHealth().then(() => loadAllData())}
              className="btn btn-ghost btn-xs"
            >
              <RefreshCw size={11} />
              <span>Retry</span>
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="btn btn-ghost btn-xs"
              style={{ padding: '3px 6px' }}
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Workspace */}
      <main className="main-content">
        
        {/* Executive Metrics Overview - Visible only on the main Threat Flags triage & overview section */}
        {activeTab === 'flags' && (
          <MetricsOverview stats={stats} onNavigateTab={handleTabChange} />
        )}

        {/* Dynamic Views & Collapsible Dossier Drawer protected by ErrorBoundary */}
        <div 
          className={activeTab === 'graph' ? 'graph-workspace-flex' : ''} 
          style={activeTab === 'graph' ? undefined : { display: 'flex', gap: '20px', alignItems: 'flex-start' }}
        >
          
          <div 
            className={activeTab === 'graph' ? 'graph-container-col' : ''} 
            style={activeTab === 'graph' ? undefined : { flex: 1, minWidth: 0 }}
          >
            <ErrorBoundary>
              {activeTab === 'flags' && (
                <FlagsTable
                  flags={flags}
                  clusters={clusters}
                  onSelectFlag={handleSelectFlag}
                  onViewInGraph={handleViewInGraph}
                  selectedFlagId={selectedEntity?._id || selectedEntity?.flagged_id || selectedEntity?.entity_id}
                  onFilterChange={async (filters) => {
                    const res = await apiClient.getFlags(filters);
                    setFlags(res.flags || []);
                  }}
                  onReloadDemo={() => handleQuickSeed('csv')}
                />
              )}

              {activeTab === 'graph' && (
                <GraphView
                  graphData={graphData}
                  onNodeClick={handleNodeClick}
                  selectedNodeId={selectedEntity?.id || selectedEntity?.entity_id || selectedEntity?.flagged_id}
                  onRefresh={loadAllData}
                  onShowFullGraph={handleShowFullGraph}
                  loading={loading}
                  hops={graphHops}
                  onHopsChange={handleHopsChange}
                />
              )}

              {activeTab === 'clusters' && (
                <ClusterView
                  clusters={clusters}
                  onSelectWallet={handleViewInGraph}
                />
              )}

              {activeTab === 'transactions' && (
                <TransactionsLedger
                  onSelectWallet={handleViewInGraph}
                />
              )}

              {activeTab === 'ingest' && (
                <IngestionView
                  onIngestionComplete={async () => {
                    await loadAllData();
                  }}
                  onNavigateTab={handleTabChange}
                />
              )}
            </ErrorBoundary>
          </div>

          {/* Forensic Evidence Dossier Slide-Over Drawer */}
          {selectedEntity && activeTab !== 'ingest' && (
            <ErrorBoundary>
              <EvidencePanel
                selectedEntity={selectedEntity}
                evidenceData={evidenceData}
                onClose={() => {
                  setSelectedEntity(null);
                  setEvidenceData(null);
                }}
                onViewSubgraph={handleViewInGraph}
                onViewLedger={handleViewInLedger}
                onViewCluster={handleViewInCluster}
              />
            </ErrorBoundary>
          )}

        </div>

      </main>

    </div>
  );
}
