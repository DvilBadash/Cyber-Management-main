import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: ReactNode;
  title?: string;
  titleIcon?: ReactNode;
  actions?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  hoverable?: boolean;
  noPadding?: boolean;
}

export function Card({ children, title, titleIcon, actions, style, hoverable, noPadding }: CardProps) {
  return (
    <motion.div
      whileHover={hoverable ? { y: -2 } : undefined}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        overflow: 'hidden',
        ...style,
      }}
    >
      {(title || actions) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {titleIcon && (
              <span style={{ color: 'var(--accent-primary)' }}>{titleIcon}</span>
            )}
            {title && (
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {title}
              </h3>
            )}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div style={{ padding: noPadding ? 0 : '20px' }}>
        {children}
      </div>
    </motion.div>
  );
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
      <div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 16 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 14, width: `${80 - i * 10}%`, marginBottom: 10 }} />
      ))}
    </div>
  );
}
