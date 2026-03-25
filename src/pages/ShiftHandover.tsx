import { useState, useEffect } from 'react';
import { Plus, ArrowLeftRight, CheckSquare, Clock } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { handoverApi, analystsApi } from '../api/client';
import type { ShiftHandover as ShiftHandoverType, HandoverItem, Analyst } from '../types';
import { format } from 'date-fns';

export function ShiftHandover() {
  const [handovers, setHandovers] = useState<ShiftHandoverType[]>([]);
  const [analysts, setAnalysts] = useState<Analyst[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<ShiftHandoverType | null>(null);
  const [selectedItems, setSelectedItems] = useState<HandoverItem[]>([]);
  const [form, setForm] = useState({
    outgoing: '', incoming: '', notes: '',
    items: [{ type: 'note' as const, description: '', status: 'open' as const }],
  });

  useEffect(() => {
    handoverApi.getAll().then(setHandovers);
    analystsApi.getAll().then(setAnalysts);
  }, []);

  const handleCreate = async () => {
    if (!form.outgoing || !form.incoming) return;
    const now = new Date().toISOString();
    const handover: ShiftHandoverType = {
      outgoingAnalyst: form.outgoing,
      incomingAnalyst: form.incoming,
      notes: form.notes,
      createdAt: now,
      signedAt: now,
    };
    const created = await handoverApi.create(handover);
    for (const item of form.items.filter(i => i.description)) {
      await handoverApi.addItem(created.id!, { ...item, handoverId: created.id! });
    }
    setHandovers(prev => [created, ...prev]);
    setShowNew(false);
    setForm({ outgoing: '', incoming: '', notes: '', items: [{ type: 'note', description: '', status: 'open' }] });
  };

  const openHandover = async (h: ShiftHandoverType) => {
    setSelected(h);
    const items = await handoverApi.getItems(h.id!);
    setSelectedItems(items);
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { type: 'note', description: '', status: 'open' }] }));

  const updateItem = (i: number, k: string, v: string) =>
    setForm(f => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [k]: v } : item) }));

  const TYPE_LABELS = { incident: 'אירוע', action: 'פעולה', infrastructure: 'תשתית', note: 'הערה' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>העברת משמרת</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
            תיעוד מסירה והעברת אחריות בין משמרות
          </p>
        </div>
        <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowNew(true)}>
          העברה חדשה
        </Button>
      </div>

      {/* Handover List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {handovers.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <ArrowLeftRight size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
              אין העברות משמרת מתועדות
            </div>
          </Card>
        ) : handovers.map(h => (
          <Card key={h.id} hoverable style={{ cursor: 'pointer' }}>
            <div onClick={() => openHandover(h)} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowLeftRight size={20} color="var(--accent-primary)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {h.outgoingAnalyst} → {h.incomingAnalyst}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={11} />
                    {format(new Date(h.createdAt), 'dd/MM/yyyy HH:mm')}
                  </span>
                  {h.notes && <span>· {h.notes.slice(0, 50)}{h.notes.length > 50 ? '...' : ''}</span>}
                </div>
              </div>
              <Badge value={h.receivedAt ? 'closed' : 'open'} label={h.receivedAt ? 'אושר' : 'ממתין'} />
            </div>
          </Card>
        ))}
      </div>

      {/* New Handover Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="פתיחת העברת משמרת" size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>יוצא *</label>
              <select value={form.outgoing} onChange={e => setForm(f => ({ ...f, outgoing: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px' }}>
                <option value="">בחר אנליסט יוצא</option>
                {analysts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>נכנס *</label>
              <select value={form.incoming} onChange={e => setForm(f => ({ ...f, incoming: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px' }}>
                <option value="">בחר אנליסט נכנס</option>
                {analysts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>הערות כלליות</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              placeholder="סיכום המשמרת..."
              style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>פריטי העברה</label>
              <Button variant="ghost" size="sm" icon={<Plus size={12} />} onClick={addItem}>הוסף</Button>
            </div>
            {form.items.map((item, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px', gap: '8px', marginBottom: '8px' }}>
                <select value={item.type} onChange={e => updateItem(i, 'type', e.target.value)}
                  style={{ padding: '8px 10px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px' }}>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)}
                  placeholder="תיאור הפריט"
                  style={{ padding: '8px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px', boxSizing: 'border-box' }}
                />
                <select value={item.status} onChange={e => updateItem(i, 'status', e.target.value)}
                  style={{ padding: '8px 10px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px' }}>
                  <option value="open">פתוח</option>
                  <option value="acknowledged">התקבל</option>
                  <option value="resolved">טופל</option>
                </select>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowNew(false)}>ביטול</Button>
            <Button variant="primary" onClick={handleCreate}>שמור העברה</Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="פרטי העברת משמרת" size="lg">
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'var(--bg-hover)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>יוצא</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{selected.outgoingAnalyst}</div>
              </div>
              <div style={{ background: 'var(--bg-hover)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>נכנס</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{selected.incomingAnalyst}</div>
              </div>
            </div>
            {selected.notes && (
              <div style={{ background: 'var(--bg-hover)', borderRadius: '10px', padding: '14px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {selected.notes}
              </div>
            )}
            {selectedItems.length > 0 && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>פריטי העברה</div>
                {selectedItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'var(--bg-hover)', borderRadius: '8px', marginBottom: '6px' }}>
                    <CheckSquare size={14} color="var(--accent-primary)" />
                    <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-primary)' }}>{item.description}</span>
                    <Badge value={item.status} label={item.status === 'open' ? 'פתוח' : item.status === 'acknowledged' ? 'התקבל' : 'טופל'} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
