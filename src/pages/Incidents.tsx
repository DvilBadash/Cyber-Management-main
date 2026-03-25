import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, AlertTriangle, List, Kanban, CheckSquare, Square, BookOpen, Mail } from 'lucide-react';
import { EmailModal } from '../components/ui/EmailModal';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useIncidentsStore } from '../store/incidentsStore';
import { useAppStore } from '../store/appStore';
import { useListsStore } from '../store/listsStore';
import { usePlaybooksStore } from '../store/playbooksStore';
import type { Severity, IncidentStatus, Incident, IncidentChecklistItem } from '../types';
import { SEVERITY_LABELS, INCIDENT_STATUS_LABELS } from '../types';
import { format } from 'date-fns';

type ViewMode = 'list' | 'kanban';

const KANBAN_COLUMNS: { status: IncidentStatus; label: string; color: string }[] = [
  { status: 'open', label: 'פתוח', color: 'var(--accent-danger)' },
  { status: 'in_progress', label: 'בטיפול', color: 'var(--accent-primary)' },
  { status: 'pending', label: 'ממתין', color: 'var(--accent-warning)' },
  { status: 'closed', label: 'נסגר', color: 'var(--accent-success)' },
];

const SEVERITY_OPTS: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

function IncidentForm({ onSubmit, onClose }: { onSubmit: (data: any) => void; onClose: () => void }) {
  const { incidentCategories, incidentSources } = useListsStore();
  const { playbooks, loadPlaybooks } = usePlaybooksStore();

  const [form, setForm] = useState({
    title: '', description: '', severity: 'medium' as Severity,
    category: '', source: '', affectedAsset: '',
    sourceIp: '', destIp: '', playbookId: '' as string | number,
  });

  useEffect(() => {
    if (playbooks.length === 0) loadPlaybooks();
  }, []);

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>כותרת *</label>
        <input
          value={form.title} onChange={e => set('title', e.target.value)}
          placeholder="תיאור קצר של האירוע"
          style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
        />
      </div>
      <div>
        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>תיאור</label>
        <textarea
          value={form.description} onChange={e => set('description', e.target.value)}
          rows={3}
          placeholder="פירוט האירוע..."
          style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>חומרה</label>
          <select value={form.severity} onChange={e => set('severity', e.target.value)}
            style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px' }}>
            {SEVERITY_OPTS.map(s => <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>קטגוריה</label>
          <select value={form.category} onChange={e => set('category', e.target.value)}
            style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px' }}>
            {incidentCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>מקור גילוי</label>
          <select value={form.source} onChange={e => set('source', e.target.value)}
            style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px' }}>
            {incidentSources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>נכס מושפע</label>
          <input value={form.affectedAsset} onChange={e => set('affectedAsset', e.target.value)}
            placeholder="שם שרת / תחנה"
            style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>IP מקור</label>
          <input value={form.sourceIp} onChange={e => set('sourceIp', e.target.value)}
            placeholder="0.0.0.0"
            style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>IP יעד</label>
          <input value={form.destIp} onChange={e => set('destIp', e.target.value)}
            placeholder="0.0.0.0"
            style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Playbook Selector */}
      {playbooks.filter(p => p.isActive).length > 0 && (
        <div style={{ background: 'var(--bg-hover)', borderRadius: '10px', padding: '14px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BookOpen size={13} /> Playbook לאירוע (אופציונלי)
          </label>
          <select
            value={form.playbookId}
            onChange={e => set('playbookId', e.target.value ? Number(e.target.value) : '')}
            style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px' }}
          >
            <option value="">ללא Playbook</option>
            {playbooks.filter(p => p.isActive).map(pb => (
              <option key={pb.id} value={pb.id}>{pb.name}{pb.category ? ` — ${pb.category}` : ''}</option>
            ))}
          </select>
          {form.playbookId && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--accent-primary)' }}>
              Checklist יווצר אוטומטית מה-Playbook שנבחר
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
        <Button variant="ghost" onClick={onClose}>ביטול</Button>
        <Button variant="primary" onClick={() => form.title && onSubmit(form)} icon={<Plus size={14} />}>
          פתח אירוע
        </Button>
      </div>
    </div>
  );
}

function IncidentRow({ inc, onClick }: { inc: Incident; onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      style={{
        display: 'grid', gridTemplateColumns: '160px 1fr 100px 100px 120px 140px',
        gap: '12px', alignItems: 'center',
        padding: '12px 16px', borderRadius: '10px',
        background: 'var(--bg-hover)', border: '1px solid var(--border)',
        cursor: 'pointer', marginBottom: '6px',
      }}
      className="hover:border-[var(--accent-primary)] transition-colors"
    >
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>
        {inc.incidentNumber}
      </span>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{inc.title}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {inc.category} · {inc.source}
          {inc.playbookId && <span style={{ marginRight: '6px', color: 'var(--accent-primary)' }}> · Playbook</span>}
        </div>
      </div>
      <Badge value={inc.severity} />
      <Badge value={inc.status} />
      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{inc.affectedAsset || '—'}</span>
      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
        {format(new Date(inc.createdAt), 'dd/MM/yy HH:mm')}
      </span>
    </motion.div>
  );
}

function KanbanCard({ inc, onClick }: { inc: Incident; onClick: () => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '12px',
        cursor: 'pointer', marginBottom: '8px',
      }}
    >
      <div style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', marginBottom: '4px' }}>
        {inc.incidentNumber}
      </div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.4 }}>
        {inc.title}
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <Badge value={inc.severity} size="sm" />
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', alignSelf: 'center' }}>{inc.category}</span>
        {inc.playbookId && <span style={{ fontSize: '10px', color: 'var(--accent-primary)', alignSelf: 'center' }}>📋</span>}
      </div>
    </motion.div>
  );
}

// ── Checklist panel inside incident detail ──
function IncidentChecklist({ incidentId, currentUser }: { incidentId: number; currentUser: string }) {
  const { getIncidentChecklist, toggleChecklistItem, addChecklistItem, deleteChecklistItem } = usePlaybooksStore();
  const [items, setItems] = useState<IncidentChecklistItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    const list = await getIncidentChecklist(incidentId);
    setItems(list);
  };

  useEffect(() => { load(); }, [incidentId]);

  const handleToggle = async (item: IncidentChecklistItem) => {
    await toggleChecklistItem(item.id!, !item.isDone, currentUser);
    await load();
  };

  const handleAdd = async () => {
    if (!newItem.trim()) return;
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.order)) : 0;
    await addChecklistItem({ incidentId, item: newItem.trim(), isDone: false, order: maxOrder + 1 });
    setNewItem('');
    setAdding(false);
    await load();
  };

  const handleDelete = async (id: number) => {
    await deleteChecklistItem(id);
    await load();
  };

  const done = items.filter(i => i.isDone).length;
  const total = items.length;

  if (total === 0 && !adding) {
    return (
      <div style={{ background: 'var(--bg-hover)', borderRadius: '10px', padding: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckSquare size={14} /> Checklist
          </div>
          <button onClick={() => setAdding(true)}
            style={{ fontSize: '11px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            + הוסף צעד
          </button>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>אין Checklist לאירוע זה.</div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-hover)', borderRadius: '10px', padding: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckSquare size={14} /> Checklist
          <span style={{ marginRight: '6px', fontFamily: 'JetBrains Mono, monospace', color: done === total ? 'var(--accent-success)' : 'var(--accent-primary)' }}>
            {done}/{total}
          </span>
        </div>
        <button onClick={() => setAdding(true)}
          style={{ fontSize: '11px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          + הוסף צעד
        </button>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', marginBottom: '10px' }}>
          <div style={{ height: '100%', width: `${(done / total) * 100}%`, background: done === total ? 'var(--accent-success)' : 'var(--accent-primary)', borderRadius: '2px', transition: 'width 0.3s ease' }} />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {items.map((item, idx) => (
          <div key={item.id}
            style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 10px', background: item.isDone ? 'rgba(0,196,140,0.06)' : 'var(--bg-card)', borderRadius: '8px', border: `1px solid ${item.isDone ? 'rgba(0,196,140,0.2)' : 'var(--border)'}` }}
          >
            <button onClick={() => handleToggle(item)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0, marginTop: '1px', color: item.isDone ? 'var(--accent-success)' : 'var(--border)' }}>
              {item.isDone ? <CheckSquare size={16} /> : <Square size={16} />}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', color: item.isDone ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: item.isDone ? 'line-through' : 'none', lineHeight: 1.4 }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginLeft: '6px' }}>{String(idx + 1).padStart(2, '0')}.</span>
                {item.item}
              </div>
              {item.isDone && item.doneBy && (
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  בוצע על ידי {item.doneBy} · {item.doneAt ? format(new Date(item.doneAt), 'dd/MM HH:mm') : ''}
                </div>
              )}
            </div>
            <button onClick={() => handleDelete(item.id!)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-danger)', opacity: 0.5, padding: '2px', flexShrink: 0 }}>
              ×
            </button>
          </div>
        ))}
      </div>

      {adding && (
        <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
          <input
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            autoFocus
            placeholder="הוסף צעד לרשימה..."
            style={{ flex: 1, padding: '7px 10px', background: 'var(--bg-card)', border: '1px solid var(--accent-primary)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }}
          />
          <button onClick={handleAdd} style={{ background: 'var(--accent-primary)', border: 'none', borderRadius: '6px', padding: '7px 12px', cursor: 'pointer', color: '#000', fontWeight: 700, fontSize: '12px', fontFamily: 'inherit' }}>הוסף</button>
          <button onClick={() => { setAdding(false); setNewItem(''); }} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', padding: '7px 10px', cursor: 'pointer', color: 'var(--text-secondary)' }}>×</button>
        </div>
      )}
    </div>
  );
}

export function Incidents() {
  const { incidents, addIncident, updateIncident } = useIncidentsStore();
  const { addToast, currentUser } = useAppStore();
  const { playbooks, loadPlaybooks, createChecklistFromPlaybook } = usePlaybooksStore();
  const [view, setView] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [showEmail, setShowEmail] = useState(false);

  useEffect(() => { if (playbooks.length === 0) loadPlaybooks(); }, []);

  const filtered = incidents.filter(inc => {
    if (filterSeverity && inc.severity !== filterSeverity) return false;
    if (filterStatus && inc.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!inc.title.toLowerCase().includes(q) && !inc.incidentNumber.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleCreate = async (data: any) => {
    const playbookId = data.playbookId ? Number(data.playbookId) : undefined;
    const incident = await addIncident({ ...data, playbookId });
    // If playbook selected, create checklist
    if (playbookId && incident?.id) {
      await createChecklistFromPlaybook(incident.id, playbookId);
    }
    setShowNew(false);
    addToast({ type: 'success', message: `אירוע חדש נפתח${playbookId ? ' עם Checklist' : ''}` });
  };

  const handleStatusChange = async (id: number, status: IncidentStatus) => {
    await updateIncident(id, { status });
    addToast({ type: 'info', message: `סטטוס האירוע עודכן ל-${INCIDENT_STATUS_LABELS[status]}` });
    setSelected(prev => prev ? { ...prev, status } : null);
  };

  const getPlaybookName = (id?: number) => {
    if (!id) return null;
    return playbooks.find(p => p.id === id)?.name || null;
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>ניהול אירועים</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
            {filtered.length} אירועים · {incidents.filter(i => i.status !== 'closed').length} פתוחים
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
            {(['list', 'kanban'] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{
                  padding: '8px 12px', border: 'none', cursor: 'pointer',
                  background: view === v ? 'var(--accent-primary)' : 'transparent',
                  color: view === v ? '#000' : 'var(--text-secondary)',
                }}>
                {v === 'list' ? <List size={16} /> : <Kanban size={16} />}
              </button>
            ))}
          </div>
          <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowNew(true)}>
            אירוע חדש
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש אירועים..."
            style={{ width: '100%', padding: '9px 34px 9px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
          />
        </div>
        <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
          style={{ padding: '9px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          <option value="">כל החומרות</option>
          {SEVERITY_OPTS.map(s => <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '9px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          <option value="">כל הסטטוסים</option>
          {Object.entries(INCIDENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* List View */}
      {view === 'list' && (
        <Card noPadding>
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 100px 100px 120px 140px', gap: '12px', padding: '8px 16px', marginBottom: '8px' }}>
              {['מספר', 'כותרת', 'חומרה', 'סטטוס', 'נכס', 'תאריך'].map(h => (
                <span key={h} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</span>
              ))}
            </div>
          </div>
          <div style={{ padding: '0 16px 16px' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <AlertTriangle size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
                לא נמצאו אירועים
              </div>
            ) : filtered.map(inc => (
              <IncidentRow key={inc.id} inc={inc} onClick={() => setSelected(inc)} />
            ))}
          </div>
        </Card>
      )}

      {/* Kanban View */}
      {view === 'kanban' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', alignItems: 'start' }}>
          {KANBAN_COLUMNS.map(col => {
            const colItems = filtered.filter(i => i.status === col.status);
            return (
              <div key={col.status}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '8px 12px', background: 'var(--bg-card)', borderRadius: '10px', border: `1px solid ${col.color}40` }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                  <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{col.label}</span>
                  <span style={{ marginRight: 'auto', background: col.color, color: '#000', borderRadius: '10px', padding: '1px 8px', fontSize: '11px', fontWeight: 700 }}>
                    {colItems.length}
                  </span>
                </div>
                {colItems.map(inc => (
                  <KanbanCard key={inc.id} inc={inc} onClick={() => setSelected(inc)} />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* New Incident Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="פתיחת אירוע חדש" size="lg">
        <IncidentForm onSubmit={handleCreate} onClose={() => setShowNew(false)} />
      </Modal>

      <EmailModal
        open={showEmail}
        onClose={() => setShowEmail(false)}
        onSent={() => addToast({ type: 'success', message: 'מייל נשלח בהצלחה' })}
        initialSubject={selected ? `[INCIDENT] ${selected.incidentNumber} — ${selected.title}` : ''}
        initialBody={selected ? `אירוע: ${selected.incidentNumber}\nכותרת: ${selected.title}\nחומרה: ${selected.severity}\nסטטוס: ${selected.status}\nקטגוריה: ${selected.category}\nמקור: ${selected.source}${selected.affectedAsset ? `\nנכס: ${selected.affectedAsset}` : ''}${selected.sourceIp ? `\nIP מקור: ${selected.sourceIp}` : ''}${selected.description ? `\n\nתיאור:\n${selected.description}` : ''}` : ''}
      />

      {/* Incident Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.incidentNumber || ''} size="lg">
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: 'var(--text-primary)' }}>{selected.title}</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selected.description}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              {[
                { label: 'חומרה', value: <Badge value={selected.severity} size="md" /> },
                { label: 'סטטוס', value: <Badge value={selected.status} size="md" /> },
                { label: 'קטגוריה', value: <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{selected.category}</span> },
                { label: 'מקור', value: <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{selected.source}</span> },
                { label: 'נכס', value: <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--accent-primary)' }}>{selected.affectedAsset || '—'}</span> },
                { label: 'IP מקור', value: <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--accent-primary)' }}>{selected.sourceIp || '—'}</span> },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--bg-hover)', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
                  {value}
                </div>
              ))}
            </div>

            {/* Playbook badge */}
            {selected.playbookId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: '8px', padding: '8px 12px' }}>
                <BookOpen size={14} color="var(--accent-primary)" />
                <span style={{ fontSize: '12px', color: 'var(--accent-primary)' }}>Playbook: {getPlaybookName(selected.playbookId)}</span>
              </div>
            )}

            {/* Checklist */}
            <IncidentChecklist incidentId={selected.id!} currentUser={currentUser?.fullName || 'אנליסט'} />

            {selected.status !== 'closed' && (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>שינוי סטטוס</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {KANBAN_COLUMNS.filter(c => c.status !== selected.status).map(col => (
                    <Button key={col.status} variant="ghost" size="sm" onClick={() => handleStatusChange(selected.id!, col.status)}>
                      {col.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <Button variant="ghost" size="sm" icon={<Mail size={14} />} onClick={() => setShowEmail(true)}>
                שלח מייל על אירוע זה
              </Button>
            </div>
            {selected.rca && (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>ניתוח שורש (RCA)</div>
                <div style={{ background: 'var(--bg-hover)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                  {selected.rca}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
