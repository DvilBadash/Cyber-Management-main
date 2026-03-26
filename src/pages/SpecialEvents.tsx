import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Plus, Calendar, CheckSquare, Square, Pencil, Check, Mail, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { EmailModal } from '../components/ui/EmailModal';
import { eventsApi, playbooksApi, usersApi } from '../api/client';
import { useAppStore } from '../store/appStore';
import type { SpecialEvent, SpecialEventType, SpecialEventStatus, EventChecklistItem } from '../types';
import type { Playbook } from '../types';
import { SPECIAL_EVENT_TYPE_LABELS } from '../types';
import { format } from 'date-fns';

const STATUS_COLORS: Record<SpecialEventStatus, string> = {
  planned: 'var(--accent-primary)',
  active: 'var(--accent-success)',
  completed: 'var(--text-muted)',
  cancelled: 'var(--accent-danger)',
};

const STATUS_LABELS: Record<SpecialEventStatus, string> = {
  planned: 'מתוכנן', active: 'פעיל', completed: 'הושלם', cancelled: 'בוטל',
};

const INPUT_STYLE = {
  width: '100%', padding: '9px 12px', background: 'var(--bg-hover)',
  border: '1px solid var(--border)', borderRadius: '8px',
  color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' as const,
};

export function SpecialEvents() {
  const { currentUser } = useAppStore();
  const [events, setEvents] = useState<SpecialEvent[]>([]);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [systemUsers, setSystemUsers] = useState<{ id: number; fullName: string; email: string }[]>([]);

  // ── Add modal ──────────────────────────────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'operation' as SpecialEventType, description: '',
    objectives: '', startDate: '', endDate: '', status: 'planned' as SpecialEventStatus,
    playbookId: '',
  });
  // Editable checklist items in create mode
  const [pbPreview, setPbPreview] = useState<Array<{ item: string; phase?: string }>>([]);
  const [newItemText, setNewItemText] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  // ── Detail / edit modal ────────────────────────────────────────────────────
  const [selected, setSelected] = useState<SpecialEvent | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState({
    name: '', type: 'operation' as SpecialEventType, description: '',
    objectives: '', startDate: '', endDate: '', status: 'planned' as SpecialEventStatus,
    findings: '', lessonsLearned: '',
  });
  const [checklist, setChecklist] = useState<EventChecklistItem[]>([]);

  // ── Email modal ────────────────────────────────────────────────────────────
  const [showEmail, setShowEmail] = useState(false);

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    eventsApi.getAll().then(setEvents);
    playbooksApi.getAll().then(setPlaybooks);
    usersApi.getAll().then(users =>
      setSystemUsers(users.filter(u => u.isActive && u.email?.trim()).map(u => ({ id: u.id!, fullName: u.fullName, email: u.email })))
    );
  }, []);

  // When playbook selected in add form → load items preview (editable)
  useEffect(() => {
    if (form.playbookId) {
      playbooksApi.getItems(parseInt(form.playbookId)).then(items =>
        setPbPreview(items.map(i => ({ item: i.item, phase: i.phase })))
      );
    } else {
      setPbPreview([]);
    }
    setNewItemText('');
    setEditingIdx(null);
  }, [form.playbookId]);

  // When a detail modal opens → load its checklist
  useEffect(() => {
    if (selected?.id) {
      eventsApi.getChecklist(selected.id).then(setChecklist);
      setEditDraft({
        name: selected.name,
        type: selected.type,
        description: selected.description || '',
        objectives: selected.objectives || '',
        startDate: selected.startDate,
        endDate: selected.endDate || '',
        status: selected.status,
        findings: selected.findings || '',
        lessonsLearned: selected.lessonsLearned || '',
      });
      setEditMode(false);
    }
  }, [selected?.id]);

  // ── Add event ──────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!form.name || !form.startDate) return;
    const now = new Date().toISOString();
    const { playbookId, ...eventData } = form;
    const created = await eventsApi.create({ ...eventData, createdBy: currentUser?.id || 1, createdAt: now });
    if (pbPreview.length > 0) {
      for (let i = 0; i < pbPreview.length; i++) {
        await eventsApi.addChecklistItem(created.id!, {
          eventId: created.id!, item: pbPreview[i].item, isDone: false, order: i + 1,
        });
      }
    }
    setEvents(prev => [created, ...prev]);
    setShowAdd(false);
    setForm({ name: '', type: 'operation', description: '', objectives: '', startDate: '', endDate: '', status: 'planned', playbookId: '' });
    setPbPreview([]);
  };

  // ── Checklist preview editing (create modal) ───────────────────────────────
  const handleAddPreviewItem = () => {
    const t = newItemText.trim();
    if (!t) return;
    setPbPreview(prev => [...prev, { item: t }]);
    setNewItemText('');
  };

  const handleRemovePreviewItem = (idx: number) => {
    setPbPreview(prev => prev.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
  };

  const handleSavePreviewItem = (idx: number) => {
    const t = editingText.trim();
    if (!t) return;
    setPbPreview(prev => prev.map((item, i) => i === idx ? { ...item, item: t } : item));
    setEditingIdx(null);
  };

  // ── Checklist toggle (detail modal) ────────────────────────────────────────
  const handleToggle = async (item: EventChecklistItem) => {
    const isDone = !item.isDone;
    const now = new Date().toISOString();
    await eventsApi.updateChecklistItem(item.id!, {
      isDone, doneBy: isDone ? (currentUser?.fullName || 'מנהל') : undefined,
      doneAt: isDone ? now : undefined,
    });
    setChecklist(prev => prev.map(c => c.id === item.id
      ? { ...c, isDone, doneBy: isDone ? (currentUser?.fullName || 'מנהל') : undefined, doneAt: isDone ? now : undefined }
      : c));
  };

  // ── Save edit ──────────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!selected?.id) return;
    await eventsApi.update(selected.id, editDraft);
    setEvents(prev => prev.map(e => e.id === selected.id ? { ...e, ...editDraft } : e));
    setSelected(prev => prev ? { ...prev, ...editDraft } : null);
    setEditMode(false);
  };

  // ── Status change ──────────────────────────────────────────────────────────
  const handleStatusChange = async (id: number, status: SpecialEventStatus) => {
    await eventsApi.update(id, { status });
    setEvents(prev => prev.map(e => e.id === id ? { ...e, status } : e));
    setSelected(prev => prev?.id === id ? { ...prev, status } : prev);
  };

  const active = events.filter(e => e.status === 'active').length;
  const planned = events.filter(e => e.status === 'planned').length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>אירועים מיוחדים</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
            {active} פעילים · {planned} מתוכננים
          </p>
        </div>
        <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowAdd(true)}>
          אירוע חדש
        </Button>
      </div>

      {/* Cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {events.map(event => (
          <motion.div key={event.id} whileHover={{ scale: 1.02 }} onClick={() => setSelected(event)}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px',
              padding: '20px', cursor: 'pointer', borderTop: `3px solid ${STATUS_COLORS[event.status]}`,
            }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{event.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--accent-primary)' }}>{SPECIAL_EVENT_TYPE_LABELS[event.type]}</div>
              </div>
              <span style={{
                background: `${STATUS_COLORS[event.status]}20`, color: STATUS_COLORS[event.status],
                border: `1px solid ${STATUS_COLORS[event.status]}40`,
                borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 700,
              }}>
                {STATUS_LABELS[event.status]}
              </span>
            </div>
            {event.description && (
              <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {event.description}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <Calendar size={11} />
              {format(new Date(event.startDate), 'dd/MM/yyyy')}
              {event.endDate && ` - ${format(new Date(event.endDate), 'dd/MM/yyyy')}`}
            </div>
          </motion.div>
        ))}
        {events.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <Star size={40} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.3 }} />
            אין אירועים מיוחדים
          </div>
        )}
      </div>

      {/* ── Add Modal ─────────────────────────────────────────────────────────── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="אירוע מיוחד חדש" size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>שם האירוע *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="שם האירוע המיוחד" style={INPUT_STYLE} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>סוג אירוע</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as SpecialEventType }))} style={INPUT_STYLE}>
                {Object.entries(SPECIAL_EVENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>סטטוס</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as SpecialEventStatus }))} style={INPUT_STYLE}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>תאריך התחלה *</label>
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} style={INPUT_STYLE} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>תאריך סיום</label>
              <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} style={INPUT_STYLE} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>תיאור ומטרות</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
              style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          {/* Playbook selector */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>פלייבוק (אופציונלי)</label>
            <select value={form.playbookId} onChange={e => setForm(f => ({ ...f, playbookId: e.target.value }))} style={INPUT_STYLE}>
              <option value="">— ללא פלייבוק —</option>
              {playbooks.map(pb => <option key={pb.id} value={pb.id}>{pb.name}</option>)}
            </select>
          </div>

          {/* Editable checklist preview */}
          {(pbPreview.length > 0 || form.playbookId) && (
            <div style={{ background: 'var(--bg-hover)', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
                Checklist ({pbPreview.length} פריטים) — ניתן לערוך לפני שמירה:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '200px', overflowY: 'auto', marginBottom: '8px' }}>
                {pbPreview.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {editingIdx === i ? (
                      <>
                        <input
                          value={editingText}
                          onChange={e => setEditingText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSavePreviewItem(i); if (e.key === 'Escape') setEditingIdx(null); }}
                          autoFocus
                          style={{ ...INPUT_STYLE, flex: 1, padding: '5px 8px', fontSize: '12px' }}
                        />
                        <button onClick={() => handleSavePreviewItem(i)}
                          style={{ background: 'var(--accent-success)', border: 'none', borderRadius: '4px', color: 'white', padding: '4px 8px', cursor: 'pointer', fontSize: '11px' }}>
                          ✓
                        </button>
                        <button onClick={() => setEditingIdx(null)}
                          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-muted)', padding: '4px 8px', cursor: 'pointer', fontSize: '11px' }}>
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <Square size={13} style={{ flexShrink: 0, opacity: 0.4 }} />
                        <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-secondary)' }}>{item.item}</span>
                        {item.phase && item.phase !== 'כללי' && (
                          <span style={{ fontSize: '10px', color: 'var(--accent-primary)', background: 'rgba(0,212,255,0.1)', padding: '1px 6px', borderRadius: '4px', flexShrink: 0 }}>
                            {item.phase}
                          </span>
                        )}
                        <button onClick={() => { setEditingIdx(i); setEditingText(item.item); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 4px', borderRadius: '4px' }}>
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => handleRemovePreviewItem(i)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-danger)', padding: '2px 4px', borderRadius: '4px' }}>
                          <Trash2 size={11} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              {/* Add new item inline */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  value={newItemText}
                  onChange={e => setNewItemText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddPreviewItem(); }}
                  placeholder="הוסף פריט checklist..."
                  style={{ ...INPUT_STYLE, flex: 1, padding: '6px 10px', fontSize: '12px' }}
                />
                <button onClick={handleAddPreviewItem}
                  style={{ background: 'var(--accent-primary)', border: 'none', borderRadius: '6px', color: 'white', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}>
                  + הוסף
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>ביטול</Button>
            <Button variant="primary" onClick={handleAdd}>צור אירוע</Button>
          </div>
        </div>
      </Modal>

      {/* ── Detail / Edit Modal ────────────────────────────────────────────────── */}
      <Modal open={!!selected && !showEmail} onClose={() => setSelected(null)} title={editMode ? 'עריכת אירוע' : (selected?.name || '')} size="md">
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Status badges */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ background: `${STATUS_COLORS[selected.status]}20`, color: STATUS_COLORS[selected.status], border: `1px solid ${STATUS_COLORS[selected.status]}40`, borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 700 }}>
                {STATUS_LABELS[selected.status]}
              </span>
              <span style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--accent-primary)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                {SPECIAL_EVENT_TYPE_LABELS[selected.type]}
              </span>
            </div>

            {/* Editable fields */}
            {editMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>שם האירוע *</label>
                  <input value={editDraft.name} onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))} style={INPUT_STYLE} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>סוג אירוע</label>
                    <select value={editDraft.type} onChange={e => setEditDraft(d => ({ ...d, type: e.target.value as SpecialEventType }))} style={INPUT_STYLE}>
                      {Object.entries(SPECIAL_EVENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>סטטוס</label>
                    <select value={editDraft.status} onChange={e => setEditDraft(d => ({ ...d, status: e.target.value as SpecialEventStatus }))} style={INPUT_STYLE}>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>תאריך התחלה *</label>
                    <input type="date" value={editDraft.startDate} onChange={e => setEditDraft(d => ({ ...d, startDate: e.target.value }))} style={INPUT_STYLE} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>תאריך סיום</label>
                    <input type="date" value={editDraft.endDate} onChange={e => setEditDraft(d => ({ ...d, endDate: e.target.value }))} style={INPUT_STYLE} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>תיאור</label>
                  <textarea value={editDraft.description} onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))} rows={2}
                    style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>מטרות</label>
                  <textarea value={editDraft.objectives} onChange={e => setEditDraft(d => ({ ...d, objectives: e.target.value }))} rows={2}
                    style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>ממצאים</label>
                  <textarea value={editDraft.findings} onChange={e => setEditDraft(d => ({ ...d, findings: e.target.value }))} rows={2}
                    style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>לקחים</label>
                  <textarea value={editDraft.lessonsLearned} onChange={e => setEditDraft(d => ({ ...d, lessonsLearned: e.target.value }))} rows={2}
                    style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selected.description && <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6 }}>{selected.description}</p>}
                {selected.objectives && <div style={{ fontSize: '12px' }}><span style={{ color: 'var(--text-muted)' }}>מטרות: </span><span style={{ color: 'var(--text-secondary)' }}>{selected.objectives}</span></div>}
                {selected.findings && <div style={{ fontSize: '12px' }}><span style={{ color: 'var(--text-muted)' }}>ממצאים: </span><span style={{ color: 'var(--text-secondary)' }}>{selected.findings}</span></div>}
                {selected.lessonsLearned && <div style={{ fontSize: '12px' }}><span style={{ color: 'var(--text-muted)' }}>לקחים: </span><span style={{ color: 'var(--text-secondary)' }}>{selected.lessonsLearned}</span></div>}
              </div>
            )}

            {/* Checklist */}
            {checklist.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
                  Checklist ({checklist.filter(c => c.isDone).length}/{checklist.length} הושלמו)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                  {checklist.map(item => (
                    <div key={item.id}
                      onClick={() => handleToggle(item)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px',
                        background: item.isDone ? 'rgba(0,196,140,0.08)' : 'var(--bg-hover)',
                        borderRadius: '8px', cursor: 'pointer',
                        border: `1px solid ${item.isDone ? 'rgba(0,196,140,0.25)' : 'var(--border)'}`,
                        transition: 'all 0.15s',
                      }}>
                      {item.isDone
                        ? <CheckSquare size={16} color="var(--accent-success)" style={{ flexShrink: 0 }} />
                        : <Square size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
                      <span style={{ fontSize: '13px', color: item.isDone ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: item.isDone ? 'line-through' : 'none', flex: 1 }}>
                        {item.item}
                      </span>
                      {item.isDone && item.doneBy && (
                        <span style={{ fontSize: '10px', color: 'var(--accent-success)' }}>{item.doneBy}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {Object.entries(STATUS_LABELS).filter(([k]) => k !== selected.status).map(([k, v]) => (
                  <Button key={k} variant="ghost" size="sm" onClick={() => handleStatusChange(selected.id!, k as SpecialEventStatus)}>
                    עבור ל: {v}
                  </Button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="ghost" size="sm" icon={<Mail size={13} />} onClick={() => setShowEmail(true)}>
                  שלח מייל
                </Button>
                {editMode ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>ביטול</Button>
                    <Button variant="primary" size="sm" icon={<Check size={13} />} onClick={handleSaveEdit}>שמור</Button>
                  </>
                ) : (
                  <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => setEditMode(true)}>עריכה</Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Email Modal (higher z-index to appear above detail modal) ─────────── */}
      <EmailModal
        open={showEmail}
        onClose={() => setShowEmail(false)}
        initialSubject={selected ? `[אירוע] ${selected.name}` : ''}
        initialBody={selected ? `פרטי אירוע: ${selected.name}\nסטטוס: ${STATUS_LABELS[selected.status]}\nתאריך: ${format(new Date(selected.startDate), 'dd/MM/yyyy')}\n\n${selected.description || ''}` : ''}
        systemUsers={systemUsers}
        zIndex={1100}
      />
    </div>
  );
}
