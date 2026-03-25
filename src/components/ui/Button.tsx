import { type ReactNode, type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  loading?: boolean;
}

const VARIANTS = {
  primary: {
    background: 'var(--accent-primary)',
    color: '#000',
    border: 'none',
    hoverOpacity: 0.85,
  },
  secondary: {
    background: 'var(--bg-hover)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
  },
  danger: {
    background: 'var(--accent-danger)',
    color: 'white',
    border: 'none',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
  },
  success: {
    background: 'var(--accent-success)',
    color: '#000',
    border: 'none',
  },
};

const SIZES = {
  sm: { padding: '6px 12px', fontSize: '12px', gap: '6px', borderRadius: '7px' },
  md: { padding: '9px 16px', fontSize: '13px', gap: '8px', borderRadius: '9px' },
  lg: { padding: '12px 20px', fontSize: '14px', gap: '10px', borderRadius: '10px' },
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const v = VARIANTS[variant];
  const s = SIZES[size];

  return (
    <button
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        padding: s.padding,
        fontSize: s.fontSize,
        fontFamily: 'inherit',
        fontWeight: 600,
        borderRadius: s.borderRadius,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
        background: v.background,
        color: v.color,
        border: v.border || 'none',
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
      ) : icon}
      {children}
    </button>
  );
}
