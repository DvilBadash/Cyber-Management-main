
interface BadgeProps {
  variant?: 'severity' | 'status' | 'priority' | 'system' | 'default';
  value: string;
  label?: string;
  size?: 'sm' | 'md';
}

const SEVERITY_MAP: Record<string, { bg: string; color: string; border: string }> = {
  critical: { bg: 'rgba(255, 59, 92, 0.15)', color: '#ff3b5c', border: 'rgba(255, 59, 92, 0.4)' },
  high: { bg: 'rgba(255, 176, 32, 0.15)', color: '#ffb020', border: 'rgba(255, 176, 32, 0.4)' },
  medium: { bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.4)' },
  low: { bg: 'rgba(0, 196, 140, 0.15)', color: '#00c48c', border: 'rgba(0, 196, 140, 0.4)' },
  info: { bg: 'rgba(0, 212, 255, 0.1)', color: '#00d4ff', border: 'rgba(0, 212, 255, 0.3)' },
};

const STATUS_MAP: Record<string, { bg: string; color: string; border: string }> = {
  open: { bg: 'rgba(255, 59, 92, 0.15)', color: '#ff3b5c', border: 'rgba(255, 59, 92, 0.4)' },
  in_progress: { bg: 'rgba(0, 212, 255, 0.1)', color: '#00d4ff', border: 'rgba(0, 212, 255, 0.3)' },
  pending: { bg: 'rgba(255, 176, 32, 0.15)', color: '#ffb020', border: 'rgba(255, 176, 32, 0.4)' },
  closed: { bg: 'rgba(0, 196, 140, 0.15)', color: '#00c48c', border: 'rgba(0, 196, 140, 0.4)' },
  false_positive: { bg: 'rgba(74, 85, 104, 0.2)', color: '#8899aa', border: 'rgba(74, 85, 104, 0.4)' },
  todo: { bg: 'rgba(74, 85, 104, 0.2)', color: '#8899aa', border: 'rgba(74, 85, 104, 0.4)' },
  review: { bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.4)' },
  done: { bg: 'rgba(0, 196, 140, 0.15)', color: '#00c48c', border: 'rgba(0, 196, 140, 0.4)' },
  online: { bg: 'rgba(0, 196, 140, 0.15)', color: '#00c48c', border: 'rgba(0, 196, 140, 0.4)' },
  degraded: { bg: 'rgba(255, 176, 32, 0.15)', color: '#ffb020', border: 'rgba(255, 176, 32, 0.4)' },
  offline: { bg: 'rgba(255, 59, 92, 0.15)', color: '#ff3b5c', border: 'rgba(255, 59, 92, 0.4)' },
  urgent: { bg: 'rgba(255, 59, 92, 0.15)', color: '#ff3b5c', border: 'rgba(255, 59, 92, 0.4)' },
  high: { bg: 'rgba(255, 176, 32, 0.15)', color: '#ffb020', border: 'rgba(255, 176, 32, 0.4)' },
  normal: { bg: 'rgba(0, 212, 255, 0.1)', color: '#00d4ff', border: 'rgba(0, 212, 255, 0.3)' },
  low: { bg: 'rgba(0, 196, 140, 0.15)', color: '#00c48c', border: 'rgba(0, 196, 140, 0.4)' },
};

const LABELS: Record<string, string> = {
  critical: 'קריטי', high: 'גבוה', medium: 'בינוני', low: 'נמוך', info: 'מידע',
  open: 'פתוח', in_progress: 'בטיפול', pending: 'ממתין', closed: 'נסגר', false_positive: 'שגוי',
  todo: 'לביצוע', review: 'בבדיקה', done: 'הושלם',
  online: 'תקין', degraded: 'לקוי', offline: 'לא זמין',
  urgent: 'דחופה', normal: 'רגילה',
};

export function Badge({ value, label, size = 'sm' }: BadgeProps) {
  const style = SEVERITY_MAP[value] || STATUS_MAP[value] || {
    bg: 'rgba(74, 85, 104, 0.2)', color: '#8899aa', border: 'rgba(74, 85, 104, 0.4)',
  };

  const displayLabel = label || LABELS[value] || value;
  const fontSize = size === 'sm' ? '11px' : '12px';
  const padding = size === 'sm' ? '2px 8px' : '4px 10px';

  return (
    <span
      style={{
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        borderRadius: '20px',
        padding,
        fontSize,
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        whiteSpace: 'nowrap',
      }}
    >
      {value === 'online' && <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />}
      {value === 'offline' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />}
      {displayLabel}
    </span>
  );
}
