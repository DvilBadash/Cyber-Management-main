import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, Pencil, Trash2, ChevronDown, ChevronUp, GripVertical, X, Check } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { usePlaybooksStore } from '../store/playbooksStore';
import { useAppStore } from '../store/appStore';
import type { Playbook, PlaybookItem } from '../types';

const PHASES = ['זיהוי', 'הכלה', 'חקירה', 'תיקון', 'סיום', 'כללי'];

export function Playbooks() {
  const { playbooks, loadPlaybooks, addPlaybook, updatePlaybook, deletePlaybook,
    getPlaybookItems, addPlaybookItem, updatePlaybookItem, deletePlaybookItem } = usePlaybooksStore();
  const { addToast } = useAppStore();

  const [expanded, setExpanded] = useState<number | null>(null);
  const [itemsByPlaybook, setItemsByPlaybook] = useState<Record<number, PlaybookItem[]>>({});
  const [showAddPlaybook, setShowAddPlaybook] = useState(false);
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null);
  const [playbookForm, setPlaybookForm] = useState({ name: '', category: '', description: '' });

  // item editing state
  const [addingItemTo, setAddingItemTo] = useState<number | null>(null);
  const [newItemForm, setNewItemForm] = useState({ item: '', phase: 'כללי' });
  const [editingItem, setEditingItem] = useState<PlaybookItem | null>(null);
  const [editItemDraft, setEditItemDraft] = useState({ item: '', phase: '' });

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  useEffect(() => { loadPlaybooks(); }, []);

  const loadItems = useCallback(async (playbookId: number) => {
    const items = await getPlaybookItems(playbookId);
    setItemsByPlaybook(prev => ({ ...prev, [playbookId]: items }));
  }, [getPlaybookItems]);

  const toggleExpand = async (id: number) => {
    if (expanded === id) {
      setExpanded(null);
    } else {
      setExpanded(id);
      if (!itemsByPlaybook[id]) {
        await loadItems(id);
      }
    }
  };

  const handleAddPlaybook = async () => {
    if (!playbookForm.name) return;
    const now = new Date().toISOString();
    await addPlaybook({ ...playbookForm, isActive: true, createdAt: now, updatedAt: now });
    setShowAddPlaybook(false);
    setPlaybookForm({ name: '', category: '', description: '' });
    addToast({ type: 'success', message: 'Playbook חדש נוסף' });
  };

  const handleUpdatePlaybook = async () => {
    if (!editingPlaybook?.id) return;
    await updatePlaybook(editingPlaybook.id, { ...playbookForm, updatedAt: new Date().toISOString() });
    setEditingPlaybook(null);
    addToast({ type: 'success', message: 'Playbook עודכן' });
  };

  const openEditPlaybook = (pb: Playbook) => {
    setEditingPlaybook(pb);
    setPlaybookForm({ name: pb.name, category: pb.category || '', description: pb.description || '' });
  };

  const handleDeletePlaybook = async (id: number) => {
    await deletePlaybook(id);
    setConfirmDelete(null);
    setExpanded(null);
    addToast({ type: 'success', message: 'Playbook נמחק' });
  };

  const handleAddItem = async (playbookId: number) => {
    if (!newItemForm.item.trim()) return;
    const items = itemsByPlaybook[playbookId] || [];
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.order)) : 0;
    await addPlaybookItem({ playbookId, item: newItemForm.item.trim(), phase: newItemForm.phase, order: maxOrder + 1 });
    setNewItemForm({ item: '', phase: 'כללי' });
    setAddingItemTo(null);
    await loadItems(playbookId);
    addToast({ type: 'success', message: 'פעולה נוספה' });
  };

  const handleUpdateItem = async (playbookId: number) => {
    if (!editingItem?.id) return;
    await updatePlaybookItem(editingItem.id, { item: editItemDraft.item, phase: editItemDraft.phase });
    setEditingItem(null);
    await loadItems(playbookId);
  };

  const handleDeleteItem = async (playbookId: number, itemId: number) => {
    await deletePlaybookItem(itemId);
    await loadItems(playbookId);
    addToast({ type: 'info', message: 'פעולה נמחקה' });
  };

  const phaseColor: Record<string, string> = {
    'זיהוי': 'var(--accent-primary)',
    'הכלה': 'var(--accent-warning)',
    'חקירה': 'var(--accent-purple)',
    'תיקון': 'var(--accent-success)',
    'סיום': 'var(--text-muted)',
    'כללי': 'var(--text-secondary)',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Playbooks</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
            נהלי תגובה לאירועים — {playbooks.filter(p => p.isActive).length} פעילים
          </p>
        </div>
        <Button variant="primary" icon={<Plus size={14} />} onClick={() => { setShowAddPlaybook(true); setPlaybookForm({ name: '', category: '', description: '' }); }}>
          Playbook חדש
        </Button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <Card>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'JetBrains Mono, monospace' }}>{playbooks.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>סה"כ Playbooks</div>
        </Card>
        <Card>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-success)', fontFamily: 'JetBrains Mono, monospace' }}>{playbooks.filter(p => p.isActive).length}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>פעילים</div>
        </Card>
        <Card>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            {Object.values(itemsByPlaybook).reduce((sum, items) => sum + items.length, 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>סה"כ צעדים טעונים</div>
        </Card>
      </div>

      {/* Playbook List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {playbooks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <BookOpen size={40} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.3 }} />
            <div style={{ fontSize: '14px' }}>אין Playbooks. צור Playbook חדש.</div>
          </div>
        )}
        {playbooks.map(pb => {
          const items = itemsByPlaybook[pb.id!] || [];
          const isOpen = expanded === pb.id;

          return (
            <motion.div
              key={pb.id}
              layout
              style={{ background: 'var(--bg-card)', border: `1px solid ${isOpen ? 'var(--accent-primary)' : 'var(--border)'}`, borderRadius: '14px', overflow: 'hidden' }}
            >
              {/* Header row */}
              <div
                onClick={() => toggleExpand(pb.id!)}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', cursor: 'pointer' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BookOpen size={18} color="var(--accent-primary)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{pb.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {pb.category && <span style={{ marginLeft: '10px', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: '4px' }}>{pb.category}</span>}
                    {pb.description && <span>{pb.description}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {isOpen ? (items.length > 0 ? `${items.length} צעדים` : 'טוען...') : ''}
                  </span>
                  <button onClick={() => openEditPlaybook(pb)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', borderRadius: '6px' }}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setConfirmDelete(pb.id!)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-danger)', padding: '4px', borderRadius: '6px' }}>
                    <Trash2 size={14} />
                  </button>
                  {isOpen ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                </div>
              </div>

              {/* Expanded content */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ padding: '0 18px 16px', borderTop: '1px solid var(--border)' }}>
                      {/* Items */}
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {items.map((item, idx) => (
                          <div key={item.id}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--bg-hover)', borderRadius: '8px' }}
                          >
                            <GripVertical size={14} color="var(--text-muted)" style={{ flexShrink: 0, cursor: 'grab', opacity: 0.4 }} />
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', width: '20px', flexShrink: 0 }}>
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            {editingItem?.id === item.id ? (
                              <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input value={editItemDraft.item} onChange={e => setEditItemDraft(d => ({ ...d, item: e.target.value }))}
                                  style={{ flex: 1, padding: '5px 8px', background: 'var(--bg-card)', border: '1px solid var(--accent-primary)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }}
                                />
                                <select value={editItemDraft.phase} onChange={e => setEditItemDraft(d => ({ ...d, phase: e.target.value }))}
                                  style={{ padding: '5px 8px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                                  {PHASES.map(ph => <option key={ph} value={ph}>{ph}</option>)}
                                </select>
                                <button onClick={() => handleUpdateItem(pb.id!)} style={{ background: 'var(--accent-success)', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: '#000' }}><Check size={12} /></button>
                                <button onClick={() => setEditingItem(null)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={12} /></button>
                              </div>
                            ) : (
                              <>
                                <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-primary)' }}>{item.item}</span>
                                {item.phase && (
                                  <span style={{ fontSize: '10px', fontWeight: 700, color: phaseColor[item.phase] || 'var(--text-muted)', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '4px', flexShrink: 0 }}>
                                    {item.phase}
                                  </span>
                                )}
                                <button onClick={() => { setEditingItem(item); setEditItemDraft({ item: item.item, phase: item.phase || 'כללי' }); }}
                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px', opacity: 0.6 }}>
                                  <Pencil size={12} />
                                </button>
                                <button onClick={() => handleDeleteItem(pb.id!, item.id!)}
                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-danger)', padding: '2px', opacity: 0.6 }}>
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Add item */}
                      {addingItemTo === pb.id ? (
                        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-hover)', borderRadius: '8px', padding: '10px 12px' }}>
                          <input
                            value={newItemForm.item}
                            onChange={e => setNewItemForm(f => ({ ...f, item: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && handleAddItem(pb.id!)}
                            autoFocus
                            placeholder="תאר את הצעד..."
                            style={{ flex: 1, padding: '7px 10px', background: 'var(--bg-card)', border: '1px solid var(--accent-primary)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }}
                          />
                          <select value={newItemForm.phase} onChange={e => setNewItemForm(f => ({ ...f, phase: e.target.value }))}
                            style={{ padding: '7px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                            {PHASES.map(ph => <option key={ph} value={ph}>{ph}</option>)}
                          </select>
                          <button onClick={() => handleAddItem(pb.id!)} style={{ background: 'var(--accent-primary)', border: 'none', borderRadius: '6px', padding: '7px 12px', cursor: 'pointer', color: '#000', fontWeight: 700, fontSize: '12px', fontFamily: 'inherit' }}>
                            הוסף
                          </button>
                          <button onClick={() => setAddingItemTo(null)} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', padding: '7px 10px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setAddingItemTo(pb.id!); setNewItemForm({ item: '', phase: 'כללי' }); }}
                          style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px dashed var(--border)', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px', width: '100%', fontFamily: 'inherit' }}>
                          <Plus size={12} /> הוסף צעד
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Add/Edit Playbook Modal */}
      <Modal
        open={showAddPlaybook || !!editingPlaybook}
        onClose={() => { setShowAddPlaybook(false); setEditingPlaybook(null); }}
        title={editingPlaybook ? 'עריכת Playbook' : 'Playbook חדש'}
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>שם Playbook *</label>
            <input value={playbookForm.name} onChange={e => setPlaybookForm(f => ({ ...f, name: e.target.value }))}
              placeholder="לדוגמה: Phishing Response"
              style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>קטגוריה</label>
            <input value={playbookForm.category} onChange={e => setPlaybookForm(f => ({ ...f, category: e.target.value }))}
              placeholder="Phishing, Malware, Ransomware..."
              style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>תיאור</label>
            <textarea value={playbookForm.description} onChange={e => setPlaybookForm(f => ({ ...f, description: e.target.value }))} rows={2}
              style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => { setShowAddPlaybook(false); setEditingPlaybook(null); }}>ביטול</Button>
            <Button variant="primary" onClick={editingPlaybook ? handleUpdatePlaybook : handleAddPlaybook}>
              {editingPlaybook ? 'שמור' : 'צור Playbook'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="מחיקת Playbook" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
            האם למחוק את ה-Playbook? פעולה זו תמחק גם את כל הצעדים שהוגדרו.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>ביטול</Button>
            <Button variant="danger" onClick={() => confirmDelete && handleDeletePlaybook(confirmDelete)}>מחק</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
