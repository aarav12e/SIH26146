import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileCode, 
  Play, 
  Sparkles, 
  Terminal,
  ShieldCheck,
  Settings2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { apiClient } from '../api/client';

export default function IngestionView({ onIngestionComplete }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [showSchemaSettings, setShowSchemaSettings] = useState(false);
  const [fieldMappings, setFieldMappings] = useState({
    txid: '',
    timestamp: '',
    input_addresses: '',
    output_addresses: '',
    input_amounts: '',
    output_amounts: '',
    src_ip: '',
    dst_ip: ''
  });

  const fileInputRef = useRef(null);

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
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
      setSelectedFile(e.dataTransfer.files[0]);
      addLog(`Selected file: ${e.dataTransfer.files[0].name} (${Math.round(e.dataTransfer.files[0].size/1024)} KB)`);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      addLog(`Selected file: ${e.target.files[0].name} (${Math.round(e.target.files[0].size/1024)} KB)`);
    }
  };

  const handleUploadAndRun = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setResult(null);
    try {
      addLog(`Step 1/5: Ingesting & validating ${selectedFile.name} with schema-driven parser...`);
      
      // Clean custom mappings
      const cleanMappings = {};
      Object.keys(fieldMappings).forEach(k => {
        if (fieldMappings[k].trim()) cleanMappings[k] = fieldMappings[k].trim();
      });

      const formData = new FormData();
      formData.append('file', selectedFile);
      if (Object.keys(cleanMappings).length > 0) {
        formData.append('field_mappings', JSON.stringify(cleanMappings));
      }

      const res = await fetch('/api/ingest', {
        method: 'POST',
        body: formData
      });
      const ingestRes = await res.json();
      if (!res.ok) throw new Error(ingestRes.detail || 'Ingestion failed');

      addLog(`✓ ${ingestRes.records_ingested} transactions parsed and GeoIP enriched.`, 'success');

      addLog('Step 2/5: Constructing multi-entity graph and computing 9 behavioral features...');
      addLog('Step 3/5: Running Focus Area 1 (Union-Find Entity Clustering + Node2Vec Embeddings)...');
      addLog('Step 4/5: Running Focus Area 2 (Isolation Forest Anomaly Detection) & Focus Area 3 (Peeling DFS & CoinJoin)...');
      addLog('Step 5/5: Running Focus Area 4 (Personalized PageRank Guilt-by-Association Risk Propagation)...');

      const pipelineRes = await apiClient.runPipeline();
      addLog(`✓ ${pipelineRes.message}`, 'success');

      setResult(pipelineRes);
      if (onIngestionComplete) onIngestionComplete();
    } catch (err) {
      addLog(`✖ Execution error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async (format) => {
    setLoading(true);
    setResult(null);
    try {
      addLog(`Loading synthetic multi-threat scenario (${format.toUpperCase()})...`);
      const seedRes = await apiClient.seedSampleData(format);
      addLog(`✓ Ingested ${seedRes.transactions_ingested} transactions from ${seedRes.seeded_file}`, 'success');
      addLog(`✓ ${seedRes.pipeline_result.message}`, 'success');
      setResult(seedRes.pipeline_result);
      if (onIngestionComplete) onIngestionComplete();
    } catch (err) {
      addLog(`✖ Seeding error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      
      {/* Upload Column */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UploadCloud size={22} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Schema-Driven Dataset Ingestion</h2>
          </div>
          <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
            Configurable Schemas
          </span>
        </div>

        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.45 }}>
          Ingests any bulk synthetic or community Bitcoin dataset in CSV, JSON, or XML format. 
          The ingestion engine maps non-standard column headers automatically or via custom field overrides.
        </p>

        {/* Drag and Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? 'var(--accent-indigo)' : 'var(--border-color)'}`,
            borderRadius: '12px',
            padding: '28px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragActive ? 'rgba(99, 102, 241, 0.1)' : 'rgba(15, 23, 42, 0.4)',
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

          <FileCode size={34} color="var(--accent-indigo)" style={{ margin: '0 auto 10px auto' }} />

          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff', marginBottom: '4px' }}>
            {selectedFile ? selectedFile.name : 'Choose dataset file or drag & drop here'}
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Supports CSV, JSON, and XML format • Fully offline execution
          </div>
        </div>

        {/* Schema Configuration Toggle */}
        <div style={{ marginBottom: '16px' }}>
          <button
            onClick={() => setShowSchemaSettings(!showSchemaSettings)}
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: 'space-between', padding: '8px 12px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings2 size={14} color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.775rem' }}>Schema Custom Field Mappings (Optional)</span>
            </div>
            {showSchemaSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showSchemaSettings && (
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '12px',
              marginTop: '8px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px'
            }}>
              <div>
                <label style={{ fontSize: '0.675rem', color: 'var(--text-dim)' }}>TXID Field</label>
                <input
                  type="text"
                  placeholder="e.g. tx_hash, id"
                  value={fieldMappings.txid}
                  onChange={(e) => setFieldMappings({...fieldMappings, txid: e.target.value})}
                  className="input-field"
                  style={{ fontSize: '0.75rem', padding: '5px 8px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.675rem', color: 'var(--text-dim)' }}>Inputs Field</label>
                <input
                  type="text"
                  placeholder="e.g. from_address"
                  value={fieldMappings.input_addresses}
                  onChange={(e) => setFieldMappings({...fieldMappings, input_addresses: e.target.value})}
                  className="input-field"
                  style={{ fontSize: '0.75rem', padding: '5px 8px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.675rem', color: 'var(--text-dim)' }}>Outputs Field</label>
                <input
                  type="text"
                  placeholder="e.g. to_address"
                  value={fieldMappings.output_addresses}
                  onChange={(e) => setFieldMappings({...fieldMappings, output_addresses: e.target.value})}
                  className="input-field"
                  style={{ fontSize: '0.75rem', padding: '5px 8px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.675rem', color: 'var(--text-dim)' }}>Amount Field</label>
                <input
                  type="text"
                  placeholder="e.g. btc_value"
                  value={fieldMappings.output_amounts}
                  onChange={(e) => setFieldMappings({...fieldMappings, output_amounts: e.target.value})}
                  className="input-field"
                  style={{ fontSize: '0.75rem', padding: '5px 8px' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={handleUploadAndRun}
          disabled={!selectedFile || loading}
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', fontSize: '0.9rem', marginBottom: '20px' }}
        >
          <Play size={16} className={loading ? 'animate-spin' : ''} />
          <span>{loading ? 'Executing 4 Focus Area Pipeline...' : 'Ingest & Run Forensics Analysis'}</span>
        </button>

        {/* Quick Demo Presets */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Sparkles size={15} color="var(--accent-amber)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
              1-Click Synthetic Datasets (Peeling, Mixers & Smurfing)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleSeed('csv')}
              disabled={loading}
              className="btn btn-ghost"
              style={{ flex: 1, fontSize: '0.775rem', padding: '7px' }}
            >
              CSV Dataset
            </button>
            <button
              onClick={() => handleSeed('json')}
              disabled={loading}
              className="btn btn-ghost"
              style={{ flex: 1, fontSize: '0.775rem', padding: '7px' }}
            >
              JSON Dataset
            </button>
            <button
              onClick={() => handleSeed('xml')}
              disabled={loading}
              className="btn btn-ghost"
              style={{ flex: 1, fontSize: '0.775rem', padding: '7px' }}
            >
              XML Dataset
            </button>
          </div>
        </div>

      </div>

      {/* Telemetry Column */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={18} color="var(--accent-emerald)" />
            <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>Pipeline Execution Telemetry</span>
          </div>
          <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
            4-Area Pipeline
          </span>
        </div>

        <div style={{
          flex: 1,
          background: '#050811',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '14px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          overflowY: 'auto',
          minHeight: '260px',
          maxHeight: '340px',
          marginBottom: '16px'
        }}>
          {logs.length === 0 ? (
            <div style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>
              &gt; Ready. Choose a dataset file or click a synthetic scenario to execute the 4 focus areas.
            </div>
          ) : (
            logs.map((log, index) => {
              let color = 'var(--text-muted)';
              if (log.type === 'success') color = '#34d399';
              if (log.type === 'error') color = '#f87171';
              return (
                <div key={index} style={{ marginBottom: '6px', lineHeight: 1.4, color }}>
                  <span style={{ color: 'var(--text-dim)', marginRight: '8px' }}>[{log.time}]</span>
                  <span>{log.msg}</span>
                </div>
              );
            })
          )}
        </div>

        {result && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <ShieldCheck size={24} color="var(--accent-emerald)" />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399' }}>
                Pipeline Successfully Completed
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {result.flags_count} prioritized investigative leads generated across {result.entity_clusters_count} Union-Find entity clusters.
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
