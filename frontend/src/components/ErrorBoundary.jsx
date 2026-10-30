import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('VoltTrace ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: '#0f172a',
          color: '#f8fafc',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '620px',
            width: '100%',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                padding: '0.6rem',
                borderRadius: '8px',
                display: 'flex'
              }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Component Render Error</h2>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                  VoltTrace caught a runtime issue without crashing the browser.
                </p>
              </div>
            </div>

            <div style={{
              background: '#090d16',
              border: '1px solid #28334e',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem',
              overflowX: 'auto'
            }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#f87171', fontFamily: 'monospace', fontWeight: 600 }}>
                {this.state.error?.toString()}
              </p>
              {this.state.errorInfo?.componentStack && (
                <pre style={{
                  margin: '0.65rem 0 0',
                  fontSize: '0.72rem',
                  color: '#94a3b8',
                  maxHeight: '160px',
                  overflowY: 'auto'
                }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.6rem 1.15rem',
                  borderRadius: '6px',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={15} /> Reload Page
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.6rem 1.15rem',
                  borderRadius: '6px',
                  background: '#334155',
                  color: '#f8fafc',
                  border: '1px solid #475569',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                <Home size={15} /> Return to Registry
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
