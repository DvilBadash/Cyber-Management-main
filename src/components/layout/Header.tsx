import { LogOut, Wifi, WifiOff, Zap, Menu } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useRealTimeClock } from '../../hooks/useRealTimeClock';
import { useState } from 'react';
import type { Theme } from '../../types';

const THEMES: { id: Theme; label: string; icon: string }[] = [
  { id: 'dark', label: 'Dark Cyber', icon: '🌙' },
  { id: 'midnight', label: 'Midnight', icon: '⚫' },
  { id: 'navy', label: 'Navy Ops', icon: '🔵' },
  { id: 'light', label: 'Light', icon: '☀️' },
  { id: 'contrast', label: 'High Contrast', icon: '⬛' },
];

export function Header() {
  const { theme, setTheme, currentUser, toggleSidebar, logout, systemName } = useAppStore();
  const { display } = useRealTimeClock();
  const [isOnline] = useState(navigator.onLine);
  const [themeOpen, setThemeOpen] = useState(false);

  const roleLabel = currentUser?.role
    ? { admin: 'מנהל מערכת', team_lead: 'ראש צוות', senior_analyst: 'אנליסט בכיר', analyst: 'אנליסט', viewer: 'צופה' }[currentUser.role]
    : 'אורח';

  return (
    <header
      style={{
        height: 'var(--header-height)',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: '16px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        flexShrink: 0,
      }}
    >
      {/* Sidebar Toggle */}
      <button
        onClick={toggleSidebar}
        style={{ color: 'var(--text-secondary)', padding: '8px', borderRadius: '8px', cursor: 'pointer', background: 'none', border: 'none' }}
        className="hover:text-[var(--accent-primary)] hover:bg-[var(--bg-hover)] transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Logo + System Name */}
      <div className="flex items-center gap-3">
        <div
          style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-purple))',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
            boxShadow: 'var(--glow-cyan)',
          }}
        >
          🛡️
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {systemName}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--accent-primary)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '1px' }}>
            SOC MANAGEMENT SYSTEM
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Clock */}
      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '13px',
          color: 'var(--accent-primary)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '6px 12px',
          letterSpacing: '1px',
        }}
      >
        {display}
      </div>

      {/* Online Indicator */}
      <div className="flex items-center gap-1" style={{ fontSize: '11px', color: isOnline ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
        {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
        <span>{isOnline ? 'Online' : 'Offline'}</span>
      </div>

      {/* Theme Switcher */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setThemeOpen(!themeOpen)}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '7px 10px',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '12px',
          }}
          className="hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors"
        >
          <Zap size={13} />
          Theme
        </button>
        {themeOpen && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '100%',
              marginTop: 8,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '8px',
              minWidth: '160px',
              zIndex: 200,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTheme(t.id); setThemeOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  width: '100%', textAlign: 'right',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: theme === t.id ? 'var(--bg-hover)' : 'transparent',
                  color: theme === t.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
                className="hover:bg-[var(--bg-hover)] transition-colors"
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
                {theme === t.id && <span style={{ marginRight: 'auto', color: 'var(--accent-primary)' }}>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        title="התנתק"
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'none', border: '1px solid var(--border)',
          color: 'var(--text-secondary)', cursor: 'pointer',
          padding: '7px 12px', borderRadius: '8px', fontSize: '12px',
        }}
        className="hover:border-[var(--accent-danger)] hover:text-[var(--accent-danger)] transition-colors"
      >
        <LogOut size={14} />
        <span>התנתק</span>
      </button>

      {/* User */}
      <div className="flex items-center gap-3" style={{ paddingRight: '8px', borderRight: '1px solid var(--border)' }}>
        <div
          style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-primary))',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 700,
            color: 'white',
          }}
        >
          {currentUser?.fullName?.[0] || 'א'}
        </div>
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {currentUser?.fullName || 'מנהל מערכת'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--accent-primary)' }}>{roleLabel}</div>
        </div>
      </div>
    </header>
  );
}
