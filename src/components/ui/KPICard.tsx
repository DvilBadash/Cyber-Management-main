import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: number;
  icon: ReactNode;
  color?: string;
  change?: number;
  changeLabel?: string;
  suffix?: string;
  onClick?: () => void;
  danger?: boolean;
}

function useCountAnimation(target: number, duration = 1200) {
  const [current, setCurrent] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, duration]);

  return current;
}

export function KPICard({ label, value, icon, color, change, changeLabel, suffix, onClick, danger }: KPICardProps) {
  const animatedValue = useCountAnimation(value);
  const c = color || 'var(--accent-primary)';

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${danger ? 'rgba(255,59,92,0.3)' : 'var(--border)'}`,
        borderRadius: '14px',
        padding: '20px',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: danger ? 'var(--glow-red)' : 'none',
        transition: 'box-shadow 0.3s ease',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          top: -20, right: -20,
          width: 80, height: 80,
          borderRadius: '50%',
          background: `${c}15`,
          filter: 'blur(20px)',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
        <div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>
            {label}
          </div>
          <div style={{ fontSize: '36px', fontWeight: 800, color: c, lineHeight: 1, fontFamily: 'JetBrains Mono, monospace' }}>
            {animatedValue.toLocaleString()}{suffix}
          </div>
          {change !== undefined && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              marginTop: '8px', fontSize: '12px',
              color: change > 0 ? 'var(--accent-danger)' : change < 0 ? 'var(--accent-success)' : 'var(--text-muted)',
            }}>
              {change > 0 ? <TrendingUp size={12} /> : change < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
              <span>{Math.abs(change)}% {changeLabel || 'מהאתמול'}</span>
            </div>
          )}
        </div>
        <div
          style={{
            width: 44, height: 44,
            background: `${c}20`,
            border: `1px solid ${c}40`,
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: c,
          }}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
