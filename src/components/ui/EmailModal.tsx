import { useState, useEffect } from 'react';
import { Send, Users, X } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { sendEmail } from '../../utils/emailService';

interface SystemUser {
  id: number;
  fullName: string;
  email: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  systemUsers?: SystemUser[];
  zIndex?: number;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  background: 'var(--bg-hover)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--text-primary)',
  fontSize: '13px',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

export function EmailModal({ open, onClose, onSent, initialTo = '', initialSubject = '', initialBody = '', systemUsers = [], zIndex }: Props) {
  const [to, setTo] = useState(initialTo);
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; method?: 'relay' | 'mailto' } | null>(null);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());

  // Reset fields when modal opens with new data
  useEffect(() => {
    if (open) {
      setTo(initialTo);
      setSubject(initialSubject);
      setBody(initialBody);
      setCc('');
      setStatus(null);
      setShowUserPicker(false);
      setSelectedUserIds(new Set());
    }
  }, [open, initialTo, initialSubject, initialBody]);

  const handleToggleUser = (user: SystemUser) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(user.id)) {
        next.delete(user.id);
      } else {
        next.add(user.id);
      }
      return next;
    });
  };

  const handleApplyUsers = () => {
    const emails = systemUsers
      .filter(u => selectedUserIds.has(u.id))
      .map(u => u.email)
      .join(', ');
    if (emails) {
      setTo(prev => {
        const existing = prev.trim();
        return existing ? `${existing}, ${emails}` : emails;
      });
    }
    setShowUserPicker(false);
  };

  const handleSend = async () => {
    if (!to.trim() || !subject.trim()) return;
    setSending(true);
    setStatus(null);
    try {
      const method = await sendEmail({ to: to.trim(), cc: cc.trim() || undefined, subject: subject.trim(), body });
      setStatus({ ok: true, method });
      setTimeout(() => { onClose(); onSent?.(); }, 1600);
    } catch {
      setStatus({ ok: false });
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="שליחת מייל" size="md" zIndex={zIndex}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {status && (
          <div style={{
            padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
            background: status.ok ? 'rgba(0,196,140,0.12)' : 'rgba(255,59,92,0.12)',
            color: status.ok ? 'var(--accent-success)' : 'var(--accent-danger)',
            border: `1px solid ${status.ok ? 'rgba(0,196,140,0.35)' : 'rgba(255,59,92,0.35)'}`,
          }}>
            {status.ok
              ? status.method === 'relay'
                ? '✓ המייל נשלח בהצלחה דרך ה-SMTP Relay'
                : '✓ לקוח המייל נפתח לשליחה (mailto)'
              : '✗ שגיאה בשליחת המייל'}
          </div>
        )}

        {/* To field with system users button */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>אל (To) *</label>
            {systemUsers.length > 0 && (
              <button
                onClick={() => setShowUserPicker(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  background: showUserPicker ? 'rgba(0,212,255,0.15)' : 'var(--bg-hover)',
                  border: '1px solid var(--border)', borderRadius: '6px',
                  color: 'var(--accent-primary)', fontSize: '11px',
                  padding: '3px 8px', cursor: 'pointer',
                }}
              >
                <Users size={11} />
                בחר מהמערכת ({systemUsers.length})
              </button>
            )}
          </div>
          <input
            value={to} onChange={e => setTo(e.target.value)}
            placeholder="email@example.com, email2@example.com"
            style={inputStyle}
          />
        </div>

        {/* System users picker */}
        {showUserPicker && systemUsers.length > 0 && (
          <div style={{
            background: 'var(--bg-hover)', border: '1px solid var(--border)',
            borderRadius: '10px', padding: '10px',
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
              בחר נמענים מהמערכת:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '160px', overflowY: 'auto', marginBottom: '8px' }}>
              {systemUsers.map(user => (
                <label key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '5px 6px', borderRadius: '6px', background: selectedUserIds.has(user.id) ? 'rgba(0,212,255,0.08)' : 'transparent' }}>
                  <input
                    type="checkbox"
                    checked={selectedUserIds.has(user.id)}
                    onChange={() => handleToggleUser(user)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)', flex: 1 }}>{user.fullName}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{user.email}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowUserPicker(false)}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}>
                ביטול
              </button>
              <button onClick={handleApplyUsers}
                style={{ background: 'var(--accent-primary)', border: 'none', borderRadius: '6px', color: 'white', padding: '4px 12px', cursor: 'pointer', fontSize: '12px' }}
                disabled={selectedUserIds.size === 0}>
                הוסף {selectedUserIds.size > 0 ? `(${selectedUserIds.size})` : ''}
              </button>
            </div>
          </div>
        )}

        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>עותק (CC)</label>
          <input
            value={cc} onChange={e => setCc(e.target.value)}
            placeholder="email@example.com"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>נושא *</label>
          <input
            value={subject} onChange={e => setSubject(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>תוכן</label>
          <textarea
            value={body} onChange={e => setBody(e.target.value)}
            rows={9}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-hover)', borderRadius: '6px', padding: '8px 12px' }}>
          💡 אם מוגדר SMTP Relay בהגדרות מערכת — המייל יישלח דרכו. אחרת יפתח לקוח המייל של המערכת.
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>ביטול</Button>
          <Button
            variant="primary"
            icon={<Send size={14} />}
            onClick={handleSend}
            disabled={!to.trim() || !subject.trim() || sending}
          >
            {sending ? 'שולח...' : 'שלח מייל'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
