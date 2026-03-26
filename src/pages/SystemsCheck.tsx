import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, RefreshCw, CheckCircle, Calendar, ClipboardCheck, AlertCircle, Settings2, Edit2, Clock } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useSystemsStore } from '../store/systemsStore';
import { useAppStore } from '../store/appStore';
import { useListsStore } from '../store/listsStore';
import { systemsApi } from '../api/client';
import type { MonitoredSystem, SystemStatus, DailyCheckSession, SystemCheck } from '../types';
import { format, addDays } from 'date-fns';

type DayCheck = SystemCheck & { systemName: string; systemCategory: string };

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: SystemStatus; label: string }[] = [
  { value: 'online',   label: 'תקין' },
  { value: 'degraded', label: 'לקוי' },
  { value: 'offline',  label: 'לא זמין' },
];

const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const INPUT: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  background: 'var(--bg-hover)', border: '1px solid var(--border)',
  borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px',
  boxSizing: 'border-box',
};

const LABEL: React.CSSProperties = {
  fontSize: '12px', color: 'var(--text-secondary)',
  marginBottom: '6px', display: 'block',
};

const navBtn: React.CSSProperties = {
  padding: '7px 14px', fontSize: '13px', borderRadius: '8px',
  border: '1px solid var(--border)', background: 'var(--bg-card)',
  color: 'var(--text-secondary)', cursor: 'pointer',
};

// ── SystemCard ────────────────────────────────────────────────────────────────

function SystemCard({
  system,
  onUpdate,
  onEdit,
}: {
  system: MonitoredSystem;
  onUpdate: () => void;
  onEdit: (sys: MonitoredSystem) => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [notes, setNotes] = useState('');
  const [newStatus, setNewStatus] = useState<SystemStatus>(system.currentStatus);
  const [saving, setSaving] = useState(false);
  const { updateSystemStatus } = useSystemsStore();
  const { currentUser, addToast } = useAppStore();

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await updateSystemStatus(system.id!, newStatus, notes, currentUser?.fullName || 'אנליסט');
      addToast({ type: newStatus === 'online' ? 'success' : 'warning', message: `${system.name} עודכן ל-${STATUS_OPTIONS.find(o => o.value === newStatus)?.label}` });
      setUpdating(false);
      setNotes('');
      onUpdate();
    } catch {
      addToast({ type: 'error', message: 'שגיאה בעדכון סטטוס' });
    } finally {
      setSaving(false);
    }
  };

  const statusGlow: Record<SystemStatus, string> = {
    online:   'none',
    degraded: '0 0 15px rgba(255, 176, 32, 0.2)',
    offline:  '0 0 15px rgba(255, 59, 92, 0.3)',
  };

  return (
    <motion.div whileHover={{ scale: 1.02 }}
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '14px', padding: '18px',
        boxShadow: statusGlow[system.currentStatus],
      }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{system.name}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{system.category}</div>
        </div>
        <Badge value={system.currentStatus} />
      </div>

      {system.description && (
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>
          {system.description}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        {system.lastChecked && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            בדיקה אחרונה: {format(new Date(system.lastChecked), 'dd/MM HH:mm')}
          </span>
        )}
        <div style={{ display: 'flex', gap: '6px' }}>
          <Button variant="ghost" size="sm" onClick={() => onEdit(system)}>עריכה</Button>
          <Button variant="ghost" size="sm" icon={<RefreshCw size={12} />} onClick={() => { setUpdating(true); setNewStatus(system.currentStatus); }}>
            עדכן סטטוס
          </Button>
        </div>
      </div>

      {updating && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            {STATUS_OPTIONS.map(opt => {
              const active = newStatus === opt.value;
              const bg = active
                ? opt.value === 'online' ? 'var(--accent-success)' : opt.value === 'degraded' ? 'var(--accent-warning)' : 'var(--accent-danger)'
                : 'var(--bg-hover)';
              return (
                <button key={opt.value} onClick={() => setNewStatus(opt.value)}
                  style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--border)', background: bg, color: active ? '#000' : 'var(--text-secondary)', fontWeight: active ? 700 : 400, fontFamily: 'inherit' }}>
                  {opt.label}
                </button>
              );
            })}
          </div>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="הערות (אופציונלי)"
            style={{ ...INPUT, marginBottom: '8px', fontSize: '12px' }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="primary" size="sm" onClick={handleUpdate} disabled={saving}>
              {saving ? 'שומר...' : 'שמור'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setUpdating(false)}>ביטול</Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SystemsCheck() {
  const [activeTab, setActiveTab] = useState<'daily' | 'manage'>('daily');
  const { systems, addSystem, updateSystem } = useSystemsStore();
  const { addToast, currentUser, logActivity } = useAppStore();
  const { systemCategories } = useListsStore();

  // ── Week navigation ───────────────────────────────────────────────────────
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayStr = new Date().toISOString().split('T')[0];

  // ── Daily sessions ────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<DailyCheckSession[]>([]);

  const loadSessions = useCallback(async () => {
    try {
      const start = weekStart.toISOString().split('T')[0];
      const end = addDays(weekStart, 6).toISOString().split('T')[0];
      const all = await systemsApi.getDailySessions();
      setSessions(all.filter(s => s.date >= start && s.date <= end));
    } catch {
      addToast({ type: 'error', message: 'שגיאה בטעינת בדיקות' });
    }
  }, [weekStart]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const getSession = (dateStr: string) => sessions.find(s => s.date === dateStr);

  // ── Day detail modal ──────────────────────────────────────────────────────
  const [detailDay, setDetailDay] = useState<{ dateStr: string; session: DailyCheckSession | null } | null>(null);
  const [dayChecks, setDayChecks] = useState<DayCheck[]>([]);
  const [loadingDayDetail, setLoadingDayDetail] = useState(false);
  const [editingInlineId, setEditingInlineId] = useState<number | null>(null);
  const [inlineDraft, setInlineDraft] = useState<{ status: SystemStatus; notes: string }>({ status: 'online', notes: '' });
  const [savingInline, setSavingInline] = useState(false);

  const openDayDetail = useCallback(async (dateStr: string, session: DailyCheckSession | null) => {
    setDetailDay({ dateStr, session });
    setEditingInlineId(null);
    setLoadingDayDetail(true);
    try {
      const checks = await systemsApi.getChecksByDate(dateStr);
      setDayChecks(checks);
    } catch {
      addToast({ type: 'error', message: 'שגיאה בטעינת נתוני הבדיקה' });
    } finally {
      setLoadingDayDetail(false);
    }
  }, [addToast]);

  // Latest check per systemId for the selected day
  const latestCheckMap = dayChecks.reduce<Record<number, DayCheck>>((acc, c) => {
    if (!acc[c.systemId] || c.checkedAt > acc[c.systemId].checkedAt) acc[c.systemId] = c;
    return acc;
  }, {});

  const handleInlineSave = async (systemId: number) => {
    setSavingInline(true);
    try {
      await systemsApi.addCheck(systemId, {
        systemId,
        status: inlineDraft.status,
        checkedBy: currentUser?.fullName || 'אנליסט',
        checkedAt: new Date().toISOString(),
        notes: inlineDraft.notes,
      });
      const checks = await systemsApi.getChecksByDate(detailDay!.dateStr);
      setDayChecks(checks);
      await loadSessions();
      setEditingInlineId(null);
      addToast({ type: 'success', message: 'סטטוס עודכן בהצלחה' });
    } catch {
      addToast({ type: 'error', message: 'שגיאה בעדכון הסטטוס' });
    } finally {
      setSavingInline(false);
    }
  };

  // ── Daily check modal ─────────────────────────────────────────────────────
  const [showDailyCheck, setShowDailyCheck] = useState(false);
  const [checkDate, setCheckDate] = useState('');
  const [systemStatuses, setSystemStatuses] = useState<Record<number, { status: SystemStatus; notes: string }>>({});
  const [checkNotes, setCheckNotes] = useState('');
  const [isSavingDaily, setIsSavingDaily] = useState(false);

  const openDailyCheck = (dateStr: string) => {
    setCheckDate(dateStr);
    const initial: Record<number, { status: SystemStatus; notes: string }> = {};
    systems.filter(s => s.isActive).forEach(s => {
      if (s.id != null) initial[s.id] = { status: s.currentStatus, notes: '' };
    });
    setSystemStatuses(initial);
    setCheckNotes('');
    setShowDailyCheck(true);
  };

  const handleSaveDailyCheck = async () => {
    setIsSavingDaily(true);
    try {
      const activeSystems = systems.filter(s => s.isActive && s.id != null);
      const checkedBy = currentUser?.fullName || 'אנליסט';
      const now = new Date().toISOString();

      for (const sys of activeSystems) {
        const { status, notes } = systemStatuses[sys.id!] ?? { status: sys.currentStatus, notes: '' };
        await systemsApi.addCheck(sys.id!, { systemId: sys.id!, status, checkedBy, checkedAt: now, notes: notes || '' });
      }

      const vals = activeSystems.map(s => systemStatuses[s.id!] ?? { status: s.currentStatus });
      await systemsApi.saveDailySession({
        date: checkDate,
        checkedBy,
        completedAt: now,
        totalSystems: activeSystems.length,
        onlineSystems: vals.filter(v => v.status === 'online').length,
        degradedSystems: vals.filter(v => v.status === 'degraded').length,
        offlineSystems: vals.filter(v => v.status === 'offline').length,
        notes: checkNotes || '',
      });

      logActivity('בדיקה יומית', 'בדיקת מערכות', `${checkedBy} ביצע בדיקה יומית לתאריך ${checkDate}`).catch(() => {});
      addToast({ type: 'success', message: 'בדיקה יומית נשמרה בהצלחה' });
      setShowDailyCheck(false);
      await loadSessions();
    } catch {
      addToast({ type: 'error', message: 'שגיאה בשמירת הבדיקה' });
    } finally {
      setIsSavingDaily(false);
    }
  };

  // ── Edit system ───────────────────────────────────────────────────────────
  const [editSystem, setEditSystem] = useState<MonitoredSystem | null>(null);
  const [editSysDraft, setEditSysDraft] = useState({ name: '', category: '', description: '', owner: '', checkFrequency: 'daily' as 'hourly' | 'daily' | 'weekly' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const openEditSystem = (sys: MonitoredSystem) => {
    setEditSystem(sys);
    setEditSysDraft({ name: sys.name, category: sys.category, description: sys.description || '', owner: sys.owner || '', checkFrequency: sys.checkFrequency });
  };

  const handleSaveEditSystem = async () => {
    if (!editSystem?.id || !editSysDraft.name.trim()) return;
    setIsSavingEdit(true);
    try {
      await updateSystem(editSystem.id, editSysDraft);
      setEditSystem(null);
      addToast({ type: 'success', message: 'מערכת עודכנה' });
    } catch {
      addToast({ type: 'error', message: 'שגיאה בעדכון המערכת' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ── Add system ────────────────────────────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false);
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState({ name: '', category: '', description: '', owner: '', checkFrequency: 'daily' as const });
  const [isSavingAdd, setIsSavingAdd] = useState(false);

  const handleAdd = async () => {
    if (!form.name.trim()) {
      addToast({ type: 'error', message: 'יש להזין שם מערכת' });
      return;
    }
    setIsSavingAdd(true);
    try {
      await addSystem({ ...form, isActive: true, currentStatus: 'online' });
      setShowAdd(false);
      setForm({ name: '', category: '', description: '', owner: '', checkFrequency: 'daily' });
      addToast({ type: 'success', message: 'מערכת חדשה נוספה' });
    } catch {
      addToast({ type: 'error', message: 'שגיאה בהוספת מערכת' });
    } finally {
      setIsSavingAdd(false);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    online:   systems.filter(s => s.currentStatus === 'online').length,
    degraded: systems.filter(s => s.currentStatus === 'degraded').length,
    offline:  systems.filter(s => s.currentStatus === 'offline').length,
  };

  const filtered = systems.filter(s => {
    if (filterCat && s.category !== filterCat) return false;
    if (filterStatus && s.currentStatus !== filterStatus) return false;
    return true;
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>בדיקת מערכות</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
            ניטור ובדיקות יומיות של מערכות אבטחה
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {activeTab === 'daily' && !getSession(todayStr) && (
            <Button variant="primary" icon={<ClipboardCheck size={14} />} onClick={() => openDailyCheck(todayStr)}>
              בצע בדיקה יומית
            </Button>
          )}
          {activeTab === 'manage' && (
            <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowAdd(true)}>
              הוסף מערכת
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'מערכות תקינות',    count: stats.online,   color: 'var(--accent-success)' },
          { label: 'מערכות לקויות',    count: stats.degraded, color: 'var(--accent-warning)' },
          { label: 'מערכות לא זמינות', count: stats.offline,  color: 'var(--accent-danger)' },
        ].map(s => (
          <Card key={s.label}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: s.color, boxShadow: `0 0 10px ${s.color}` }} />
              <div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.count}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{s.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid var(--border)' }}>
        {[
          { id: 'daily',  label: 'בדיקות יומיות', icon: <Calendar size={14} /> },
          { id: 'manage', label: 'ניהול מערכות',  icon: <Settings2 size={14} /> },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as 'daily' | 'manage')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 16px', border: 'none', cursor: 'pointer', background: 'transparent',
              color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontSize: '13px', fontWeight: activeTab === tab.id ? 700 : 400,
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
              marginBottom: '-1px', fontFamily: 'inherit',
            }}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ── Daily Checks Tab ── */}
      {activeTab === 'daily' && (
        <div>
          {/* Week navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <button onClick={() => setWeekStart(d => addDays(d, -7))} style={navBtn}>‹ שבוע קודם</button>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {format(weekStart, 'dd/MM/yyyy')} – {format(addDays(weekStart, 6), 'dd/MM/yyyy')}
            </span>
            <button onClick={() => setWeekStart(d => addDays(d, 7))} style={navBtn}>שבוע הבא ›</button>
          </div>

          {/* Weekly grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
            {days.map((day, i) => {
              const dateStr = day.toISOString().split('T')[0];
              const session = getSession(dateStr);
              const isToday = dateStr === todayStr;
              const isPast = day < new Date() && !isToday;

              const isClickable = !!(session || isToday);
              return (
                <motion.div key={dateStr}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={isClickable ? () => openDayDetail(dateStr, session ?? null) : undefined}
                  whileHover={isClickable ? { scale: 1.03 } : undefined}
                  style={{
                    background: isToday ? 'rgba(0, 212, 255, 0.06)' : 'var(--bg-card)',
                    border: `1px solid ${isToday ? 'var(--accent-primary)' : session ? 'rgba(0,196,140,0.3)' : 'var(--border)'}`,
                    borderRadius: '12px', padding: '14px 10px',
                    minHeight: '180px', display: 'flex', flexDirection: 'column', gap: '10px',
                    cursor: isClickable ? 'pointer' : 'default',
                  }}>
                  {/* Day header */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: isToday ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: 700, marginBottom: '2px' }}>
                      {DAYS_HE[i]}
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: isToday ? 'var(--accent-primary)' : 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
                      {format(day, 'dd')}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{format(day, 'MM/yyyy')}</div>
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {session ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                          <CheckCircle size={13} color="var(--accent-success)" />
                          <span style={{ fontSize: '11px', color: 'var(--accent-success)', fontWeight: 700 }}>נבדק</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>👤 {session.checkedBy}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px' }}>🕒 {format(new Date(session.completedAt), 'HH:mm')}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: 'auto' }}>
                          {session.onlineSystems > 0   && <div style={{ fontSize: '10px', color: 'var(--accent-success)' }}>✓ {session.onlineSystems} תקינות</div>}
                          {session.degradedSystems > 0 && <div style={{ fontSize: '10px', color: 'var(--accent-warning)' }}>⚠ {session.degradedSystems} לקויות</div>}
                          {session.offlineSystems > 0  && <div style={{ fontSize: '10px', color: 'var(--accent-danger)' }}>✕ {session.offlineSystems} לא זמינות</div>}
                        </div>
                      </>
                    ) : (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {isToday ? (
                          <>
                            <AlertCircle size={20} color="var(--accent-warning)" />
                            <span style={{ fontSize: '11px', color: 'var(--accent-warning)', textAlign: 'center' }}>לא נבדק עדיין</span>
                            <button onClick={() => openDailyCheck(dateStr)}
                              style={{ fontSize: '11px', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--accent-primary)', background: 'transparent', color: 'var(--accent-primary)', cursor: 'pointer', fontFamily: 'inherit' }}>
                              בצע בדיקה
                            </button>
                          </>
                        ) : isPast ? (
                          <>
                            <AlertCircle size={16} color="var(--accent-danger)" />
                            <span style={{ fontSize: '10px', color: 'var(--accent-danger)', textAlign: 'center' }}>לא בוצעה בדיקה</span>
                          </>
                        ) : (
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>מתוכנן</span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Manage Systems Tab ── */}
      {activeTab === 'manage' && (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              style={{ padding: '9px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              <option value="">כל הקטגוריות</option>
              {systemCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: '9px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              <option value="">כל הסטטוסים</option>
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {filtered.map(sys => (
              <SystemCard key={`${sys.id}-${refreshKey}`} system={sys} onUpdate={() => setRefreshKey(r => r + 1)} onEdit={openEditSystem} />
            ))}
            {filtered.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontSize: '14px' }}>
                אין מערכות להצגה
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Day Detail Modal ── */}
      <Modal
        open={!!detailDay}
        onClose={() => { setDetailDay(null); setEditingInlineId(null); }}
        title={detailDay ? `${detailDay.dateStr === todayStr ? 'היום — ' : ''}בדיקה יומית — ${detailDay.dateStr}` : ''}
        size="lg"
      >
        {detailDay && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Session summary */}
            {detailDay.session ? (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '10px 14px', background: 'var(--bg-hover)', borderRadius: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>👤 <strong style={{ color: 'var(--text-primary)' }}>{detailDay.session.checkedBy}</strong></span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>🕒 {format(new Date(detailDay.session.completedAt), 'HH:mm')}</span>
                <span style={{ fontSize: '13px', color: 'var(--accent-success)' }}>✓ {detailDay.session.onlineSystems} תקינות</span>
                {detailDay.session.degradedSystems > 0 && <span style={{ fontSize: '13px', color: 'var(--accent-warning)' }}>⚠ {detailDay.session.degradedSystems} לקויות</span>}
                {detailDay.session.offlineSystems > 0 && <span style={{ fontSize: '13px', color: 'var(--accent-danger)' }}>✕ {detailDay.session.offlineSystems} לא זמינות</span>}
                {detailDay.session.notes && <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: '100%' }}>📝 {detailDay.session.notes}</span>}
              </div>
            ) : detailDay.dateStr === todayStr ? (
              <div style={{ padding: '10px 14px', background: 'rgba(255,176,32,0.1)', borderRadius: '8px', fontSize: '13px', color: 'var(--accent-warning)' }}>
                ⚠ לא בוצעה בדיקה יומית סדורה עדיין — ניתן לעדכן מצב מערכות בודדות
              </div>
            ) : null}

            {/* Systems list */}
            {loadingDayDetail ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>טוען...</div>
            ) : (
              <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {systems.filter(s => s.isActive && s.id != null).map(sys => {
                  const check = latestCheckMap[sys.id!];
                  const isEditing = editingInlineId === sys.id;
                  const displayStatus: SystemStatus = check?.status ?? sys.currentStatus;

                  return (
                    <div key={sys.id} style={{ background: 'var(--bg-hover)', borderRadius: '10px', padding: '12px 14px', border: '1px solid var(--border)' }}>
                      {/* Row header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{sys.name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sys.category}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Badge value={displayStatus} />
                          {check && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Clock size={10} />{format(new Date(check.checkedAt), 'HH:mm')}
                            </span>
                          )}
                          {detailDay.dateStr === todayStr && !isEditing && (
                            <button
                              onClick={() => { setEditingInlineId(sys.id!); setInlineDraft({ status: displayStatus, notes: check?.notes || '' }); }}
                              style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--accent-primary)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Edit2 size={10} /> עדכן
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Check notes (read-only) */}
                      {!isEditing && check?.notes && (
                        <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)', paddingRight: '4px' }}>
                          📝 {check.notes}
                        </div>
                      )}

                      {/* Inline edit form (today only) */}
                      {isEditing && (
                        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {STATUS_OPTIONS.map(opt => {
                              const active = inlineDraft.status === opt.value;
                              const bg = active
                                ? opt.value === 'online' ? 'var(--accent-success)' : opt.value === 'degraded' ? 'var(--accent-warning)' : 'var(--accent-danger)'
                                : 'var(--bg-card)';
                              return (
                                <button key={opt.value} onClick={() => setInlineDraft(d => ({ ...d, status: opt.value }))}
                                  style={{ padding: '5px 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--border)', background: bg, color: active ? '#000' : 'var(--text-secondary)', fontWeight: active ? 700 : 400, fontFamily: 'inherit' }}>
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                          <input
                            value={inlineDraft.notes}
                            onChange={e => setInlineDraft(d => ({ ...d, notes: e.target.value }))}
                            placeholder="הערות (אופציונלי)"
                            style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px', boxSizing: 'border-box' }}
                          />
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <Button variant="primary" size="sm" onClick={() => handleInlineSave(sys.id!)} disabled={savingInline}>
                              {savingInline ? 'שומר...' : 'שמור'}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingInlineId(null)}>ביטול</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer — option to open full daily check for today if no session */}
            {detailDay.dateStr === todayStr && !detailDay.session && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                <Button variant="primary" icon={<ClipboardCheck size={14} />} onClick={() => { setDetailDay(null); openDailyCheck(todayStr); }}>
                  בצע בדיקה יומית מלאה
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Daily Check Modal ── */}
      <Modal open={showDailyCheck} onClose={() => setShowDailyCheck(false)} title={`בדיקה יומית — ${checkDate}`} size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ padding: '10px 14px', background: 'var(--bg-hover)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            בדיקה מבוצעת על ידי: <strong style={{ color: 'var(--accent-primary)' }}>{currentUser?.fullName}</strong>
            &nbsp;|&nbsp; {systems.filter(s => s.isActive).length} מערכות לבדיקה
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {systems.filter(s => s.isActive).map(sys => (
              <div key={sys.id} style={{ background: 'var(--bg-hover)', borderRadius: '8px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{sys.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '8px' }}>{sys.category}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {STATUS_OPTIONS.map(opt => {
                      const isActive = systemStatuses[sys.id!]?.status === opt.value;
                      const bg = isActive
                        ? opt.value === 'online' ? 'var(--accent-success)' : opt.value === 'degraded' ? 'var(--accent-warning)' : 'var(--accent-danger)'
                        : 'var(--bg-card)';
                      return (
                        <button key={opt.value}
                          onClick={() => setSystemStatuses(prev => ({ ...prev, [sys.id!]: { ...prev[sys.id!], status: opt.value } }))}
                          style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '5px', cursor: 'pointer', border: '1px solid var(--border)', background: bg, color: isActive ? '#000' : 'var(--text-secondary)', fontWeight: isActive ? 700 : 400, fontFamily: 'inherit' }}>
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <input
                  value={systemStatuses[sys.id!]?.notes || ''}
                  onChange={e => setSystemStatuses(prev => ({ ...prev, [sys.id!]: { ...prev[sys.id!], notes: e.target.value } }))}
                  placeholder="הערות לגבי מערכת זו (אופציונלי)"
                  style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>
            ))}
          </div>

          <div>
            <label style={LABEL}>הערות כלליות לבדיקה</label>
            <textarea value={checkNotes} onChange={e => setCheckNotes(e.target.value)} rows={2}
              placeholder="תיאור כללי של ממצאי הבדיקה..."
              style={{ ...INPUT, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px' }}>
            <Button variant="ghost" onClick={() => setShowDailyCheck(false)}>ביטול</Button>
            <Button variant="primary" icon={<CheckCircle size={14} />} onClick={handleSaveDailyCheck} disabled={isSavingDaily}>
              {isSavingDaily ? 'שומר...' : 'שמור בדיקה'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Edit System Modal ── */}
      <Modal open={!!editSystem} onClose={() => setEditSystem(null)} title="עריכת מערכת" size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {([
            { label: 'שם המערכת *', key: 'name' },
            { label: 'בעל המערכת',  key: 'owner' },
            { label: 'תיאור',       key: 'description' },
          ] as { label: string; key: keyof typeof editSysDraft }[]).map(f => (
            <div key={f.key}>
              <label style={LABEL}>{f.label}</label>
              <input value={editSysDraft[f.key]} onChange={e => setEditSysDraft(d => ({ ...d, [f.key]: e.target.value }))} style={INPUT} />
            </div>
          ))}
          <div>
            <label style={LABEL}>קטגוריה</label>
            <select value={editSysDraft.category} onChange={e => setEditSysDraft(d => ({ ...d, category: e.target.value }))} style={INPUT}>
              {systemCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={LABEL}>תדירות בדיקה</label>
            <select value={editSysDraft.checkFrequency} onChange={e => setEditSysDraft(d => ({ ...d, checkFrequency: e.target.value as 'hourly' | 'daily' | 'weekly' }))} style={INPUT}>
              <option value="hourly">שעתי</option>
              <option value="daily">יומי</option>
              <option value="weekly">שבועי</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setEditSystem(null)}>ביטול</Button>
            <Button variant="primary" onClick={handleSaveEditSystem} disabled={!editSysDraft.name.trim() || isSavingEdit}>
              {isSavingEdit ? 'שומר...' : 'שמור'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Add System Modal ── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="הוסף מערכת חדשה" size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {([
            { label: 'שם המערכת *', key: 'name',        placeholder: 'לדוגמה: Splunk SIEM' },
            { label: 'בעל המערכת',  key: 'owner',       placeholder: 'שם הבעלים' },
            { label: 'תיאור',       key: 'description', placeholder: 'תיאור קצר' },
          ] as { label: string; key: keyof typeof form; placeholder: string }[]).map(f => (
            <div key={f.key}>
              <label style={LABEL}>{f.label}</label>
              <input value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder} style={INPUT} />
            </div>
          ))}
          <div>
            <label style={LABEL}>קטגוריה</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={INPUT}>
              <option value="">— בחר קטגוריה —</option>
              {systemCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>ביטול</Button>
            <Button variant="primary" onClick={handleAdd} disabled={isSavingAdd}>
              {isSavingAdd ? 'מוסיף...' : 'הוסף'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
