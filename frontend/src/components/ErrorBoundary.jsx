import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-panel" style={{ padding: '36px', textAlign: 'center', margin: '20px auto', maxWidth: '640px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={24} color="#ef4444" />
            </div>

            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                Forensic View Temporarily Interrupted
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto' }}>
                {this.state.error?.message || 'An unexpected rendering issue occurred while visualizing this forensic section.'}
              </p>
            </div>

            <button
              onClick={this.handleReset}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '8px' }}
            >
              <RefreshCw size={13} color="#38bdf8" />
              <span>Reload This View</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
