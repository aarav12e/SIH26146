import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import MetricsOverview from './components/MetricsOverview';
import IngestionView from './components/IngestionView';
import FlagsTable from './components/FlagsTable';
import GraphView from './components/GraphView';
import EvidencePanel from './components/EvidencePanel';
import ClusterView from './components/ClusterView';
import TransactionsLedger from './components/TransactionsLedger';
import { apiClient } from './api/client';

export default function App() {
  const [activeTab, setActiveTab] = useState('flags');
  const [stats, setStats] = useState(null);
  const [flags, setFlags] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [evidenceData, setEvidenceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [graphHops, setGraphHops] = useState(2);

  const loadAllData = async () => {
    try {
      const statsRes = await apiClient.getStats();
      setStats(statsRes);

      const flagsRes = await apiClient.getFlags({ limit: 100 });
      setFlags(flagsRes.flags || []);

      const clustersRes = await apiClient.getClusters();
      setClusters(clustersRes.clusters || []);

      const graphRes = await apiClient.getFullGraph(250);
      setGraphData(graphRes);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleSelectFlag = async (flag) => {
    setSelectedEntity(flag);
    try {
      const evidence = await apiClient.getFlagEvidence(flag._id || flag.entity_id);
      setEvidenceData(evidence);
    } catch (err) {
      console.error('Error fetching flag evidence:', err);
    }
  };

  const handleNodeClick = async (node) => {
    setSelectedEntity(node);
    try {
      if (node.is_flagged) {
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

  const handleViewInGraph = async (walletId) => {
    setActiveTab('graph');
    setSelectedEntity({ id: walletId });
    try {
      const subg = await apiClient.getWalletGraph(walletId, graphHops);
      if (subg?.nodes?.length > 0) {
        setGraphData(subg);
      }
      const wallet = await apiClient.getWallet(walletId);
      setEvidenceData({ wallet_details: wallet, flag: wallet.flag });
    } catch (err) {
      console.error('Error loading subgraph:', err);
    }
  };

  const handleHopsChange = async (newHops) => {
    setGraphHops(newHops);
    if (selectedEntity?.id || selectedEntity?.entity_id) {
      const wid = selectedEntity.id || selectedEntity.entity_id;
      try {
        const subg = await apiClient.getWalletGraph(wid, newHops);
        setGraphData(subg);
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
      alert(`Seeding failed: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset all Bitcoin forensic data and clear collections?')) {
      try {
        await apiClient.resetDatabase();
        setSelectedEntity(null);
        setEvidenceData(null);
        await loadAllData();
      } catch (err) {
        alert(`Reset failed: ${err.message}`);
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onReset={handleReset}
        isLiveMongo={stats?.is_live_mongo}
        onQuickSeed={handleQuickSeed}
        seeding={seeding}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, maxWidth: '1600px', width: '100%', margin: '0 auto', padding: '24px 24px 40px 24px' }}>
        
        {/* Executive Metrics Overview */}
        <MetricsOverview stats={stats} />

        {/* Dynamic Views with Evidence Panel */}
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          
          <div style={{ flex: 1, minWidth: 0 }}>
            {activeTab === 'flags' && (
              <FlagsTable
                flags={flags}
                clusters={clusters}
                onSelectFlag={handleSelectFlag}
                onViewInGraph={handleViewInGraph}
                selectedFlagId={selectedEntity?._id || selectedEntity?.entity_id}
                onFilterChange={async (filters) => {
                  const res = await apiClient.getFlags(filters);
                  setFlags(res.flags || []);
                }}
              />
            )}

            {activeTab === 'graph' && (
              <GraphView
                graphData={graphData}
                onNodeClick={handleNodeClick}
                selectedNodeId={selectedEntity?.id || selectedEntity?.entity_id}
                onRefresh={loadAllData}
                loading={loading}
                hops={graphHops}
                onHopsChange={handleHopsChange}
              />
            )}

            {activeTab === 'ingest' && (
              <IngestionView
                onIngestionComplete={async () => {
                  await loadAllData();
                  setActiveTab('flags');
                }}
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
          </div>

          {/* Collapsible Evidence Dossier Drawer */}
          {selectedEntity && (
            <EvidencePanel
              selectedEntity={selectedEntity}
              evidenceData={evidenceData}
              onClose={() => {
                setSelectedEntity(null);
                setEvidenceData(null);
              }}
              onViewSubgraph={handleViewInGraph}
            />
          )}

        </div>

      </main>

    </div>
  );
}
