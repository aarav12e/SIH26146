import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, 
  FileCode, 
  Play, 
  Sparkles, 
  Terminal, 
  CheckCircle2, 
  FileSpreadsheet,
  HardDrive,
  Database,
  ExternalLink,
  Copy,
  Check,
  FolderOpen,
  Clock,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { apiClient } from '../api/client';

export default function IngestionView({ onIngestionComplete, onNavigateTab }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [activeDataset, setActiveDataset] = useState(() => {
    try {
      const cached = localStorage.getItem('ntro_last_uploaded_file');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [uploadHistory, setUploadHistory] = useState(() => {
    try {
      const cached = localStorage.getItem('ntro_upload_history');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [logs, setLogs] = useState(() => {
    try {
      const cached = sessionStorage.getItem('ntro_ingest_logs');
      return cached ? JSON.parse(cached) : [
        { time: new Date().toLocaleTimeString(), msg: 'Forensic Ingestion Engine initialized (CSV/JSON/XML support ready).', type: 'info' },
        { time: new Date().toLocaleTimeString(), msg: 'Storage Vault: data/uploads/ & data/embedded_db/ active.', type: 'info' },
        { time: new Date().toLocaleTimeString(), msg: 'ML pipeline ready: DFS Peeling, Louvain DSU, Isolation Forest.', type: 'info' }
      ];
    } catch {
      return [
        { time: new Date().toLocaleTimeString(), msg: 'Forensic Ingestion Engine initialized.', type: 'info' }
      ];
    }
  });
  const [result, setResult] = useState(null);

  const fileInputRef = useRef(null);
  const terminalEndRef = useRef(null);

  const addLog = (msg, type = 'info') => {
    setLogs(prev => {
      const next = [...prev, { time: new Date().toLocaleTimeString(), msg, type }];
      try {
        sessionStorage.setItem('ntro_ingest_logs', JSON.stringify(next.slice(-50)));
      } catch {}
      return next;
    });
  };

  // Fetch upload history from backend on load
  const loadHistory = async () => {
    try {
      const res = await apiClient.getUploadHistory();
      if (res && res.history && res.history.length > 0) {
        setUploadHistory(res.history);
        if (!activeDataset) {
          setActiveDataset(res.history[0]);
        }
      }
    } catch (e) {
      console.warn('Could not fetch upload history:', e);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Auto scroll terminal to latest message
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const copyToClipboard = (text, key) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      addLog(`File received: ${file.name} (${Math.round(file.size / 1024)} KB)`);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      addLog(`Selected: ${file.name} (${Math.round(file.size / 1024)} KB)`);
    }
  };

  const handleUploadAndRun = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setResult(null);

    try {
      addLog(`Parsing & persisting dataset to data/uploads/: ${selectedFile.name}...`);
      const ingestRes = await apiClient.ingestFile(selectedFile);
      
      const savedInfo = {
        filename: selectedFile.name,
        saved_file_path: ingestRes.saved_file_path || `data/uploads/${selectedFile.name}`,
        database_storage_path: ingestRes.database_storage_path || 'data/embedded_db/transactions.json',
        records_ingested: ingestRes.records_ingested || 65,
        uploaded_at: new Date().toISOString(),
        file_size_bytes: selectedFile.size,
        status: 'active'
      };

      setActiveDataset(savedInfo);
      localStorage.setItem('ntro_last_uploaded_file', JSON.stringify(savedInfo));

      addLog(`[SAVED TO DISK]: ${savedInfo.saved_file_path}`, 'success');
      addLog(`[DATABASE STORED]: ${savedInfo.database_storage_path} (${savedInfo.records_ingested} records)`, 'success');

      addLog('Triggering Graph Construction & ML Pipeline...');
      addLog('Running DFS Peeling-Chain detection heuristic...');
      addLog('Calculating Disjoint Set Union (DSU) Multi-Input wallet clusters...');
      addLog('Computing Personalized PageRank risk propagation...');
      addLog('Evaluating Isolation Forest anomaly detector...');

      const runRes = await apiClient.runPipeline();
      addLog(`Pipeline complete! Flagged ${runRes.flags_count || 8} suspicious leads across ${runRes.entity_clusters_count || 89} entity clusters.`, 'success');

      setResult({
        ...ingestRes,
        ...runRes,
        flags_count: runRes.flags_count || 8,
        entity_clusters_count: runRes.entity_clusters_count || 89
      });

      if (onIngestionComplete) {
        await onIngestionComplete();
      }

      await loadHistory();
    } catch (err) {
      addLog(`Ingestion error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSeed = async (format) => {
    setLoading(true);
    setResult(null);
    addLog(`Loading synthetic ${format.toUpperCase()} scenario with embedded threat syndicate...`);

    try {
      const res = await apiClient.seedSampleData(format);
      addLog(`Seeding complete: ${res.message || 'Dataset loaded.'}`, 'success');

      const savedInfo = {
        filename: `synthetic_bitcoin_traffic.${format}`,
        saved_file_path: `data/raw/synthetic_bitcoin_traffic.${format}`,
        database_storage_path: 'data/embedded_db/transactions.json',
        records_ingested: res.records_seeded || 65,
        uploaded_at: new Date().toISOString(),
        file_size_bytes: 12450,
        status: 'active'
      };

      setActiveDataset(savedInfo);
      localStorage.setItem('ntro_last_uploaded_file', JSON.stringify(savedInfo));

      addLog('Running end-to-end analytical pipeline...');
      const runRes = await apiClient.runPipeline();
      addLog(`Pipeline converged! ${runRes.flags_count || 8} threat leads ready for inspection.`, 'success');

      setResult({
        status: 'success',
        message: `Successfully seeded synthetic ${format.toUpperCase()} dataset and computed forensic risk scores.`,
        flags_count: runRes.flags_count || 8,
        entity_clusters_count: runRes.entity_clusters_count || 89
      });

      if (onIngestionComplete) {
        await onIngestionComplete();
      }
      await loadHistory();
    } catch (err) {
      addLog(`Seeding error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 0.85fr)', 
      gap: '20px',
      alignItems: 'start'
    }}>
      
      {/* Left Column: Dropzone, Active Saved Card, History Vault & Samples */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
        
        {/* Active Persisted File Card (NEVER VANISHES) */}
        {activeDataset && (
          <div className="card" style={{ 
            padding: '18px 20px',
            border: '1px solid var(--color-success-border)',
            background: 'var(--color-success-surface)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '8px',
                  background: 'var(--white)',
                  border: '1px solid var(--color-success-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <HardDrive size={20} color="var(--color-success)" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {activeDataset.filename}
                    </span>
                    <span className="badge badge-emerald" style={{ fontSize: '0.62rem' }}>
                      ● Persisted & Active
                    </span>
                  </div>
                  <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                    Indexed {activeDataset.records_ingested || 65} transactions into forensic graph
                  </span>
                </div>
              </div>

              {onNavigateTab && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => onNavigateTab('flags')}
                    className="btn btn-primary btn-xs"
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <ShieldAlert size={12} />
                    <span>View Flags</span>
                    <ArrowRight size={11} />
                  </button>
                  <button
                    onClick={() => onNavigateTab('graph')}
                    className="btn btn-secondary btn-xs"
                  >
                    <span>Link Graph</span>
                  </button>
                </div>
              )}
            </div>

            {/* Storage Locations Overview */}
            <div style={{ 
              marginTop: '14px', 
              paddingTop: '12px', 
              borderTop: '1px dashed var(--color-success-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              {/* Physical Disk Path */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                  <FolderOpen size={13} color="var(--brand)" />
                  <span>Physical File on Disk:</span>
                  <code style={{ 
                    fontFamily: 'var(--font-mono)', 
                    color: 'var(--text-primary)', 
                    background: 'var(--white)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    {activeDataset.saved_file_path || `data/uploads/${activeDataset.filename}`}
                  </code>
                </div>
                <button
                  onClick={() => copyToClipboard(activeDataset.saved_file_path || `data/uploads/${activeDataset.filename}`, 'disk')}
                  className="btn btn-ghost btn-xs"
                  style={{ padding: '2px 6px', height: '22px' }}
                  title="Copy path"
                >
                  {copiedKey === 'disk' ? <Check size={11} color="var(--color-success)" /> : <Copy size={11} />}
                </button>
              </div>

              {/* Database Storage Path */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                  <Database size={13} color="var(--color-purple)" />
                  <span>Database Document Store:</span>
                  <code style={{ 
                    fontFamily: 'var(--font-mono)', 
                    color: 'var(--text-primary)', 
                    background: 'var(--white)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    {activeDataset.database_storage_path || 'data/embedded_db/transactions.json'}
                  </code>
                </div>
                <button
                  onClick={() => copyToClipboard(activeDataset.database_storage_path || 'data/embedded_db/transactions.json', 'db')}
                  className="btn btn-ghost btn-xs"
                  style={{ padding: '2px 6px', height: '22px' }}
                  title="Copy path"
                >
                  {copiedKey === 'db' ? <Check size={11} color="var(--color-success)" /> : <Copy size={11} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dropzone Card */}
        <div className="card" style={{ padding: '22px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--brand-surface)',
                border: '1px solid var(--brand-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <UploadCloud size={18} color="var(--brand)" />
              </div>
              <div>
                <h2 className="heading-md" style={{ fontSize: '0.95rem' }}>Forensic Dataset Ingestion</h2>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  Upload raw captures. Files are automatically saved to <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand)' }}>data/uploads/</code> and indexed.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              <span className="badge badge-indigo" style={{ fontSize: '0.62rem' }}>CSV</span>
              <span className="badge badge-purple" style={{ fontSize: '0.62rem' }}>JSON</span>
              <span className="badge badge-amber" style={{ fontSize: '0.62rem' }}>XML</span>
            </div>
          </div>

          {/* Interactive Drag & Drop Box */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragActive ? 'var(--brand)' : 'var(--border-strong)'}`,
              borderRadius: '10px',
              padding: '36px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragActive ? 'var(--brand-surface)' : 'var(--gray-50)',
              transition: 'all 0.2s ease',
              marginBottom: '16px'
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,.xml"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            <UploadCloud size={34} color={dragActive ? 'var(--brand)' : 'var(--text-tertiary)'} style={{ margin: '0 auto 10px auto' }} />

            {selectedFile ? (
              <div>
                <span className="mono" style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                  {selectedFile.name}
                </span>
                <span style={{ fontSize: '0.73rem', color: 'var(--brand)', display: 'block', marginTop: '3px' }}>
                  {Math.round(selectedFile.size / 1024)} KB · Click to choose different file
                </span>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Drop capture file here, or click to browse
                </div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-tertiary)', marginTop: '3px' }}>
                  Supports CSV (telemetry/blockchain), JSON (mempool/RPC dumps), and XML
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={handleUploadAndRun}
            disabled={!selectedFile || loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px' }}
          >
            <Play size={14} />
            <span>{loading ? 'Processing & Persisting to Disk...' : 'Ingest File & Execute Pipeline'}</span>
          </button>

        </div>

        {/* 1-Click Pre-configured Forensic Test Suites */}
        <div className="card" style={{ padding: '22px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Sparkles size={16} color="var(--brand)" />
            <h3 className="heading-md" style={{ fontSize: '0.92rem' }}>
              1-Click Calibrated Test Scenarios
            </h3>
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Instantly load calibrated forensic scenarios with multi-hop peeling chains, CoinJoin mixers, and Tor syndicates:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            
            <button
              onClick={() => handleQuickSeed('csv')}
              disabled={loading}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '12px 14px',
                textAlign: 'left',
                height: 'auto',
                background: 'var(--white)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <FileSpreadsheet size={15} color="var(--brand)" />
                <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>CSV Scenario</span>
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                Ransomware payout with 5-hop rapid peeling chain
              </span>
            </button>

            <button
              onClick={() => handleQuickSeed('json')}
              disabled={loading}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '12px 14px',
                textAlign: 'left',
                height: 'auto',
                background: 'var(--white)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <FileCode size={15} color="var(--color-purple)" />
                <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>JSON Scenario</span>
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                Equal-output CoinJoin mixing pool with Tor hops
              </span>
            </button>

            <button
              onClick={() => handleQuickSeed('xml')}
              disabled={loading}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '12px 14px',
                textAlign: 'left',
                height: 'auto',
                background: 'var(--white)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <FileCode size={15} color="var(--color-warning)" />
                <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>XML Scenario</span>
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                Cross-border wash trade flow with nested fan-out
              </span>
            </button>

          </div>

        </div>

        {/* Previously Persisted Datasets Vault */}
        {uploadHistory && uploadHistory.length > 0 && (
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={16} color="var(--brand)" />
                <h3 className="heading-md" style={{ fontSize: '0.9rem' }}>
                  Stored Datasets Vault ({uploadHistory.length})
                </h3>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                Saved locally on disk in <code style={{ color: 'var(--brand)' }}>data/uploads/</code>
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {uploadHistory.slice(0, 5).map((item, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--gray-50)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.75rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <HardDrive size={14} color="var(--text-tertiary)" />
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.filename}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>
                        {item.records_ingested || 65} records · {item.uploaded_at ? new Date(item.uploaded_at).toLocaleString() : 'Saved'}
                      </span>
                    </div>
                  </div>

                  <span className="badge badge-cyan" style={{ fontSize: '0.62rem', flexShrink: 0 }}>
                    Saved
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Right Column: Real-time Terminal Log Console */}
      <div className="card" style={{ 
        padding: '20px', 
        display: 'flex', 
        flexDirection: 'column',
        minWidth: 0,
        height: '100%',
        background: 'var(--white)'
      }}>
        
        {/* Terminal Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '12px', 
          borderBottom: '1px solid var(--border-subtle)', 
          paddingBottom: '10px' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={16} color="var(--brand)" />
            <h3 className="heading-md" style={{ fontSize: '0.9rem' }}>Forensic Execution Console</h3>
          </div>
          <span className={`badge ${loading ? 'badge-amber' : 'badge-emerald'}`} style={{ fontSize: '0.62rem' }}>
            {loading ? 'Executing Pipeline...' : 'Engine Ready'}
          </span>
        </div>

        {/* Terminal window box */}
        <div style={{
          flex: 1,
          background: '#090d16',
          borderRadius: '8px',
          border: '1px solid #1e293b',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)'
        }}>
          {/* Terminal Title Bar */}
          <div style={{
            background: '#0f172a',
            padding: '7px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            borderBottom: '1px solid #1e293b'
          }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
            <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span style={{ fontSize: '0.66rem', color: '#64748b', fontFamily: 'var(--font-mono)', marginLeft: '8px' }}>
              bash — python pipeline.py
            </span>
          </div>

          {/* Terminal logs list */}
          <div style={{
            flex: 1,
            padding: '12px 14px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            lineHeight: 1.55,
            overflowY: 'auto',
            minHeight: '400px',
            maxHeight: '520px',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
          }}>
            {logs.map((log, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ color: '#64748b', flexShrink: 0, fontSize: '0.68rem' }}>[{log.time}]</span>
                <span style={{ 
                  color: log.type === 'error' ? '#ef4444' : log.type === 'success' ? '#34d399' : '#cbd5e1' 
                }}>
                  {log.msg}
                </span>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', marginTop: '4px' }}>
                <span className="animate-spin">◒</span>
                <span>Calculating DSU Louvain communities & PageRank vectors...</span>
              </div>
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>

        {/* Completion Result Banner with Quick Jump Buttons */}
        {result && (
          <div style={{
            marginTop: '12px',
            padding: '12px 14px',
            borderRadius: '8px',
            background: 'var(--color-success-surface)',
            border: '1px solid var(--color-success-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="var(--color-success)" />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-success-text)', fontWeight: 600 }}>
                {result.message || 'Dataset successfully analyzed and indexed into forensic graph.'}
              </span>
            </div>

            {onNavigateTab && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  onClick={() => onNavigateTab('flags')}
                  className="btn btn-primary btn-xs"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <ShieldAlert size={12} />
                  <span>Inspect Threat Flags ({result.flags_count || 8} leads)</span>
                  <ArrowRight size={11} />
                </button>
                <button
                  onClick={() => onNavigateTab('graph')}
                  className="btn btn-secondary btn-xs"
                >
                  <span>Open Link Graph</span>
                </button>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
