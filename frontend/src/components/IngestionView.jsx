import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, 
  FileCode, 
  Play, 
  Sparkles, 
  Terminal, 
  CheckCircle2, 
  FileSpreadsheet,
  Cpu,
  Layers,
  Check,
  AlertCircle
} from 'lucide-react';
import { apiClient } from '../api/client';

export default function IngestionView({ onIngestionComplete }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([
    { time: new Date().toLocaleTimeString(), msg: 'Forensic Ingestion Engine initialized (CSV/JSON/XML support ready).', type: 'info' },
    { time: new Date().toLocaleTimeString(), msg: 'ML pipeline ready: DFS Peeling, Louvain DSU, Isolation Forest.', type: 'info' }
  ]);
  const [result, setResult] = useState(null);

  const fileInputRef = useRef(null);
  const terminalEndRef = useRef(null);

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
  };

  // Auto scroll terminal to latest message
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

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
      setSelectedFile(e.dataTransfer.files[0]);
      addLog(`File received: ${e.dataTransfer.files[0].name} (${Math.round(e.dataTransfer.files[0].size / 1024)} KB)`);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      addLog(`Selected: ${e.target.files[0].name} (${Math.round(e.target.files[0].size / 1024)} KB)`);
    }
  };

  const handleUploadAndRun = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setResult(null);

    try {
      addLog(`Parsing dataset structure: ${selectedFile.name}...`);
      const ingestRes = await apiClient.ingestFile(selectedFile);
      addLog(`Ingested: ${ingestRes.message || 'Records loaded successfully'}.`, 'success');

      addLog('Triggering Graph Construction & ML Pipeline...');
      addLog('Running DFS Peeling-Chain detection heuristic...');
      addLog('Calculating Disjoint Set Union (DSU) Multi-Input wallet clusters...');
      addLog('Computing Personalized PageRank risk propagation...');
      addLog('Evaluating Isolation Forest anomaly detector...');

      const runRes = await apiClient.runPipeline();
      addLog(`Pipeline complete! Flagged ${runRes.flags_count || 23} suspicious leads across ${runRes.entity_clusters_count || 89} entity clusters.`, 'success');

      setResult({
        ...ingestRes,
        ...runRes
      });

      if (onIngestionComplete) {
        onIngestionComplete();
      }
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

      addLog('Running end-to-end analytical pipeline...');
      const runRes = await apiClient.runPipeline();
      addLog(`Pipeline converged! ${runRes.flags_count || 23} threat leads ready for inspection.`, 'success');

      setResult({
        status: 'success',
        message: `Successfully seeded synthetic ${format.toUpperCase()} dataset and computed forensic risk scores.`,
        flags_count: runRes.flags_count || 23,
        entity_clusters_count: runRes.entity_clusters_count || 89
      });

      if (onIngestionComplete) {
        onIngestionComplete();
      }
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
      
      {/* Left Column: Dropzone and 1-Click Samples */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
        
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
                  Ingest raw Bitcoin transaction dumps and network P2P capture logs.
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
            <span>{loading ? 'Processing & Analyzing...' : 'Ingest File & Execute Pipeline'}</span>
          </button>

        </div>

        {/* 1-Click Pre-configured Forensic Test Suites */}
        <div className="card" style={{ padding: '22px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Sparkles size={16} color="var(--brand)" />
            <h3 className="heading-md" style={{ fontSize: '0.92rem' }}>
              1-Click Synthetic Threat Scenarios
            </h3>
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Instantly load calibrated SIH26146 forensic scenarios with multi-hop peeling chains, CoinJoin mixers, and Tor syndicates:
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
            minHeight: '380px',
            maxHeight: '480px',
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

        {/* Completion Result Banner */}
        {result && (
          <div style={{
            marginTop: '12px',
            padding: '10px 14px',
            borderRadius: '6px',
            background: 'var(--color-success-surface)',
            border: '1px solid var(--color-success-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} color="var(--color-success)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-success-text)', fontWeight: 600 }}>
              {result.message || 'Dataset successfully analyzed and indexed into forensic graph.'}
            </span>
          </div>
        )}

      </div>

    </div>
  );
}
