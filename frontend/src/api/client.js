const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = {
  async getStats() {
    const res = await fetch(`${API_BASE}/stats/summary`);
    if (!res.ok) throw new Error('Failed to fetch summary stats');
    return res.json();
  },

  async ingestFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/ingest`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Ingestion error' }));
      throw new Error(err.detail || 'Failed to ingest file');
    }
    return res.json();
  },

  async runPipeline() {
    const res = await fetch(`${API_BASE}/analyze/run`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Analysis failed' }));
      throw new Error(err.detail || 'Pipeline execution failed');
    }
    return res.json();
  },

  async seedSampleData(format = 'csv') {
    const res = await fetch(`${API_BASE}/seed/sample-data?format_type=${format}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to seed sample dataset');
    return res.json();
  },

  async getFlags({ sortBy = 'score', clusterId, minScore = 0.0, search = '', limit = 100 } = {}) {
    const params = new URLSearchParams();
    if (sortBy) params.append('sort_by', sortBy);
    if (clusterId !== undefined && clusterId !== null && clusterId !== '') params.append('cluster_id', clusterId);
    if (minScore > 0) params.append('min_score', minScore);
    if (search) params.append('search', search);
    params.append('limit', limit);

    const res = await fetch(`${API_BASE}/flags?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch flags');
    return res.json();
  },

  async getFlagEvidence(flagId) {
    const res = await fetch(`${API_BASE}/flags/${encodeURIComponent(flagId)}`);
    if (!res.ok) throw new Error('Failed to fetch flag evidence');
    return res.json();
  },

  async getWallet(walletId) {
    const res = await fetch(`${API_BASE}/wallets/${encodeURIComponent(walletId)}`);
    if (!res.ok) throw new Error('Failed to fetch wallet info');
    return res.json();
  },

  async getWalletGraph(walletId, hops = 2) {
    const res = await fetch(`${API_BASE}/wallets/${encodeURIComponent(walletId)}/graph?hops=${hops}&max_nodes=60`);
    if (!res.ok) throw new Error('Failed to fetch wallet subgraph');
    return res.json();
  },

  async getFullGraph(maxNodes = 200) {
    const res = await fetch(`${API_BASE}/graph/full?max_nodes=${maxNodes}`);
    if (!res.ok) throw new Error('Failed to fetch full graph');
    return res.json();
  },

  async getClusters() {
    const res = await fetch(`${API_BASE}/clusters`);
    if (!res.ok) throw new Error('Failed to fetch clusters');
    return res.json();
  },

  async getClusterDetail(clusterId) {
    const res = await fetch(`${API_BASE}/clusters/${clusterId}`);
    if (!res.ok) throw new Error('Failed to fetch cluster details');
    return res.json();
  },

  async getTransactions({ page = 1, limit = 25, search = '' } = {}) {
    const params = new URLSearchParams({ page, limit });
    if (search) params.append('search', search);
    const res = await fetch(`${API_BASE}/transactions?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch transactions');
    return res.json();
  },

  async resetDatabase() {
    const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset database');
    return res.json();
  }
};
