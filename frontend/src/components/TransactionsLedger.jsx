import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  Repeat, 
  Layers 
} from 'lucide-react';
import { apiClient } from '../api/client';

export default function TransactionsLedger({ onSelectWallet }) {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

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

  const totalPages = Math.ceil(total / 15) || 1;

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      
      {/* Header & Search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={22} color="var(--accent-indigo)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Transactions Forensics Ledger</h2>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Correlated network-layer (IP/port) and blockchain-layer (TXID/addresses/amounts) telemetry with peeling-chain and CoinJoin detection (NTRO §6.4).
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input
              type="text"
              placeholder="Search TXID, wallet, or IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '36px' }}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', maxHeight: '560px', overflowY: 'auto' }}>
        <table className="forensics-table">
          <thead>
            <tr>
              <th style={{ width: '180px' }}>TXID / Time</th>
              <th>Inputs (Sender)</th>
              <th style={{ width: '40px' }}></th>
              <th>Outputs (Receiver)</th>
              <th style={{ width: '130px' }}>Total Amount</th>
              <th style={{ width: '150px' }}>Patterns</th>
              <th style={{ width: '160px' }}>Network Origin</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                  {loading ? 'Loading transactions...' : 'No transactions found. Ingest dataset first.'}
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const inTotal = (tx.input_amounts || []).reduce((a, b) => a + b, 0);
                const outTotal = (tx.output_amounts || []).reduce((a, b) => a + b, 0);
                const txAmt = Math.max(inTotal, outTotal);
                const isPeel = tx.chain_flag?.is_peel;
                const isMix = tx.mix_flag?.is_coinjoin_like;

                return (
                  <tr key={tx._id}>
                    <td>
                      <div className="mono" style={{ fontWeight: 600, fontSize: '0.8rem', color: '#ffffff' }}>
                        {tx.txid}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        {tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'N/A'}
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {(tx.input_addresses || []).slice(0, 2).map((addr, i) => (
                          <span
                            key={i}
                            onClick={() => onSelectWallet && onSelectWallet(addr)}
                            className="mono"
                            style={{ fontSize: '0.75rem', color: '#93c5fd', cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            {addr}
                          </span>
                        ))}
                        {(tx.input_addresses || []).length > 2 && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                            +{(tx.input_addresses.length - 2)} more inputs
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <ArrowRight size={14} color="var(--text-dim)" />
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {(tx.output_addresses || []).slice(0, 2).map((addr, i) => (
                          <span
                            key={i}
                            onClick={() => onSelectWallet && onSelectWallet(addr)}
                            className="mono"
                            style={{ fontSize: '0.75rem', color: '#a7f3d0', cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            {addr}
                          </span>
                        ))}
                        {(tx.output_addresses || []).length > 2 && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                            +{(tx.output_addresses.length - 2)} more outputs
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="mono" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ffffff' }}>
                        {txAmt.toFixed(4)} BTC
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                        Fee: {tx.fee?.toFixed(5) || '0.0001'}
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {isPeel && (
                          <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>
                            <Repeat size={10} /> Peeling L-{tx.chain_flag.chain_length}
                          </span>
                        )}
                        {isMix && (
                          <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
                            <Layers size={10} /> CoinJoin Mix ({tx.mix_flag.num_participants}p)
                          </span>
                        )}
                        {!isPeel && !isMix && (
                          <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)' }}>Standard</span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="badge badge-cyan mono" style={{ fontSize: '0.7rem' }}>
                          {tx.src_ip}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                        {tx.geo_country} • {tx.asn}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
        <div style={{ fontSize: '0.775rem', color: 'var(--text-dim)' }}>
          Showing Page {page} of {totalPages} ({total} total transactions)
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            disabled={page <= 1}
            className="btn btn-ghost btn-sm"
          >
            <ChevronLeft size={16} />
            <span>Prev</span>
          </button>
          <button
            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
            disabled={page >= totalPages}
            className="btn btn-ghost btn-sm"
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

    </div>
  );
}
