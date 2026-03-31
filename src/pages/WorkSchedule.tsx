import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Users, Clock } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { analystsApi, settingsApi, usersApi } from '../api/client';
import { useAppStore } from '../store/appStore';
import type { Analyst, Shift, ShiftType } from '../types';
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import { getAnalystColor } from '../utils/analystColors';

// ─── Shift definitions ──────────────────────────────────────────
const SHIFTS_8H = [
  { type: 'morning' as ShiftType,   label: 'בוקר',    start: '07:00', end: '15:00' },
  { type: 'afternoon' as ShiftType, label: 'צהריים',  start: '15:00', end: '23:00' },
  { type: 'night' as ShiftType,     label: 'לילה',    start: '23:00', end: '07:00' },
];


const SHIFT_COLORS: Record<ShiftType, { bg: string; color: string }> = {
  morning:   { bg: 'rgba(255,176,32,0.12)',   color: '#ffb020' },
  afternoon: { bg: 'rgba(0,212,255,0.10)',    color: '#00d4ff' },
  night:     { bg: 'rgba(139,92,246,0.12)',   color: '#8b5cf6' },
};

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

// ─── Component ──────────────────────────────────────────────────
export function WorkSchedule() {
  const { logActivity } = useAppStore();

  const [weekStart, setWeekStart] = useState(() => {
    const saved = sessionStorage.getItem('ws_week');
    if (saved) { const d = new Date(saved); if (!isNaN(d.getTime())) return d; }
    return startOfWeek(new Date(), { weekStartsOn: 0 });
  });

  const changeWeek = (w: Date) => {
    sessionStorage.setItem('ws_week', w.toISOString());
    setWeekStart(w);
  };
  const [analysts, setAnalysts] = useState<Analyst[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  // dayModes: date string → '3' (8h, 3 shifts) | '2' (12h, 2 shifts), default '3'
  const [dayModes, setDayModes] = useState<Record<string, '3' | '2'>>({});

  // Assignment modal
  const [showAssign, setShowAssign] = useState(false);
  const [assignSlot, setAssignSlot] = useState<{
    date: string; shiftType: ShiftType; label: string; start: string; end: string;
  } | null>(null);
  const [slotAnalysts, setSlotAnalysts] = useState<[string, string, string]>(['', '', '']);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // ─── Loaders ──────────────────────────────────────────────────
  const loadShifts = useCallback(async () => {
    const start = format(weekStart, 'yyyy-MM-dd');
    const end = format(addDays(weekStart, 6), 'yyyy-MM-dd');
    const result = await analystsApi.getShifts(start, end);
    setShifts(result);
  }, [weekStart]);

  const loadDayModes = async () => {
    const map = await settingsApi.getAll();
    const setting = map['shift_day_modes'];
    if (setting) {
      try { setDayModes(JSON.parse(setting)); } catch {}
    }
  };

  useEffect(() => {
    usersApi.getAll().then(users =>
      setAnalysts(
        users
          .filter(u => u.isActive)
          .map(u => ({ id: u.id, name: u.fullName, role: u.role, email: u.email, status: 'active' as const }))
      )
    );
    loadDayModes();
  }, []);

  useEffect(() => { loadShifts(); }, [loadShifts]);

  // ─── Day mode helpers ─────────────────────────────────────────
  const getMode = (date: Date): '3' | '2' =>
    dayModes[format(date, 'yyyy-MM-dd')] || '3';

  const toggleDayMode = async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const current = dayModes[dateStr] || '3';
    const newMode = current === '3' ? '2' : '3';
    const newModes: Record<string, '3' | '2'> = { ...dayModes, [dateStr]: newMode };
    setDayModes(newModes);
    await settingsApi.set('shift_day_modes', JSON.stringify(newModes));
    // Remove afternoon shifts when switching to 12h mode
    if (newMode === '2') {
      const allShifts = await analystsApi.getShifts(dateStr, dateStr);
      const toDelete = allShifts.filter(s => s.shiftType === 'afternoon');
      for (const s of toDelete) if (s.id) await analystsApi.deleteShift(s.id);
      await loadShifts();
    }
  };

  // ─── Assignment modal ─────────────────────────────────────────
  const openAssign = (date: Date, shiftDef: typeof SHIFTS_8H[0]) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const existing = shifts.filter(s => s.date === dateStr && s.shiftType === shiftDef.type);
    const ids: [string, string, string] = ['', '', ''];
    existing.slice(0, 3).forEach((s, i) => { ids[i] = s.analystId.toString(); });
    setAssignSlot({ date: dateStr, shiftType: shiftDef.type, label: shiftDef.label, start: shiftDef.start, end: shiftDef.end });
    setSlotAnalysts(ids);
    setShowAssign(true);
  };

  const handleSaveAssignment = async () => {
    if (!assignSlot) return;
    // Delete existing
    const existing = await analystsApi.getShifts(assignSlot.date, assignSlot.date);
    for (const s of existing.filter(s => s.shiftType === assignSlot.shiftType)) {
      if (s.id) await analystsApi.deleteShift(s.id);
    }
    // Add new
    const selected = slotAnalysts.filter(id => id !== '');
    for (const id of selected) {
      await analystsApi.addShift({
        analystId: parseInt(id),
        shiftType: assignSlot.shiftType,
        date: assignSlot.date,
        startTime: assignSlot.start,
        endTime: assignSlot.end,
      });
    }
    await loadShifts();
    if (selected.length > 0) {
      const names = selected.map(id => analysts.find(a => a.id === parseInt(id))?.name || id).join(', ');
      await logActivity('שיבוץ משמרת', 'סידור עבודה', `${assignSlot.date} ${assignSlot.label} (${assignSlot.start}–${assignSlot.end}): ${names}`);
    }
    setShowAssign(false);
  };

  // ─── Render ───────────────────────────────────────────────────
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>סידור עבודה</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
            שבוע {format(weekStart, 'dd/MM')} — {format(addDays(weekStart, 6), 'dd/MM/yyyy')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={() => changeWeek(subWeeks(weekStart, 1))}
            style={{ padding: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <ChevronRight size={16} />
          </button>
          <button onClick={() => changeWeek(startOfWeek(new Date(), { weekStartsOn: 0 }))}
            style={{ padding: '8px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'inherit' }}>
            השבוע
          </button>
          <button onClick={() => changeWeek(addWeeks(weekStart, 1))}
            style={{ padding: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-secondary)', alignItems: 'center' }}>
        {SHIFTS_8H.map(({ type, label }) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 12, height: 12, borderRadius: '3px', background: SHIFT_COLORS[type].bg, border: `1px solid ${SHIFT_COLORS[type].color}` }} />
            {label}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-success)' }}>
          <Clock size={12} />
          <span>12h — לחץ על הכפתור בראש יום לשינוי מצב</span>
        </div>
      </div>

      {/* Weekly Grid */}
      <Card noPadding>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '780px' }}>
            <thead>
              <tr>
                {/* Shift label column */}
                <th style={{ width: '100px', padding: '12px 14px', borderBottom: '1px solid var(--border)', textAlign: 'right', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}>
                  משמרת
                </th>
                {days.map((day, i) => {
                  const isToday = format(day, 'yyyy-MM-dd') === todayStr;
                  const mode = getMode(day);
                  return (
                    <th key={i} style={{
                      padding: '10px 8px', borderBottom: '1px solid var(--border)',
                      background: isToday ? 'rgba(0,212,255,0.05)' : 'transparent',
                      textAlign: 'center', minWidth: '110px',
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: isToday ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                        {DAY_NAMES[i]}
                      </div>
                      <div style={{ fontSize: '11px', color: isToday ? 'var(--accent-primary)' : 'var(--text-muted)', marginTop: '2px', fontFamily: 'JetBrains Mono, monospace' }}>
                        {format(day, 'dd/MM')}
                      </div>
                      <button
                        onClick={() => toggleDayMode(day)}
                        title={mode === '3' ? 'עבור ל-2 משמרות (12 שעות)' : 'עבור ל-3 משמרות (8 שעות)'}
                        style={{
                          marginTop: '6px', padding: '3px 10px', fontSize: '10px', borderRadius: '4px',
                          cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                          background: mode === '2' ? 'rgba(0,196,140,0.15)' : 'var(--bg-hover)',
                          border: `1px solid ${mode === '2' ? 'rgba(0,196,140,0.5)' : 'var(--border)'}`,
                          color: mode === '2' ? 'var(--accent-success)' : 'var(--text-muted)',
                          transition: 'all 0.15s',
                        }}>
                        {mode === '2' ? '12h ×2' : '8h ×3'}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {SHIFTS_8H.map(shiftDef => (
                <tr key={shiftDef.type} style={{ borderBottom: '1px solid var(--border)' }}>
                  {/* Row header */}
                  <td style={{ padding: '12px 14px', verticalAlign: 'middle', borderRight: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: SHIFT_COLORS[shiftDef.type].color }}>
                      {shiftDef.label}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'JetBrains Mono, monospace' }}>
                      {shiftDef.start}–{shiftDef.end}
                    </div>
                  </td>

                  {days.map((day, i) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const mode = getMode(day);
                    const isToday = dateStr === todayStr;

                    // In 12h mode, afternoon is disabled
                    if (mode === '2' && shiftDef.type === 'afternoon') {
                      return (
                        <td key={i} style={{
                          padding: '8px', borderRight: '1px solid var(--border)',
                          background: 'rgba(0,0,0,0.08)',
                        }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', opacity: 0.5 }}>—</div>
                        </td>
                      );
                    }

                    // Effective times for 12h mode
                    const effectiveDef = mode === '2'
                      ? { ...shiftDef, start: shiftDef.type === 'morning' ? '07:00' : '19:00', end: shiftDef.type === 'morning' ? '19:00' : '07:00' }
                      : shiftDef;

                    const assigned = shifts.filter(s => s.date === dateStr && s.shiftType === shiftDef.type);

                    return (
                      <td key={i}
                        onClick={() => openAssign(day, effectiveDef)}
                        style={{
                          padding: '8px', verticalAlign: 'top', cursor: 'pointer',
                          background: isToday ? 'rgba(0,212,255,0.03)' : 'transparent',
                          borderRight: '1px solid var(--border)',
                          minHeight: '60px', minWidth: '110px',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isToday ? 'rgba(0,212,255,0.03)' : ''; }}
                      >
                        {assigned.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {assigned.map(s => {
                              const analyst = analysts.find(a => a.id === s.analystId);
                              if (!analyst) return null;
                              const ac = getAnalystColor(s.analystId);
                              return (
                                <div key={s.id} style={{
                                  padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                                  background: ac.bg,
                                  color: ac.color,
                                  border: `1px solid ${ac.color}40`,
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                  {analyst.name}
                                </div>
                              );
                            })}
                            {/* Show 12h indicator */}
                            {mode === '2' && (
                              <div style={{ fontSize: '9px', color: 'var(--accent-success)', marginTop: '2px', fontFamily: 'JetBrains Mono, monospace' }}>
                                {effectiveDef.start}–{effectiveDef.end}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center', paddingTop: '10px', opacity: 0.4 }}>
                            + שבץ
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '16px' }}>
        {SHIFTS_8H.map(shiftDef => {
          const count = shifts.filter(s => s.shiftType === shiftDef.type).length;
          const colors = SHIFT_COLORS[shiftDef.type];
          return (
            <Card key={shiftDef.type}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: colors.color, fontFamily: 'JetBrains Mono, monospace' }}>{count}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  שיבוצי {shiftDef.label} השבוע
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Assignment Modal */}
      {assignSlot && (
        <Modal
          open={showAssign}
          onClose={() => setShowAssign(false)}
          title={`שיבוץ — ${assignSlot.date} · ${assignSlot.label} · ${assignSlot.start}–${assignSlot.end}`}
          size="sm"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-hover)', padding: '8px 12px', borderRadius: '8px' }}>
              ניתן לשבץ עד 3 אנליסטים למשמרת. השאר ריק אם לא נדרש.
            </div>
            {([0, 1, 2] as const).map(idx => (
              <div key={idx}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  אנליסט {idx + 1} {idx === 0 ? '' : <span style={{ color: 'var(--text-muted)' }}>(אופציונלי)</span>}
                </label>
                <select
                  value={slotAnalysts[idx]}
                  onChange={e => setSlotAnalysts(prev => {
                    const n = [...prev] as [string, string, string];
                    n[idx] = e.target.value;
                    return n;
                  })}
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit' }}
                >
                  <option value="">— ללא —</option>
                  {analysts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} · {a.role}</option>
                  ))}
                </select>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <Button variant="ghost" onClick={() => setShowAssign(false)}>ביטול</Button>
              <Button variant="primary" icon={<Users size={14} />} onClick={handleSaveAssignment}>שמור שיבוץ</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
