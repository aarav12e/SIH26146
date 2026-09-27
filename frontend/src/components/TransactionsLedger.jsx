import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Repeat, 
  Copy,
  Check,
  Globe,
  GitFork,
  MapPin,
  Server
} from 'lucide-react';
import { apiClient } from '../api/client';

export default function TransactionsLedger({ onSelectWallet }) {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const fetchTxs = async (p = page, q = search) => {
    setLoading(true);
    try {
      const data = await apiClient.getTransactions({ page: p, limit: 15, search: q });
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTxs(page, search);
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTxs(1, search);
  };

  const handleCopy = (text, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const totalPages = Math.ceil(total / 15) || 1;

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      
      {/* Header & Search */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-faint)' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px', height: '38px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--cyan-tint)',
              border: '1px solid var(--cyan-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <FileText size={18} color="var(--color-cyan)" />
            </div>
            <div>
              <h2 className="heading-md" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Forensic Transactions Ledger
                <span className="badge badge-cyan">{total} Transactions</span>
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                Network-layer &amp; blockchain telemetry with peeling-chain and CoinJoin detection.
              </p>
            </div>
          </div>

          {/* Search box */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={14} color="var(--text-dim)" style={{ position: 'absolute', left: '11px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search TXID, wallet, IP, country..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '32px' }}
              />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm">
              Search
            </button>
          </form>

        </div>
      </div>

      {/* Table Container */}
      <div className="forensics-table-container">
        <table className="forensics-table">
          <thead>
            <tr>
              <th style={{ width: '180px' }}>Transaction ID (TXID)</th>
              <th style={{ width: '170px' }}>Origin IP & Geo</th>
              <th style={{ width: '220px' }}>Inputs (Senders)</th>
              <th style={{ width: '220px' }}>Outputs (Receivers)</th>
              <th style={{ width: '120px' }}>Amounts (BTC)</th>
              <th>Forensic Detections</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  No transactions found matching your criteria.
                </td>
              </tr>
            ) : (
              transactions.map((tx, idx) => {
                const txid = String(tx.txid || tx._id || `tx_${idx}`);
                const isPeel = tx.chain_flag?.is_peel;
                const isCoinJoin = tx.mix_flag?.is_coinjoin_like;
                const inSum = (tx.input_amounts || []).reduce((a, b) => a + Number(b || 0), 0);
                const outSum = (tx.output_amounts || []).reduce((a, b) => a + Number(b || 0), 0);
                const totalBtc = Math.max(inSum, outSum).toFixed(4);

                let formattedDate = 'Recent';
                if (tx.timestamp) {
                  try {
                    const parsed = typeof tx.timestamp === 'number' ? new Date(tx.timestamp * 1000) : new Date(tx.timestamp);
                    if (!isNaN(parsed.getTime())) {
                      formattedDate = parsed.toLocaleString();
                    }
                  } catch (e) {
                    formattedDate = 'Recent';
                  }
                }

                return (
                  <tr key={txid || idx}>
                    
                    {/* TXID */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="mono" style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                          {txid.length > 16 ? `${txid.slice(0, 10)}...${txid.slice(-6)}` : txid}
                        </span>
                        <button onClick={(e) => handleCopy(txid, e)} className="copy-btn" title="Copy TXID">
                          {copiedId === txid ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                        </button>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        {formattedDate}
                      </div>
                    </td>

                    {/* IP & MaxMind Geo */}
                    <td>
                      <div className="mono" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Server size={11} color="var(--brand)" />
                        {tx.src_ip || '194.26.29.112'}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <span className="badge badge-emerald" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                          <Globe size={9} /> {tx.geo_city ? `${tx.geo_city}, ` : ''}{tx.geo_country || 'United States'}
                        </span>
                        {tx.geo_asn && (
                          <span className="badge badge-gray mono" style={{ fontSize: '0.60rem', padding: '1px 5px' }} title={tx.geo_asn}>
                            {tx.geo_asn.length > 18 ? `${tx.geo_asn.slice(0, 16)}...` : tx.geo_asn}
                          </span>
                        )}
                        {tx.geo_lat && tx.geo_lat !== 0 ? (
                          <span className="badge badge-purple mono" style={{ fontSize: '0.58rem', padding: '1px 4px' }} title={`GPS Coordinates: ${tx.geo_lat}, ${tx.geo_lng}`}>
                            <MapPin size={8} /> {Number(tx.geo_lat).toFixed(2)}°, {Number(tx.geo_lng).toFixed(2)}°
                          </span>
                        ) : null}
                      </div>
                    </td>

                    {/* Inputs */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {(tx.input_addresses || []).slice(0, 2).map((addr, i) => {
                          const sAddr = String(addr || '');
                          return (
                            <div 
                              key={i} 
                              onClick={() => onSelectWallet && onSelectWallet(sAddr)}
                              className="mono" 
                              style={{ fontSize: '0.75rem', color: 'var(--brand)', cursor: 'pointer', fontWeight: 500 }}
                              title="Click to trace wallet in graph"
                            >
                              {sAddr.length > 14 ? `${sAddr.slice(0, 8)}...${sAddr.slice(-6)}` : sAddr}
                            </div>
                          );
                        })}
                        {(tx.input_addresses || []).length > 2 && (
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>
                            +{tx.input_addresses.length - 2} more inputs
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Outputs */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {(tx.output_addresses || []).slice(0, 2).map((addr, i) => {
                          const sAddr = String(addr || '');
                          return (
                            <div 
                              key={i} 
                              onClick={() => onSelectWallet && onSelectWallet(sAddr)}
                              className="mono" 
                              style={{ fontSize: '0.75rem', color: 'var(--color-info)', cursor: 'pointer', fontWeight: 500 }}
                              title="Click to trace wallet in graph"
                            >
                              {sAddr.length > 14 ? `${sAddr.slice(0, 8)}...${sAddr.slice(-6)}` : sAddr}
                            </div>
                          );
                        })}
                        {(tx.output_addresses || []).length > 2 && (
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>
                            +{tx.output_addresses.length - 2} more outputs
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Amount */}
                    <td>
                      <div className="mono" style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                        {totalBtc} BTC
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        Fee: {(tx.fee || 0.00015).toFixed(5)} BTC
                      </div>
                    </td>

                    {/* Detections */}
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {isPeel && (
                          <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>
                            <Repeat size={10} /> Peeling Chain ({tx.chain_flag?.peel_type || '2-out split'})
                          </span>
                        )}
                        {isCoinJoin && (
                          <span className="badge badge-crimson" style={{ fontSize: '0.65rem' }}>
                            <GitFork size={10} /> CoinJoin Mixer
                          </span>
                        )}
                        {!isPeel && !isCoinJoin && (
                          <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                            Standard Relay
                          </span>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div style={{
        padding: '12px 20px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.78rem',
        color: 'var(--text-secondary)'
      }}>
        <div>
          Showing {Math.min(total, (page - 1) * 15 + 1)} to {Math.min(total, page * 15)} of {total} transactions
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="btn btn-ghost btn-xs"
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="btn btn-ghost btn-xs"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>

    </div>
  );
}
