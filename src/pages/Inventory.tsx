import { useState, useEffect } from 'react';
import { HardDrive, Plus, RotateCcw, Package, Pencil, Trash2, ArrowDownToLine } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { inventoryApi } from '../api/client';
import { useListsStore } from '../store/listsStore';
import type { InventoryItem, InventoryCondition, Loan, LoanStatus } from '../types';
import { INVENTORY_CONDITION_LABELS, LOAN_STATUS_LABELS } from '../types';
import { format } from 'date-fns';

// ─── colour helpers ────────────────────────────────────────────────────────
const CONDITION_COLORS: Record<InventoryCondition, string> = {
  good:    'var(--accent-success)',
  fair:    'var(--accent-warning)',
  damaged: 'var(--accent-danger)',
  retired: 'var(--text-muted)',
};

const LOAN_STATUS_COLORS: Record<LoanStatus, string> = {
  active:   'var(--accent-primary)',
  returned: 'var(--accent-success)',
  overdue:  'var(--accent-danger)',
};

const INPUT_STYLE = {
  width: '100%', padding: '9px 12px', background: 'var(--bg-hover)',
  border: '1px solid var(--border)', borderRadius: '8px',
  color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' as const,
};

const LABEL_STYLE = {
  fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block',
};

// ─── blank forms ───────────────────────────────────────────────────────────
const BLANK_ITEM = {
  name: '', type: 'כונן נייד', serialNumber: '', capacity: '',
  manufacturer: '', model: '', condition: 'good' as InventoryCondition,
  location: '', notes: '',
};

const BLANK_LOAN = {
  inventoryItemId: 0,
  borrowerName: '', borrowerId: '', purpose: '',
  loanedAt: new Date().toISOString().slice(0, 10),
  expectedReturn: '', approvedBy: '', notes: '',
};

// ══════════════════════════════════════════════════════════════════════════════
export function Inventory() {
  const { equipmentTypes } = useListsStore();
  const [tab, setTab] = useState<'inventory' | 'loans'>('inventory');

  // inventory state
  const [items, setItems]           = useState<InventoryItem[]>([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editItem, setEditItem]     = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm]     = useState({ ...BLANK_ITEM });

  // loans state
  const [loans, setLoans]           = useState<Loan[]>([]);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [editLoan, setEditLoan]     = useState<Loan | null>(null);
  const [loanForm, setLoanForm]     = useState({ ...BLANK_LOAN });

  // filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [loanFilter, setLoanFilter] = useState<'all' | 'active' | 'overdue' | 'returned'>('all');

  useEffect(() => {
    inventoryApi.getAll().then(setItems);
    inventoryApi.getLoans().then(setLoans);
  }, []);

  // ── inventory CRUD ────────────────────────────────────────────────────────
  const openAddItem = () => { setEditItem(null); setItemForm({ ...BLANK_ITEM }); setShowItemForm(true); };
  const openEditItem = (item: InventoryItem) => {
    setEditItem(item);
    setItemForm({
      name: item.name, type: item.type, serialNumber: item.serialNumber || '',
      capacity: item.capacity || '', manufacturer: item.manufacturer || '',
      model: item.model || '', condition: item.condition,
      location: item.location || '', notes: item.notes || '',
    });
    setShowItemForm(true);
  };

  const handleSaveItem = async () => {
    if (!itemForm.name) return;
    const now = new Date().toISOString();
    if (editItem) {
      const updated = await inventoryApi.update(editItem.id!, itemForm);
      setItems(prev => prev.map(i => i.id === editItem.id ? updated : i));
    } else {
      const created = await inventoryApi.create({ ...itemForm, createdAt: now });
      setItems(prev => [created, ...prev]);
    }
    setShowItemForm(false);
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm('למחוק פריט זה? כל ההשאלות שלו יימחקו גם כן.')) return;
    await inventoryApi.delete(id);
    setItems(prev => prev.filter(i => i.id !== id));
    setLoans(prev => prev.filter(l => l.inventoryItemId !== id));
  };

  // ── loans CRUD ────────────────────────────────────────────────────────────
  const openAddLoan = (itemId?: number) => {
    setEditLoan(null);
    setLoanForm({ ...BLANK_LOAN, inventoryItemId: itemId || 0,
      loanedAt: new Date().toISOString().slice(0, 10) });
    setShowLoanForm(true);
  };
  const openEditLoan = (loan: Loan) => {
    setEditLoan(loan);
    setLoanForm({
      inventoryItemId: loan.inventoryItemId,
      borrowerName: loan.borrowerName, borrowerId: loan.borrowerId || '',
      purpose: loan.purpose || '',
      loanedAt: loan.loanedAt.slice(0, 10),
      expectedReturn: loan.expectedReturn ? loan.expectedReturn.slice(0, 10) : '',
      approvedBy: loan.approvedBy || '', notes: loan.notes || '',
    });
    setShowLoanForm(true);
  };

  const handleSaveLoan = async () => {
    if (!loanForm.inventoryItemId || !loanForm.borrowerName) return;
    const payload = {
      inventoryItemId: loanForm.inventoryItemId,
      borrowerName: loanForm.borrowerName,
      borrowerId: loanForm.borrowerId || undefined,
      purpose: loanForm.purpose || undefined,
      loanedAt: loanForm.loanedAt,
      expectedReturn: loanForm.expectedReturn || undefined,
      approvedBy: loanForm.approvedBy || undefined,
      notes: loanForm.notes || undefined,
    };
    if (editLoan) {
      const updated = await inventoryApi.updateLoan(editLoan.id!, payload);
      // re-attach joined fields
      const item = items.find(i => i.id === updated.inventoryItemId);
      setLoans(prev => prev.map(l => l.id === editLoan.id
        ? { ...updated, itemName: item?.name, itemType: item?.type, itemSerial: item?.serialNumber }
        : l));
    } else {
      const created = await inventoryApi.createLoan({ ...payload, status: 'active', createdAt: new Date().toISOString() });
      const item    = items.find(i => i.id === created.inventoryItemId);
      setLoans(prev => [{ ...created, itemName: item?.name, itemType: item?.type, itemSerial: item?.serialNumber }, ...prev]);
    }
    setShowLoanForm(false);
  };

  const handleReturn = async (loan: Loan) => {
    const updated = await inventoryApi.returnLoan(loan.id!);
    setLoans(prev => prev.map(l => l.id === loan.id
      ? { ...l, status: updated.status, returnedAt: updated.returnedAt }
      : l));
  };

  const handleDeleteLoan = async (id: number) => {
    if (!confirm('למחוק רשומת השאלה זו?')) return;
    await inventoryApi.deleteLoan(id);
    setLoans(prev => prev.filter(l => l.id !== id));
  };

  // ── filtered lists ────────────────────────────────────────────────────────
  const filteredItems = typeFilter === 'all' ? items : items.filter(i => i.type === typeFilter);
  const filteredLoans = loanFilter === 'all' ? loans : loans.filter(l => l.status === loanFilter);

  // ── counts ────────────────────────────────────────────────────────────────
  const activeLoans   = loans.filter(l => l.status === 'active').length;
  const overdueLoans  = loans.filter(l => l.status === 'overdue').length;
  const availableItems = items.filter(i =>
    !loans.some(l => l.inventoryItemId === i.id && l.status === 'active')
  ).length;

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>מלאי וציוד מושאל</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
            {items.length} פריטים · {activeLoans} בהשאלה · {overdueLoans > 0 ? `${overdueLoans} באיחור · ` : ''}{availableItems} זמינים
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="ghost" icon={<Package size={14} />} onClick={() => { setTab('loans'); openAddLoan(); }}>
            השאלה חדשה
          </Button>
          <Button variant="primary" icon={<Plus size={14} />} onClick={() => { setTab('inventory'); openAddItem(); }}>
            פריט חדש
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {(['inventory', 'loans'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: tab === t ? 'var(--bg-card)' : 'transparent',
              color: tab === t ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: tab === t ? 700 : 400, fontSize: '13px',
              boxShadow: tab === t ? 'var(--shadow-card)' : 'none',
            }}>
            {t === 'inventory' ? `מלאי (${items.length})` : `השאלות (${loans.length})`}
          </button>
        ))}
      </div>

      {/* ── Inventory tab ─────────────────────────────────────────────────── */}
      {tab === 'inventory' && (
        <>
          {/* Type filter */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {['all', ...equipmentTypes].map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                style={{
                  padding: '5px 14px', borderRadius: '20px', border: '1px solid var(--border)',
                  background: typeFilter === t ? 'var(--accent-primary)' : 'var(--bg-hover)',
                  color: typeFilter === t ? '#fff' : 'var(--text-secondary)',
                  fontSize: '12px', cursor: 'pointer', fontWeight: typeFilter === t ? 700 : 400,
                }}>
                {t === 'all' ? 'הכל' : t}
              </button>
            ))}
          </div>

          {filteredItems.length === 0 ? (
            <Card>
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <HardDrive size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
                אין פריטים במלאי
              </div>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
              {filteredItems.map(item => {
                const isLoaned = loans.some(l => l.inventoryItemId === item.id && l.status === 'active');
                return (
                  <Card key={item.id} style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: '10px',
                          background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <HardDrive size={18} color="var(--accent-primary)" />
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--accent-primary)' }}>{item.type}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => openEditItem(item)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDeleteItem(item.id!)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-danger)', padding: '4px' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                      {item.serialNumber && (
                        <div style={{ background: 'var(--bg-hover)', borderRadius: '8px', padding: '8px 10px' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>מספר סידורי</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{item.serialNumber}</div>
                        </div>
                      )}
                      {item.capacity && (
                        <div style={{ background: 'var(--bg-hover)', borderRadius: '8px', padding: '8px 10px' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>נפח</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{item.capacity}</div>
                        </div>
                      )}
                      {item.manufacturer && (
                        <div style={{ background: 'var(--bg-hover)', borderRadius: '8px', padding: '8px 10px' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>יצרן</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{item.manufacturer}{item.model ? ` ${item.model}` : ''}</div>
                        </div>
                      )}
                      {item.location && (
                        <div style={{ background: 'var(--bg-hover)', borderRadius: '8px', padding: '8px 10px' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>מיקום</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{item.location}</div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span style={{
                          background: `${CONDITION_COLORS[item.condition]}20`,
                          color: CONDITION_COLORS[item.condition],
                          border: `1px solid ${CONDITION_COLORS[item.condition]}40`,
                          borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 700,
                        }}>
                          {INVENTORY_CONDITION_LABELS[item.condition]}
                        </span>
                        {isLoaned && (
                          <span style={{
                            background: 'rgba(0,212,255,0.1)', color: 'var(--accent-primary)',
                            border: '1px solid rgba(0,212,255,0.3)',
                            borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 700,
                          }}>
                            מושאל
                          </span>
                        )}
                      </div>
                      {!isLoaned && (
                        <Button variant="ghost" size="sm" icon={<ArrowDownToLine size={12} />}
                          onClick={() => { setTab('loans'); openAddLoan(item.id); }}>
                          השאל
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Loans tab ─────────────────────────────────────────────────────── */}
      {tab === 'loans' && (
        <>
          {/* Status filter */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {(['all', 'active', 'overdue', 'returned'] as const).map(s => (
              <button key={s} onClick={() => setLoanFilter(s)}
                style={{
                  padding: '5px 14px', borderRadius: '20px', border: '1px solid var(--border)',
                  background: loanFilter === s ? 'var(--accent-primary)' : 'var(--bg-hover)',
                  color: loanFilter === s ? '#fff' : 'var(--text-secondary)',
                  fontSize: '12px', cursor: 'pointer', fontWeight: loanFilter === s ? 700 : 400,
                }}>
                {s === 'all' ? 'הכל' : LOAN_STATUS_LABELS[s as LoanStatus]}
                {s !== 'all' && ` (${loans.filter(l => l.status === s).length})`}
              </button>
            ))}
          </div>

          {filteredLoans.length === 0 ? (
            <Card>
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <Package size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
                אין רשומות השאלה
              </div>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredLoans.map(loan => (
                <Card key={loan.id} hoverable>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
                      background: `${LOAN_STATUS_COLORS[loan.status]}15`,
                      border: `1px solid ${LOAN_STATUS_COLORS[loan.status]}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <HardDrive size={18} color={LOAN_STATUS_COLORS[loan.status]} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {loan.itemName || `פריט #${loan.inventoryItemId}`}
                        {loan.itemSerial && <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', marginRight: '8px' }}>({loan.itemSerial})</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span>לווה: <strong style={{ color: 'var(--text-primary)' }}>{loan.borrowerName}</strong></span>
                        {loan.borrowerId && <span>מס׳ עובד: {loan.borrowerId}</span>}
                        <span>תאריך: {format(new Date(loan.loanedAt), 'dd/MM/yy')}</span>
                        {loan.expectedReturn && <span>החזרה: {format(new Date(loan.expectedReturn), 'dd/MM/yy')}</span>}
                        {loan.approvedBy && <span>אושר ע״י: {loan.approvedBy}</span>}
                      </div>
                      {loan.purpose && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{loan.purpose}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        background: `${LOAN_STATUS_COLORS[loan.status]}20`,
                        color: LOAN_STATUS_COLORS[loan.status],
                        border: `1px solid ${LOAN_STATUS_COLORS[loan.status]}40`,
                        borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 700,
                      }}>
                        {LOAN_STATUS_LABELS[loan.status]}
                      </span>
                      {loan.status === 'active' && (
                        <Button variant="ghost" size="sm" icon={<RotateCcw size={12} />}
                          onClick={() => handleReturn(loan)}>
                          הוחזר
                        </Button>
                      )}
                      <button onClick={() => openEditLoan(loan)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDeleteLoan(loan.id!)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-danger)', padding: '4px' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Item form modal ───────────────────────────────────────────────── */}
      <Modal open={showItemForm} onClose={() => setShowItemForm(false)}
        title={editItem ? 'עריכת פריט' : 'פריט חדש במלאי'} size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LABEL_STYLE}>שם הפריט *</label>
              <input style={INPUT_STYLE} value={itemForm.name}
                onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))}
                placeholder="לדוגמה: כונן נייד WD 1TB" />
            </div>
            <div>
              <label style={LABEL_STYLE}>סוג ציוד</label>
              <select style={INPUT_STYLE} value={itemForm.type}
                onChange={e => setItemForm(f => ({ ...f, type: e.target.value }))}>
                {equipmentTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>מצב</label>
              <select style={INPUT_STYLE} value={itemForm.condition}
                onChange={e => setItemForm(f => ({ ...f, condition: e.target.value as InventoryCondition }))}>
                {Object.entries(INVENTORY_CONDITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>מספר סידורי</label>
              <input style={INPUT_STYLE} value={itemForm.serialNumber}
                onChange={e => setItemForm(f => ({ ...f, serialNumber: e.target.value }))}
                placeholder="S/N" />
            </div>
            <div>
              <label style={LABEL_STYLE}>נפח / גודל</label>
              <input style={INPUT_STYLE} value={itemForm.capacity}
                onChange={e => setItemForm(f => ({ ...f, capacity: e.target.value }))}
                placeholder="1TB, 256GB, ..." />
            </div>
            <div>
              <label style={LABEL_STYLE}>יצרן</label>
              <input style={INPUT_STYLE} value={itemForm.manufacturer}
                onChange={e => setItemForm(f => ({ ...f, manufacturer: e.target.value }))}
                placeholder="Western Digital, Samsung, ..." />
            </div>
            <div>
              <label style={LABEL_STYLE}>דגם</label>
              <input style={INPUT_STYLE} value={itemForm.model}
                onChange={e => setItemForm(f => ({ ...f, model: e.target.value }))}
                placeholder="My Passport, T7, ..." />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LABEL_STYLE}>מיקום / כספת</label>
              <input style={INPUT_STYLE} value={itemForm.location}
                onChange={e => setItemForm(f => ({ ...f, location: e.target.value }))}
                placeholder="מדף A3, ארון SOC, ..." />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LABEL_STYLE}>הערות</label>
              <textarea style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'inherit' }} rows={2}
                value={itemForm.notes}
                onChange={e => setItemForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowItemForm(false)}>ביטול</Button>
            <Button variant="primary" onClick={handleSaveItem}>{editItem ? 'שמור שינויים' : 'הוסף פריט'}</Button>
          </div>
        </div>
      </Modal>

      {/* ── Loan form modal ───────────────────────────────────────────────── */}
      <Modal open={showLoanForm} onClose={() => setShowLoanForm(false)}
        title={editLoan ? 'עריכת השאלה' : 'השאלת ציוד חדשה'} size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LABEL_STYLE}>פריט *</label>
              <select style={INPUT_STYLE} value={loanForm.inventoryItemId}
                onChange={e => setLoanForm(f => ({ ...f, inventoryItemId: Number(e.target.value) }))}>
                <option value={0}>בחר פריט</option>
                {items.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.name}{i.serialNumber ? ` (${i.serialNumber})` : ''}
                    {' — '}
                    {loans.some(l => l.inventoryItemId === i.id && l.status === 'active') ? '⚠️ מושאל' : '✓ זמין'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>שם הלווה *</label>
              <input style={INPUT_STYLE} value={loanForm.borrowerName}
                onChange={e => setLoanForm(f => ({ ...f, borrowerName: e.target.value }))}
                placeholder="שם מלא" />
            </div>
            <div>
              <label style={LABEL_STYLE}>מס׳ עובד / ת״ז</label>
              <input style={INPUT_STYLE} value={loanForm.borrowerId}
                onChange={e => setLoanForm(f => ({ ...f, borrowerId: e.target.value }))}
                placeholder="ID" />
            </div>
            <div>
              <label style={LABEL_STYLE}>תאריך השאלה</label>
              <input type="date" style={INPUT_STYLE} value={loanForm.loanedAt}
                onChange={e => setLoanForm(f => ({ ...f, loanedAt: e.target.value }))} />
            </div>
            <div>
              <label style={LABEL_STYLE}>תאריך החזרה צפוי</label>
              <input type="date" style={INPUT_STYLE} value={loanForm.expectedReturn}
                onChange={e => setLoanForm(f => ({ ...f, expectedReturn: e.target.value }))} />
            </div>
            <div>
              <label style={LABEL_STYLE}>מטרה / שימוש</label>
              <input style={INPUT_STYLE} value={loanForm.purpose}
                onChange={e => setLoanForm(f => ({ ...f, purpose: e.target.value }))}
                placeholder="תיאור השימוש בציוד" />
            </div>
            <div>
              <label style={LABEL_STYLE}>אושר ע״י</label>
              <input style={INPUT_STYLE} value={loanForm.approvedBy}
                onChange={e => setLoanForm(f => ({ ...f, approvedBy: e.target.value }))}
                placeholder="שם המאשר" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LABEL_STYLE}>הערות</label>
              <textarea style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'inherit' }} rows={2}
                value={loanForm.notes}
                onChange={e => setLoanForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowLoanForm(false)}>ביטול</Button>
            <Button variant="primary" onClick={handleSaveLoan}>{editLoan ? 'שמור שינויים' : 'צור השאלה'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
