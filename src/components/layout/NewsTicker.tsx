import { useRef, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ff3b5c',
  high: '#ffb020',
  medium: '#8b5cf6',
  low: '#00c48c',
  info: '#00d4ff',
};

export function NewsTicker() {
  const { tickerMessages, tickerEnabled, tickerSpeed } = useAppStore();
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tickerRef.current) {
      tickerRef.current.style.setProperty('--ticker-speed', `${tickerSpeed}s`);
    }
  }, [tickerSpeed]);

  if (!tickerEnabled || tickerMessages.length === 0) return null;

  const combined = tickerMessages
    .filter((m) => m.isActive)
    .map((m) => ({ ...m }));


  return (
    <div
      style={{
        height: 'var(--ticker-height)',
        background: 'rgba(10, 13, 20, 0.95)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          background: 'var(--accent-primary)',
          color: '#000',
          fontWeight: 700,
          fontSize: '26px',
          padding: '0 19px',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          whiteSpace: 'nowrap',
          zIndex: 2,
        }}
      >
        📡 עדכונים
      </div>
      <div style={{ overflow: 'hidden', flex: 1 }} ref={tickerRef}>
        <div className="ticker-animation" style={{ direction: 'rtl', fontSize: '29px', color: 'var(--text-secondary)' }}>
          {combined.map((msg, i) => (
            <span key={msg.id}>
              {i > 0 && (
                <span style={{ margin: '0 48px', color: 'var(--text-muted)' }}>◆</span>
              )}
              <span style={{ color: SEVERITY_COLORS[msg.severity] || 'var(--text-secondary)' }}>
                {msg.severity === 'critical' && '🚨 '}
                {msg.severity === 'high' && '⚠️ '}
                {msg.content}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
