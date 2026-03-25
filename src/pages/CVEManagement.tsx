import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Plus, Search, Pencil, Save, X } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useSystemsStore } from '../store/systemsStore';
import { useAppStore } from '../store/appStore';
import type { CVE } from '../types';
import { format } from 'date-fns';


function CVSSGauge({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score >= 9 ? '#ff3b5c' : score >= 7 ? '#ffb020' : score >= 4 ? '#8b5cf6' : '#00c48c';
  const label = score >= 9 ? 'קריטי' : score >= 7 ? 'גבוה' : score >= 4 ? 'בינוני' : 'נמוך';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ position: 'relative', width: 44, height: 44 }}>
        <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="22" cy="22" r="18" fill="none" stroke="var(--border)" strokeWidth="4" />
          <circle cx="22" cy="22" r="18" fill="none" stroke={color} strokeWidth="4"
            strokeDasharray={`${(pct / 100) * 113} 113`} strokeLinecap="round" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color }}>
          {score?.toFixed(1)}
        </div>
      </div>
      <span style={{ fontSize: '12px', color, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

export function CVEManagement() {
  const { cves, addCVE, updateCVE } = useSystemsStore();
  const { addToast, currentUser, logActivity } = useAppStore();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<CVE | null>(null);
  const [editingTreatment, setEditingTreatment] = useState(false);
  const [treatmentDraft, setTreatmentDraft] = useState('');
  const [form, setForm] = useState({
    cveId: '', description: '', cvssScore: '', cvssVector: '',
    publishedDate: '', exploitAvailable: false, treatmentMethod: '',
  });

  const filtered = cves.filter(c =>
    !search || c.cveId.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!form.cveId || !form.description) return;
    await addCVE({
      ...form,
      cvssScore: parseFloat(form.cvssScore) || 0,
      discoveredAt: new Date().toISOString(),
    });
    setShowAdd(false);
    addToast({ type: 'success', message: `${form.cveId} נוסף` });
    setForm({ cveId: '', description: '', cvssScore: '', cvssVector: '', publishedDate: '', exploitAvailable: false, treatmentMethod: '' });
  };

  const handleSaveTreatment = async () => {
    if (!selected?.id) return;
    await updateCVE(selected.id, { treatmentMethod: treatmentDraft });
    setSelected(prev => prev ? { ...prev, treatmentMethod: treatmentDraft } : null);
    setEditingTreatment(false);
    addToast({ type: 'success', message: 'דרך הטיפול עודכנה' });
    await logActivity('עדכון דרך טיפול', 'ניהול CVEs', `${selected.cveId} — עודכן על ידי ${currentUser?.fullName}`);
  };

  const openDetail = (cve: CVE) => {
    setSelected(cve);
    setTreatmentDraft(cve.treatmentMethod || '');
    setEditingTreatment(false);
  };

  const critical = cves.filter(c => (c.cvssScore || 0) >= 9).length;
  const high = cves.filter(c => (c.cvssScore || 0) >= 7 && (c.cvssScore || 0) < 9).length;
  const exploitable = cves.filter(c => c.exploitAvailable).length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>ניהול CVEs</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
            מעקב ותעדוף פגיעויות ארגוניות
          </p>
        </div>
        <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowAdd(true)}>
          הוסף CVE
        </Button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'סה"כ CVEs', value: cves.length, color: 'var(--accent-primary)' },
          { label: 'קריטיים (9+)', value: critical, color: 'var(--accent-danger)' },
          { label: 'גבוהים (7-9)', value: high, color: 'var(--accent-warning)' },
          { label: 'ניצול זמין', value: exploitable, color: 'var(--accent-purple)' },
        ].map(s => (
          <Card key={s.label}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="חיפוש לפי מזהה CVE או תיאור..."
          style={{ width: '100%', padding: '10px 34px 10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
        />
      </div>

      {/* CVE List */}
      <Card noPadding>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 140px 180px 80px 80px', gap: '12px' }}>
            {['מזהה', 'תיאור', 'CVSS Score', 'דרך טיפול', 'ניצול', 'גילוי'].map(h => (
              <span key={h} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</span>
            ))}
          </div>
        </div>
        <div style={{ padding: '8px 16px' }}>
          {filtered.map(cve => (
            <motion.div
              key={cve.id}
              whileHover={{ backgroundColor: 'var(--bg-hover)' }}
              onClick={() => openDetail(cve)}
              style={{ display: 'grid', gridTemplateColumns: '160px 1fr 140px 180px 80px 80px', gap: '12px', alignItems: 'center', padding: '12px', borderRadius: '8px', cursor: 'pointer', marginBottom: '4px' }}
            >
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                {cve.cveId}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {cve.description}
              </span>
              <CVSSGauge score={cve.cvssScore || 0} />
              <span style={{ fontSize: '12px', color: cve.treatmentMethod ? 'var(--accent-success)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {cve.treatmentMethod || '—'}
              </span>
              <span style={{ fontSize: '12px', color: cve.exploitAvailable ? 'var(--accent-danger)' : 'var(--accent-success)', fontWeight: 600 }}>
                {cve.exploitAvailable ? '⚠️ כן' : '✓ לא'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {format(new Date(cve.discoveredAt), 'dd/MM/yy')}
              </span>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <ShieldAlert size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
              לא נמצאו CVEs
            </div>
          )}
        </div>
      </Card>

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="הוסף CVE חדש" size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[
            { label: 'מזהה CVE *', key: 'cveId', placeholder: 'CVE-2026-XXXXX' },
            { label: 'CVSS Score', key: 'cvssScore', placeholder: '0.0 - 10.0' },
            { label: 'CVSS Vector', key: 'cvssVector', placeholder: 'CVSS:3.1/AV:N/...' },
            { label: 'תאריך פרסום', key: 'publishedDate', type: 'date' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>{f.label}</label>
              <input
                type={f.type || 'text'}
                value={(form as any)[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: f.key === 'cvssVector' ? 'JetBrains Mono, monospace' : 'inherit', boxSizing: 'border-box' }}
              />
            </div>
          ))}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>תיאור *</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
              style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>דרך טיפול</label>
            <textarea value={form.treatmentMethod} onChange={e => setForm(f => ({ ...f, treatmentMethod: e.target.value }))} rows={3}
              placeholder="תאר את אופן הטיפול בפגיעות זו..."
              style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={form.exploitAvailable} onChange={e => setForm(f => ({ ...f, exploitAvailable: e.target.checked }))} />
            קיים ניצול זמין (exploit)
          </label>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>ביטול</Button>
            <Button variant="primary" onClick={handleAdd}>הוסף CVE</Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.cveId || ''} size="md">
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selected.description}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'var(--bg-hover)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>CVSS Score</div>
                <CVSSGauge score={selected.cvssScore || 0} />
              </div>
              <div style={{ background: 'var(--bg-hover)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>ניצול זמין</div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: selected.exploitAvailable ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                  {selected.exploitAvailable ? '⚠️ כן' : '✓ לא'}
                </span>
              </div>
            </div>
            {selected.cvssVector && (
              <div style={{ background: 'var(--bg-hover)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>CVSS Vector</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--accent-primary)', wordBreak: 'break-all' }}>{selected.cvssVector}</div>
              </div>
            )}

            {/* Treatment Method Section */}
            <div style={{ background: 'var(--bg-hover)', borderRadius: '10px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>דרך טיפול</div>
                {!editingTreatment && (
                  <button onClick={() => { setTreatmentDraft(selected.treatmentMethod || ''); setEditingTreatment(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '11px' }}>
                    <Pencil size={11} /> עדכן
                  </button>
                )}
              </div>
              {editingTreatment ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <textarea
                    value={treatmentDraft}
                    onChange={e => setTreatmentDraft(e.target.value)}
                    rows={4}
                    autoFocus
                    placeholder="תאר את אופן הטיפול בפגיעות זו..."
                    style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-card)', border: '1px solid var(--accent-primary)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button variant="primary" size="sm" icon={<Save size={12} />} onClick={handleSaveTreatment}>שמור</Button>
                    <Button variant="ghost" size="sm" icon={<X size={12} />} onClick={() => setEditingTreatment(false)}>ביטול</Button>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: selected.treatmentMethod ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {selected.treatmentMethod || 'לא הוגדרה דרך טיפול עדיין. לחץ על "עדכן" להוספה.'}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
