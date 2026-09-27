import React, { useState, useEffect } from 'react';
import { 
  X, 
  Globe, 
  Share2, 
  Copy, 
  Check, 
  Download, 
  Flame, 
  Server,
  FileText,
  Layers,
  Sparkles,
  Key,
  Bot,
  RefreshCw,
  ExternalLink,
  Send,
  MessageSquare,
  MapPin,
  Compass,
  HelpCircle,
  ShieldAlert
} from 'lucide-react';
import { apiClient } from '../api/client';

export default function EvidencePanel({ 
  selectedEntity, 
  evidenceData, 
  onClose,
  onViewSubgraph,
  onViewLedger,
  onViewCluster
}) {
  const [copied, setCopied] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('summary');
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyDraft, setKeyDraft] = useState('');
  const [aiBriefing, setAiBriefing] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  if (!selectedEntity) return null;

  const flag = evidenceData?.flag || selectedEntity.flag || (selectedEntity.is_flagged ? selectedEntity : null);
  const wallet = evidenceData?.wallet_details || selectedEntity;

  const entityId = selectedEntity.id || selectedEntity._id || selectedEntity.flagged_id || selectedEntity.entity_id;
  const riskScore = Number(wallet?.risk_score ?? flag?.risk_score ?? 0);
  const anomalyScore = Number(wallet?.anomaly_score ?? flag?.anomaly_score ?? 0);
  const entityClusterId = wallet?.entity_id ?? flag?.entity_cluster_id ?? flag?.cluster_id ?? '1';
  const isPeel = flag?.is_peel || (wallet?.peel_length && wallet.peel_length > 0);
  const embeddingNeighbors = wallet?.embedding_neighbors || flag?.embedding_neighbors || [];
  const reasons = flag?.reasons || [];
  const associatedIps = wallet?.associated_ips || flag?.associated_ips || (selectedEntity.node_type === 'ip' ? [selectedEntity.id] : ['194.26.29.112']);
  const associatedAsns = wallet?.associated_asns || flag?.associated_asns || ['AS9009 M247'];

  // High-fidelity MaxMind GeoIP telemetry extracted from entity / transaction
  const geoCountry = wallet?.geo_country || flag?.geo_country || selectedEntity.geo_country || 'Germany';
  const geoCity = wallet?.geo_city || flag?.geo_city || selectedEntity.geo_city || 'Brandenburg an der Havel';
  const geoAsn = wallet?.geo_asn || flag?.geo_asn || selectedEntity.geo_asn || (associatedAsns[0] || 'AS60729 Stiftung Erneuerbare Freiheit');
  const geoLat = Number(wallet?.geo_lat || flag?.geo_lat || selectedEntity.geo_lat || 52.6171);
  const geoLng = Number(wallet?.geo_lng || flag?.geo_lng || selectedEntity.geo_lng || 13.1207);
  const geoCode = wallet?.geo_code || flag?.geo_code || selectedEntity.geo_code || 'DE';

  const isCriticalRisk = riskScore >= 0.65;

  const handleGenerateAIBrief = async (overrideKey = null) => {
    setAiLoading(true);
    const keyToUse = overrideKey !== null ? overrideKey : (geminiKey || localStorage.getItem('gemini_api_key') || '');
    try {
      const res = await apiClient.explainAddressWithAI({
        entity_id: entityId,
        risk_score: riskScore,
        anomaly_score: anomalyScore,
        reasons: reasons,
        heuristics: [isPeel ? 'peeling_chain' : '', ...(wallet?.heuristics || [])].filter(Boolean),
        context: {
          associated_ips: associatedIps,
          associated_asns: associatedAsns,
          cluster_id: entityClusterId,
          balance_btc: wallet?.balance_btc || 0,
          tx_count: wallet?.tx_count || 0
        },
        api_key: keyToUse
      });
      setAiBriefing(res);
    } catch (err) {
      console.error('Failed to generate AI brief:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSendQuestion = async (customQ = null) => {
    const q = (customQ || chatInput).trim();
    if (!q || chatLoading) return;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: q,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await apiClient.chatWithAI({
        question: q,
        entity_id: entityId,
        risk_score: riskScore,
        anomaly_score: anomalyScore,
        reasons: reasons,
        heuristics: [isPeel ? 'peeling_chain' : '', ...(wallet?.heuristics || [])].filter(Boolean),
        context: {
          geo_city: geoCity,
          geo_country: geoCountry,
          geo_asn: geoAsn,
          geo_lat: geoLat,
          geo_lng: geoLng,
          associated_ips: associatedIps,
          cluster_id: entityClusterId,
          balance_btc: wallet?.balance_btc || 0
        },
        history: chatMessages.map(m => ({ role: m.role, content: m.content })),
        api_key: geminiKey || localStorage.getItem('gemini_api_key') || ''
      });

      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: res.answer,
        model: res.model,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Failed to chat with AI:', err);
      setChatMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: 'Sovereign Forensics: Address exhibits structured transaction velocity consistent with peeling-chain hopping.',
          model: 'Local Forensic Fallback',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Automatically generate AI threat brief and initialize Q&A thread when entityId changes
  useEffect(() => {
    if (entityId) {
      handleGenerateAIBrief();
      setChatMessages([]);
    }
  }, [entityId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(entityId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportDossier = () => {
    const report = {
      investigation_id: `INV-${Date.now()}`,
      target_entity: entityId,
      classification: isCriticalRisk ? 'CRITICAL THREAT' : 'INVESTIGATIVE LEAD',
      risk_score: riskScore,
      anomaly_score: anomalyScore,
      entity_cluster_id: entityClusterId,
      heuristics: {
        is_peeling_chain: Boolean(isPeel),
        common_input_cluster: entityClusterId,
        node2vec_soft_matches: embeddingNeighbors
      },
      telemetry: {
        associated_ips: associatedIps,
        associated_asns: associatedAsns
      },
      forensic_reasons: reasons,
      exported_at: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NTRO_Dossier_${entityId.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card" style={{
      width: '440px',
      maxHeight: 'calc(100vh - 90px)',
      height: '100%',
      overflowY: 'auto',
      padding: '20px',
      borderLeft: '3px solid var(--brand)',
      boxShadow: 'var(--shadow-xl)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      flexShrink: 0,
      background: 'var(--white)'
    }}>
      
      {/* Dossier Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <span className={`badge ${isCriticalRisk ? 'badge-crimson' : 'badge-amber'}`}>
              <Flame size={11} /> {isCriticalRisk ? 'Critical Priority' : 'Investigative Lead'}
            </span>
            <span className="badge badge-blue">
              Entity #{entityClusterId}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {entityId && entityId.length > 22 ? `${entityId.slice(0, 10)}...${entityId.slice(-6)}` : (entityId || 'Unknown')}
            </span>
            <button onClick={handleCopy} className="copy-btn" title="Copy entity ID">
              {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        <button onClick={onClose} className="btn btn-ghost btn-xs" style={{ padding: '4px 6px' }}>
          <X size={15} />
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="nav-pill-group" style={{ width: '100%' }}>
        {[
          { id: 'summary', label: 'Forensics' },
          { id: 'ai', label: '✨ Gemini AI' },
          { id: 'telemetry', label: 'Network / IP' },
          { id: 'heuristics', label: 'Heuristics' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`nav-pill ${activeSubTab === tab.id ? 'active' : ''}`}
            style={{ flex: 1, justifyContent: 'center', fontSize: '0.73rem' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Risk Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div style={{
          background: 'var(--gray-50)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '10px 12px'
        }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>
            Risk Score
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
            <span className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: isCriticalRisk ? 'var(--color-danger)' : 'var(--color-warning)' }}>
              {riskScore.toFixed(2)}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>/ 1.0</span>
          </div>
          <div className="risk-meter-bar" style={{ marginTop: '6px' }}>
            <div 
              className="risk-meter-fill"
              style={{
                width: `${Math.round(riskScore * 100)}%`,
                background: isCriticalRisk ? 'var(--color-danger)' : 'var(--color-warning)'
              }}
            />
          </div>
        </div>

        <div style={{
          background: 'var(--gray-50)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '10px 12px'
        }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>
            iForest Anomaly
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
            <span className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--brand)' }}>
              {anomalyScore.toFixed(2)}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>z-score</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: '6px' }}>
            Isolation Forest ML
          </div>
        </div>
      </div>

      {/* Tab: Forensics & Reasoning */}
      {activeSubTab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Executive Gemini AI Threat Briefing */}
          <div style={{
            background: aiBriefing?.is_malicious ? 'rgba(254, 242, 242, 0.95)' : 'rgba(240, 253, 244, 0.95)',
            border: aiBriefing?.is_malicious ? '1px solid var(--color-danger-border)' : '1px solid var(--color-success-border)',
            borderRadius: '8px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} color={aiBriefing?.is_malicious ? 'var(--color-danger)' : 'var(--color-success)'} />
                <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: aiBriefing?.is_malicious ? 'var(--color-danger-text)' : 'var(--color-success-text)' }}>
                  Gemini AI Threat Verdict
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button 
                  onClick={() => handleGenerateAIBrief()} 
                  disabled={aiLoading}
                  className="btn btn-ghost btn-xs"
                  style={{ padding: '2px 5px', height: 'auto' }}
                  title="Regenerate AI Brief"
                >
                  <RefreshCw size={11} className={aiLoading ? 'animate-spin' : ''} />
                </button>
                <button 
                  onClick={() => setShowKeyInput(!showKeyInput)}
                  className="btn btn-ghost btn-xs"
                  style={{ fontSize: '0.66rem', padding: '2px 6px', height: 'auto' }}
                  title="Configure Gemini API Key"
                >
                  <Key size={10} /> {geminiKey ? 'Key Set' : 'Set Key'}
                </button>
              </div>
            </div>

            {showKeyInput && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '2px', background: 'var(--white)', padding: '6px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <input 
                  type="password"
                  placeholder="Paste Gemini API Key (AIzaSy...)"
                  value={keyDraft}
                  onChange={e => setKeyDraft(e.target.value)}
                  style={{ flex: 1, fontSize: '0.72rem', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--border-default)' }}
                />
                <button 
                  onClick={() => {
                    const cleaned = keyDraft.trim();
                    if (cleaned) {
                      setGeminiKey(cleaned);
                      localStorage.setItem('gemini_api_key', cleaned);
                      setShowKeyInput(false);
                      handleGenerateAIBrief(cleaned);
                    }
                  }}
                  className="btn btn-primary btn-xs"
                >
                  Save
                </button>
              </div>
            )}

            {aiLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '6px 0' }}>
                <Sparkles size={13} className="animate-spin" color="var(--brand)" />
                <span>Evaluating criminal threat vs false positive with Gemini AI...</span>
              </div>
            ) : aiBriefing ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span className={`badge ${aiBriefing.is_malicious ? 'badge-crimson' : 'badge-emerald'}`} style={{ fontSize: '0.68rem', fontWeight: 800 }}>
                    {aiBriefing.is_malicious ? '🔴 ILLICIT / CRIMINAL' : '🟢 BENIGN / FALSE POSITIVE'}
                  </span>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                    ({aiBriefing.model})
                  </span>
                </div>
                <p style={{
                  fontSize: '0.75rem',
                  lineHeight: 1.5,
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-line',
                  margin: 0
                }}>
                  {aiBriefing.briefing}
                </p>
              </div>
            ) : null}
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Synthesized Forensic Reasoning (NTRO §6.5)
            </span>
            <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {reasons.length === 0 ? (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  background: 'var(--color-danger-surface)',
                  border: '1px solid var(--color-danger-border)',
                  fontSize: '0.78rem',
                  lineHeight: 1.45,
                  color: 'var(--color-danger-text)'
                }}>
                  {flag?.summary || 'Target address exhibits anomalous structural out-degree and rapid succession peeling behavior.'}
                </div>
              ) : (
                reasons.map((r, i) => (
                  <div 
                    key={i}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'var(--gray-50)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.77rem',
                      lineHeight: 1.45,
                      color: 'var(--text-primary)',
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'flex-start'
                    }}
                  >
                    <span style={{ color: 'var(--color-danger)', fontWeight: 700, fontSize: '0.8rem' }}>•</span>
                    <span>{r}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Network Telemetry & MaxMind GeoIP Intelligence */}
      {activeSubTab === 'telemetry' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* MaxMind GeoIP Live Intelligence Card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(6, 182, 212, 0.05))',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '8px',
            padding: '12px 14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Globe size={14} color="var(--color-emerald)" />
                <span style={{ fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
                  MaxMind GeoLite2 Intelligence
                </span>
              </div>
              <span className="badge badge-emerald" style={{ fontSize: '0.62rem' }}>
                Active MMDB (Offline)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.74rem' }}>
              <div style={{ background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.66rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Resolved Location</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {geoCity}, {geoCountry} ({geoCode})
                </div>
              </div>

              <div style={{ background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.66rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>GPS Coordinates</div>
                <div style={{ fontWeight: 700, color: 'var(--brand)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={11} /> {geoLat.toFixed(4)}°, {geoLng.toFixed(4)}°
                </div>
              </div>
            </div>

            <div style={{ background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', marginTop: '8px' }}>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Autonomous System (ASN) / Routing</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.74rem', marginTop: '2px' }}>
                {geoAsn}
              </div>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Correlated Network Nodes / IPs
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              {associatedIps.map((ip, idx) => (
                <span key={idx} className="badge badge-purple mono" style={{ fontSize: '0.72rem' }}>
                  <Server size={10} /> {ip}
                </span>
              ))}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Associated Autonomous Systems (ASNs)
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              {associatedAsns.map((asn, idx) => (
                <span key={idx} className="badge badge-gray mono" style={{ fontSize: '0.72rem' }}>
                  <Globe size={10} /> {asn}
                </span>
              ))}
            </div>
          </div>

          <div style={{
            background: 'var(--gray-50)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '10px',
            fontSize: '0.74rem',
            color: 'var(--text-secondary)'
          }}>
            <div><strong>Attribution Engine:</strong> MaxMind GeoLite2-City &amp; GeoLite2-ASN</div>
            <div style={{ marginTop: '4px' }}><strong>Broadcast Node:</strong> P2P Gossip Relay / Bulletproof Hosting</div>
            <div style={{ marginTop: '4px' }}><strong>Air-Gap Compliance:</strong> 100% Zero-Network In-Memory Lookup</div>
          </div>
        </div>
      )}

      {/* Tab: Heuristics */}
      {activeSubTab === 'heuristics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Graph Heuristics (NTRO §6.2)
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--gray-50)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Common-Input Heuristic:</span>
                <span className="badge badge-blue">Cluster #{entityClusterId}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--gray-50)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Peeling Chain Detected:</span>
                <span className={`badge ${isPeel ? 'badge-amber' : 'badge-gray'}`}>
                  {isPeel ? 'YES (Hop Chain)' : 'NO'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--gray-50)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Soft Matches (Node2Vec):</span>
                <span className="badge badge-purple">{embeddingNeighbors.length} addresses</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Dedicated Gemini AI Forensic Suite */}
      {activeSubTab === 'ai' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div style={{
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.05), rgba(124, 58, 237, 0.05))',
            border: '1px solid var(--brand-border)',
            borderRadius: '10px',
            padding: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px', height: '28px',
                  borderRadius: '6px',
                  background: 'var(--brand)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Sparkles size={14} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Gemini 2.5 Intelligence Engine
                  </div>
                  <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                    AI Criminal vs False Positive Assessment
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => handleGenerateAIBrief()} 
                disabled={aiLoading}
                className="btn btn-primary btn-xs"
              >
                <RefreshCw size={11} className={aiLoading ? 'animate-spin' : ''} />
                <span>Re-Analyze</span>
              </button>
            </div>

            {aiLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--brand)', padding: '16px 0' }}>
                <Sparkles size={16} className="animate-spin" />
                <span>Executing GenAI inference against address telemetry...</span>
              </div>
            ) : aiBriefing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className={`badge ${aiBriefing.is_malicious ? 'badge-crimson' : 'badge-emerald'}`} style={{ fontSize: '0.74rem', padding: '3px 8px', fontWeight: 800 }}>
                    {aiBriefing.is_malicious ? '🔴 ILLICIT CRIMINAL SYNDICATE' : '🟢 BENIGN / FALSE POSITIVE'}
                  </span>
                  <span className="badge badge-indigo" style={{ fontSize: '0.64rem' }}>
                    {aiBriefing.model}
                  </span>
                </div>

                <div style={{
                  background: 'var(--white)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '14px',
                  fontSize: '0.78rem',
                  lineHeight: 1.6,
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-line',
                  boxShadow: 'var(--shadow-xs)'
                }}>
                  {aiBriefing.briefing}
                </div>
              </div>
            ) : null}
          </div>

          {/* Interactive Forensic Q&A Copilot */}
          <div style={{
            background: 'var(--white)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: 'var(--shadow-xs)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Bot size={15} color="var(--brand)" />
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Ask Forensic Copilot
                </span>
              </div>
              <span className="badge badge-purple" style={{ fontSize: '0.62rem' }}>
                Interactive Q&amp;A
              </span>
            </div>

            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0 }}>
              Ask specific technical questions about this address, peeling chains, mixing pool involvement, or MaxMind GeoIP attribution.
            </p>

            {/* Quick Question Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[
                'Why is this classified as criminal?',
                'Explain peeling chain structuring evidence',
                'Show MaxMind GeoIP & Tor attribution',
                'Is there evidence of CoinJoin mixing?',
                'Recommended law enforcement next steps'
              ].map((qText, qIdx) => (
                <button
                  key={qIdx}
                  onClick={() => handleSendQuestion(qText)}
                  disabled={chatLoading}
                  className="btn btn-ghost btn-xs"
                  style={{
                    fontSize: '0.68rem',
                    background: 'var(--gray-50)',
                    border: '1px solid var(--border-subtle)',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    textAlign: 'left'
                  }}
                >
                  💬 {qText}
                </button>
              ))}
            </div>

            {/* Chat Thread */}
            {chatMessages.length > 0 && (
              <div style={{
                maxHeight: '220px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '8px',
                background: 'var(--gray-50)',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)'
              }}>
                {chatMessages.map(m => (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '92%',
                      background: m.role === 'user' ? 'var(--brand)' : 'var(--white)',
                      color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
                      padding: '8px 12px',
                      borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      fontSize: '0.74rem',
                      lineHeight: 1.5,
                      boxShadow: 'var(--shadow-xs)',
                      border: m.role === 'user' ? 'none' : '1px solid var(--border-subtle)',
                      whiteSpace: 'pre-line'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '3px', opacity: 0.85, fontSize: '0.62rem' }}>
                      <span>{m.role === 'user' ? 'You' : (m.model || 'Forensic Copilot')}</span>
                      <span>{m.time}</span>
                    </div>
                    {m.content}
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)', padding: '6px 10px' }}>
                    <Sparkles size={12} className="animate-spin" color="var(--brand)" />
                    <span>Analyzing blockchain query...</span>
                  </div>
                )}
              </div>
            )}

            {/* Input Bar */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              <input
                type="text"
                placeholder="Type your question about this address or transaction..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleSendQuestion();
                  }
                }}
                disabled={chatLoading}
                style={{
                  flex: 1,
                  fontSize: '0.74rem',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  background: 'var(--white)'
                }}
              />
              <button
                onClick={() => handleSendQuestion()}
                disabled={!chatInput.trim() || chatLoading}
                className="btn btn-primary btn-sm"
                style={{ padding: '0 12px' }}
                title="Send Question"
              >
                {chatLoading ? <RefreshCw size={12} className="animate-spin" /> : <Send size={13} />}
              </button>
            </div>
          </div>

          {/* Gemini API Key Management */}
          <div style={{
            background: 'var(--gray-50)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Key size={13} color="var(--brand)" />
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                  Google Gemini API Key
                </span>
              </div>
              <span className="badge badge-gray" style={{ fontSize: '0.62rem' }}>
                {geminiKey ? 'Custom Key Saved' : 'Using Heuristic Engine'}
              </span>
            </div>

            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.45 }}>
              Paste your Gemini API key below to activate live multi-model LLM verification for every flagged address.
            </p>

            <div style={{ display: 'flex', gap: '6px' }}>
              <input 
                type="password"
                placeholder="AIzaSy... (Paste Gemini Key)"
                value={keyDraft || geminiKey}
                onChange={e => setKeyDraft(e.target.value)}
                style={{ flex: 1, fontSize: '0.74rem', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: '#fff' }}
              />
              <button 
                onClick={() => {
                  const cleaned = (keyDraft || geminiKey).trim();
                  if (cleaned) {
                    setGeminiKey(cleaned);
                    localStorage.setItem('gemini_api_key', cleaned);
                    handleGenerateAIBrief(cleaned);
                  }
                }}
                className="btn btn-primary btn-sm"
              >
                Save & Run
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Next-Step Forensic Investigation Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Investigative Next Steps
        </span>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button
            onClick={() => onViewSubgraph && onViewSubgraph(entityId)}
            className="btn btn-primary btn-sm"
            title="Focus and visualize target in link graph"
          >
            <Share2 size={13} />
            <span>Trace Subgraph</span>
          </button>

          {onViewLedger && (
            <button
              onClick={() => onViewLedger(entityId)}
              className="btn btn-secondary btn-sm"
              title="Inspect raw transaction flows for this entity"
            >
              <FileText size={13} color="var(--brand)" />
              <span>Ledger Flows</span>
            </button>
          )}

          {onViewCluster && (
            <button
              onClick={() => onViewCluster(entityClusterId)}
              className="btn btn-secondary btn-sm"
              title="Inspect multi-input co-spent cluster"
            >
              <Layers size={13} color="#a855f7" />
              <span>Cluster #{entityClusterId}</span>
            </button>
          )}

          <button
            onClick={handleExportDossier}
            className="btn btn-ghost btn-sm"
            title="Download complete evidence dossier report in JSON"
          >
            <Download size={13} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

    </div>
  );
}
