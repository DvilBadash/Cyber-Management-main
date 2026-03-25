import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', background: '#0a0d14', color: '#e8edf5', fontFamily: 'Heebo, sans-serif',
          gap: '16px', padding: '40px',
        }}>
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#ff3b5c' }}>שגיאת מערכת</h2>
          <p style={{ margin: 0, color: '#8899aa', fontSize: '14px', textAlign: 'center', maxWidth: '500px' }}>
            {this.state.error?.message || 'שגיאה לא ידועה'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px', background: '#00d4ff', color: '#000', border: 'none',
              borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '14px',
            }}
          >
            רענן דף
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
