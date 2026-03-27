import { useState, useEffect } from 'react';
import { Plus, Search, Lock, Shield, Pencil, Check, Trash2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useAppStore } from '../store/appStore';
import { useListsStore } from '../store/listsStore';
import { usersApi } from '../api/client';
import type { User } from '../types';
import { format } from 'date-fns';

export function UserManagement() {
  const { changePassword, logActivity } = useAppStore();
  const { userRoles } = useListsStore();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<User | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ fullName: '', username: '', email: '', phone: '', role: '', department: '' });

  // Edit mode in detail modal
  const [editMode, setEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState({ fullName: '', email: '', phone: '', role: '', department: '' });

  // Password change state
  const [showChangePass, setShowChangePass] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passSaved, setPassSaved] = useState(false);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    usersApi.getAll().then(setUsers);
  }, []);

  // Init form role from first available role
  useEffect(() => {
    if (userRoles.length > 0 && !form.role) {
      setForm(f => ({ ...f, role: userRoles[0] }));
    }
  }, [userRoles]);

  const roleColor = (role: string) => {
    if (role === 'admin' || role === 'מנהל מערכת') return 'var(--accent-danger)';
    if (role === 'team_lead' || role === 'ראש צוות') return 'var(--accent-warning)';
    if (role === 'senior_analyst' || role === 'אנליסט בכיר') return 'var(--accent-purple)';
    if (role === 'analyst' || role === 'אנליסט') return 'var(--accent-primary)';
    return 'var(--text-muted)';
  };

  const filtered = users.filter(u =>
    !search || u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!form.fullName || !form.username) return;
    const now = new Date().toISOString();
    const created = await usersApi.create({ ...form, passwordHash: btoa('changeme'), isActive: true, createdAt: now });
    setUsers(prev => [...prev, created]);
    await logActivity('יצירת משתמש', 'ניהול משתמשים', `נוצר משתמש חדש: ${form.username} (${form.role})`);
    setShowAdd(false);
    setForm({ fullName: '', username: '', email: '', phone: '', role: userRoles[0] || '', department: '' });
  };

  const handleToggleActive = async (user: User) => {
    if (user.username === 'socadmin') return;
    const newState = !user.isActive;
    await usersApi.update(user.id!, { isActive: newState });
    await logActivity(newState ? 'הפעלת משתמש' : 'השבתת משתמש', 'ניהול משתמשים', `משתמש ${user.username} ${newState ? 'הופעל' : 'הושבת'}`);
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: newState } : u));
    setSelected(null);
  };

  const openDetail = (user: User) => {
    setSelected(user);
    setEditMode(false);
    setEditDraft({ fullName: user.fullName, email: user.email, phone: user.phone || '', role: user.role, department: user.department || '' });
  };

  const handleSaveEdit = async () => {
    if (!selected?.id) return;
    await usersApi.update(selected.id, editDraft);
    await logActivity('עדכון משתמש', 'ניהול משתמשים', `פרטי משתמש ${selected.username} עודכנו`);
    setUsers(prev => prev.map(u => u.id === selected.id ? { ...u, ...editDraft } : u));
    setSelected(prev => prev ? { ...prev, ...editDraft } : null);
    setEditMode(false);
  };

  const handleChangePassword = async () => {
    if (!selected) return;
    if (!newPass) { setPassError('יש להזין סיסמה חדשה'); return; }
    if (newPass.length < 4) { setPassError('הסיסמה קצרה מדי (מינימום 4 תווים)'); return; }
    if (newPass !== confirmPass) { setPassError('הסיסמאות אינן תואמות'); return; }
    await changePassword(selected.id!, newPass);
    await logActivity('שינוי סיסמה', 'ניהול משתמשים', `סיסמה שונתה למשתמש ${selected.username}`);
    setUsers(prev => prev.map(u => u.id === selected.id ? { ...u, passwordHash: btoa(newPass) } : u));
    setPassSaved(true);
    setPassError('');
    setTimeout(() => {
      setPassSaved(false);
      setShowChangePass(false);
      setNewPass('');
      setConfirmPass('');
    }, 1500);
  };

  const handleDeleteUser = async () => {
    if (!selected?.id || selected.username === 'socadmin') return;
    await usersApi.delete(selected.id);
    await logActivity('מחיקת משתמש', 'ניהול משתמשים', `משתמש ${selected.username} נמחק לצמיתות`);
    setUsers(prev => prev.filter(u => u.id !== selected.id));
    setShowDeleteConfirm(false);
    setSelected(null);
  };

  const openChangePass = (user: User) => {
    setSelected(user);
    setNewPass('');
    setConfirmPass('');
    setPassError('');
    setPassSaved(false);
    setShowChangePass(true);
  };

  const INPUT_STYLE = {
    width: '100%', padding: '9px 12px', background: 'var(--bg-hover)',
    border: '1px solid var(--border)', borderRadius: '8px',
    color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>ניהול משתמשים</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
            {users.filter(u => u.isActive).length} פעילים · {users.length} סה"כ
          </p>
        </div>
        <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowAdd(true)}>
          משתמש חדש
        </Button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '16px', maxWidth: '400px' }}>
        <Search size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="חיפוש משתמשים..."
          style={{ width: '100%', padding: '9px 34px 9px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
        />
      </div>

      {/* Users Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {filtered.map(user => {
          const isSocAdmin = user.username === 'socadmin';
          return (
            <Card key={user.id} hoverable style={{ cursor: 'pointer', opacity: user.isActive ? 1 : 0.6 }}>
              <div onClick={() => openDetail(user)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${roleColor(user.role)}, var(--accent-primary))`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px', fontWeight: 800, color: 'white', flexShrink: 0,
                  }}>
                    {user.fullName[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.fullName}</div>
                      {isSocAdmin && <Shield size={13} color="var(--accent-warning)" />}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>@{user.username}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>תפקיד</span>
                    <span style={{ color: roleColor(user.role), fontWeight: 600 }}>{user.role}</span>
                  </div>
                  {user.department && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>מחלקה</span>
                      <span style={{ color: 'var(--text-primary)' }}>{user.department}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>סטטוס</span>
                    <Badge value={user.isActive ? 'online' : 'offline'} label={user.isActive ? 'פעיל' : 'מושבת'} />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="משתמש חדש" size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { label: 'שם מלא *', key: 'fullName', placeholder: 'ישראל ישראלי' },
              { label: 'שם משתמש *', key: 'username', placeholder: 'israel.israeli' },
              { label: 'אימייל', key: 'email', placeholder: 'user@soc.local' },
              { label: 'טלפון', key: 'phone', placeholder: '050-0000000' },
              { label: 'מחלקה', key: 'department', placeholder: 'SOC' },
            ].map(f => (
              <div key={f.key} style={f.key === 'fullName' ? { gridColumn: '1/-1' } : {}}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} style={INPUT_STYLE} />
              </div>
            ))}
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>תפקיד</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={INPUT_STYLE}>
              {userRoles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>ביטול</Button>
            <Button variant="primary" onClick={handleAdd}>צור משתמש</Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!selected && !showChangePass} onClose={() => setSelected(null)} title={selected?.fullName || ''} size="sm">
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: `linear-gradient(135deg, ${roleColor(selected.role)}, var(--accent-primary))`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', fontWeight: 800, color: 'white', margin: '0 auto',
            }}>
              {selected.fullName[0]}
            </div>

            {selected.username === 'socadmin' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--accent-warning)' }}>
                <Shield size={14} />
                משתמש מערכת מוגן — לא ניתן להסרה או השבתה
              </div>
            )}

            {/* Username (read-only always) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>שם משתמש</span>
              <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>@{selected.username}</span>
            </div>

            {/* Editable fields */}
            {editMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'שם מלא', key: 'fullName' },
                  { label: 'אימייל', key: 'email' },
                  { label: 'טלפון', key: 'phone' },
                  { label: 'מחלקה', key: 'department' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>{f.label}</label>
                    <input
                      value={(editDraft as any)[f.key]}
                      onChange={e => setEditDraft(d => ({ ...d, [f.key]: e.target.value }))}
                      style={INPUT_STYLE}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>תפקיד</label>
                  <select value={editDraft.role} onChange={e => setEditDraft(d => ({ ...d, role: e.target.value }))} style={INPUT_STYLE}>
                    {userRoles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              [
                { label: 'שם מלא', value: selected.fullName },
                { label: 'אימייל', value: selected.email },
                { label: 'טלפון', value: selected.phone || '—' },
                { label: 'תפקיד', value: selected.role },
                { label: 'מחלקה', value: selected.department || '—' },
                { label: 'הצטרפות', value: format(new Date(selected.createdAt), 'dd/MM/yyyy') },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))
            )}

            <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
              {editMode ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="ghost" onClick={() => setEditMode(false)}>ביטול</Button>
                  <Button variant="primary" icon={<Check size={14} />} onClick={handleSaveEdit}>שמור שינויים</Button>
                </div>
              ) : (
                <Button variant="ghost" icon={<Pencil size={14} />} onClick={() => setEditMode(true)}>
                  עריכת פרטים
                </Button>
              )}
              <Button variant="ghost" icon={<Lock size={14} />} onClick={() => openChangePass(selected)}>
                שנה סיסמה
              </Button>
              {selected.username !== 'socadmin' && (
                <>
                  <Button variant={selected.isActive ? 'danger' : 'success'} onClick={() => handleToggleActive(selected)}>
                    {selected.isActive ? 'השבת משתמש' : 'הפעל משתמש'}
                  </Button>
                  <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => setShowDeleteConfirm(true)}>
                    מחק משתמש לתמיד
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="מחיקת משתמש לצמיתות" size="sm">
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'rgba(255,59,92,0.1)', border: '1px solid rgba(255,59,92,0.3)', borderRadius: '10px', padding: '14px 16px', fontSize: '13px', color: 'var(--accent-danger)', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <Trash2 size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>פעולה בלתי הפיכה</div>
                <div>המשתמש <strong>{selected.fullName}</strong> (@{selected.username}) יימחק לצמיתות ממערכת הנתונים. לא ניתן לשחזר פעולה זו.</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>ביטול</Button>
              <Button variant="danger" icon={<Trash2 size={14} />} onClick={handleDeleteUser}>אישור מחיקה</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Change Password Modal */}
      <Modal open={showChangePass} onClose={() => { setShowChangePass(false); setNewPass(''); setConfirmPass(''); setPassError(''); }} title={`שינוי סיסמה — ${selected?.fullName || ''}`} size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>סיסמה חדשה</label>
            <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="הכנס סיסמה חדשה" style={INPUT_STYLE} />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>אימות סיסמה</label>
            <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="הכנס שוב את הסיסמה" style={INPUT_STYLE} />
          </div>
          {passError && (
            <div style={{ background: 'rgba(255,59,92,0.1)', border: '1px solid rgba(255,59,92,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--accent-danger)' }}>
              {passError}
            </div>
          )}
          {passSaved && (
            <div style={{ background: 'rgba(0,196,140,0.1)', border: '1px solid rgba(0,196,140,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--accent-success)', textAlign: 'center' }}>
              ✓ הסיסמה עודכנה בהצלחה
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => { setShowChangePass(false); setNewPass(''); setConfirmPass(''); setPassError(''); }}>ביטול</Button>
            <Button variant="primary" icon={<Lock size={14} />} onClick={handleChangePassword}>שמור סיסמה</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
