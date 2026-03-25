import { useState, useEffect } from 'react';
import type React from 'react';
import { motion } from 'framer-motion';
import { Plus, Clock, RefreshCw, FileText, Mail, Users } from 'lucide-react';
import { EmailModal } from '../components/ui/EmailModal';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useTasksStore } from '../store/tasksStore';
import { useAppStore } from '../store/appStore';
import { usersApi } from '../api/client';
import type { Task, TaskStatus, TaskPriority, TaskType, RecurrenceFrequency } from '../types';
import type { User } from '../types';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, RECURRENCE_LABELS } from '../types';
import { format } from 'date-fns';

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'todo', label: 'לביצוע', color: 'var(--text-muted)' },
  { status: 'in_progress', label: 'בתהליך', color: 'var(--accent-primary)' },
  { status: 'review', label: 'בבדיקה', color: 'var(--accent-purple)' },
  { status: 'done', label: 'הושלם', color: 'var(--accent-success)' },
];

function TaskCard({ task, users, onClick }: { task: Task; users: User[]; onClick: () => void }) {
  const priorityColors: Record<TaskPriority, string> = {
    urgent: 'var(--accent-danger)', high: 'var(--accent-warning)',
    normal: 'var(--accent-primary)', low: 'var(--accent-success)',
  };
  const isRecurring = (task.taskType ?? 'one_time') === 'recurring';
  const assignedUsers = (task.assignedUserIds ?? [])
    .map(id => users.find(u => u.id === id))
    .filter(Boolean) as User[];

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '12px', cursor: 'pointer',
        marginBottom: '8px', borderRight: `3px solid ${priorityColors[task.priority]}`,
      }}
    >
      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.4 }}>
        {task.title}
      </div>
      {task.description && (
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {task.description}
        </div>
      )}
      {assignedUsers.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', flexWrap: 'wrap' }}>
          <Users size={11} style={{ color: 'var(--text-muted)' }} />
          {assignedUsers.map(u => (
            <span key={u.id} style={{ fontSize: '11px', color: 'var(--accent-primary)', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)', borderRadius: '6px', padding: '1px 6px' }}>
              {u.fullName}
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <Badge value={task.priority} />
        {isRecurring && task.recurrenceFrequency && (
          <span style={{ fontSize: '12px', color: 'var(--accent-purple)', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px', padding: '1px 6px', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <RefreshCw size={9} />
            {RECURRENCE_LABELS[task.recurrenceFrequency]}
          </span>
        )}
        {task.dueDate && (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Clock size={10} />
            {format(new Date(task.dueDate), 'dd/MM')}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export function Tasks() {
  const { tasks, addTask, updateTask } = useTasksStore();
  const { addToast } = useAppStore();
  const [activeTab, setActiveTab] = useState<TaskType>('one_time');
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<Task | null>(null);
  const [showEmail, setShowEmail] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'normal' as TaskPriority,
    dueDate: '',
    taskType: 'one_time' as TaskType,
    recurrenceFrequency: 'weekly' as RecurrenceFrequency,
    assignedUserIds: [] as number[],
  });

  useEffect(() => {
    usersApi.getAll().then(all => setUsers(all.filter(u => u.isActive)));
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const toggleUser = (userId: number) => {
    setForm(f => ({
      ...f,
      assignedUserIds: f.assignedUserIds.includes(userId)
        ? f.assignedUserIds.filter(id => id !== userId)
        : [...f.assignedUserIds, userId],
    }));
  };

  const handleCreate = async () => {
    if (!form.title) return;
    await addTask({
      title: form.title,
      description: form.description || undefined,
      priority: form.priority,
      dueDate: form.dueDate || undefined,
      status: 'todo',
      taskType: form.taskType,
      assignedUserIds: form.assignedUserIds.length > 0 ? form.assignedUserIds : undefined,
      ...(form.taskType === 'recurring' ? { recurrenceFrequency: form.recurrenceFrequency } : {}),
    });
    setShowNew(false);
    setForm({ title: '', description: '', priority: 'normal', dueDate: '', taskType: activeTab, recurrenceFrequency: 'weekly', assignedUserIds: [] });
    addToast({ type: 'success', message: 'משימה חדשה נוצרה' });
  };

  const handleMove = async (id: number, status: TaskStatus) => {
    await updateTask(id, { status });
    setSelected(null);
    addToast({ type: 'info', message: `משימה הועברה ל"${TASK_STATUS_LABELS[status]}"` });
  };

  const handleToggleAssignee = async (userId: number) => {
    if (!selected) return;
    const current = selected.assignedUserIds ?? [];
    const updated = current.includes(userId)
      ? current.filter(id => id !== userId)
      : [...current, userId];
    await updateTask(selected.id!, { assignedUserIds: updated });
    setSelected(s => s ? { ...s, assignedUserIds: updated } : s);
  };

  const openNewModal = () => {
    setForm(f => ({ ...f, taskType: activeTab }));
    setShowNew(true);
  };

  const filteredTasks = tasks.filter(t => (t.taskType ?? 'one_time') === activeTab);
  const activeCount = filteredTasks.filter(t => t.status !== 'done').length;

  const tabs: { type: TaskType; label: string; icon: React.ReactNode }[] = [
    { type: 'one_time', label: 'משימות חד פעמיות', icon: <FileText size={14} /> },
    { type: 'recurring', label: 'משימות חוזרות', icon: <RefreshCw size={14} /> },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>ניהול משימות</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', margin: '4px 0 0' }}>
            {activeCount} משימות פעילות
          </p>
        </div>
        <Button variant="primary" icon={<Plus size={14} />} onClick={openNewModal}>
          משימה חדשה
        </Button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--bg-card)', borderRadius: '12px', padding: '4px', border: '1px solid var(--border)', width: 'fit-content' }}>
        {tabs.map(tab => {
          const count = tasks.filter(t => (t.taskType ?? 'one_time') === tab.type && t.status !== 'done').length;
          const isActive = activeTab === tab.type;
          return (
            <button
              key={tab.type}
              onClick={() => setActiveTab(tab.type)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: isActive ? 'var(--accent-primary)' : 'transparent',
                color: isActive ? '#000' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 400,
                fontSize: '14px', transition: 'all 0.2s ease',
              }}
            >
              {tab.icon}
              {tab.label}
              <span style={{
                background: isActive ? 'rgba(0,0,0,0.2)' : 'var(--bg-hover)',
                color: isActive ? '#000' : 'var(--text-muted)',
                borderRadius: '10px', padding: '0 7px', fontSize: '12px', fontWeight: 700,
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kanban Board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', alignItems: 'start' }}>
        {COLUMNS.map(col => {
          const items = filteredTasks.filter(t => t.status === col.status);
          return (
            <div key={col.status}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '10px 14px', background: 'var(--bg-card)', borderRadius: '10px', border: `1px solid ${col.color}40` }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{col.label}</span>
                <span style={{ marginRight: 'auto', background: col.color, color: col.color === 'var(--text-muted)' ? 'var(--text-primary)' : '#000', borderRadius: '10px', padding: '1px 8px', fontSize: '12px', fontWeight: 700 }}>
                  {items.length}
                </span>
              </div>
              {items.map(task => (
                <TaskCard key={task.id} task={task} users={users} onClick={() => setSelected(task)} />
              ))}
              {items.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0', border: '1px dashed var(--border)', borderRadius: '10px' }}>
                  אין משימות
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New Task Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="משימה חדשה" size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>כותרת *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="כותרת המשימה"
              style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>תיאור</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
              style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>

          {/* Task Type */}
          <div>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>סוג משימה</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { type: 'one_time' as TaskType, label: 'חד פעמית', icon: <FileText size={13} /> },
                { type: 'recurring' as TaskType, label: 'חוזרת', icon: <RefreshCw size={13} /> },
              ].map(opt => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => set('taskType', opt.type)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '10px', borderRadius: '8px',
                    border: `2px solid ${form.taskType === opt.type ? 'var(--accent-primary)' : 'var(--border)'}`,
                    background: form.taskType === opt.type ? 'rgba(0,212,255,0.1)' : 'var(--bg-hover)',
                    color: form.taskType === opt.type ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: '14px', fontWeight: form.taskType === opt.type ? 700 : 400,
                    transition: 'all 0.2s',
                  }}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: form.taskType === 'recurring' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>עדיפות</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}>
                {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {form.taskType === 'recurring' && (
              <div>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>תדירות</label>
                <select value={form.recurrenceFrequency} onChange={e => set('recurrenceFrequency', e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}>
                  {Object.entries(RECURRENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            )}
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>תאריך יעד</label>
              <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Assigned Users */}
          {users.length > 0 && (
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={13} />
                שיוך משתמשים
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {users.map(u => {
                  const isSelected = form.assignedUserIds.includes(u.id!);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleUser(u.id!)}
                      style={{
                        padding: '5px 12px', borderRadius: '20px', cursor: 'pointer',
                        border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border)'}`,
                        background: isSelected ? 'rgba(0,212,255,0.15)' : 'var(--bg-hover)',
                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontSize: '13px', fontWeight: isSelected ? 600 : 400, transition: 'all 0.15s',
                      }}
                    >
                      {u.fullName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowNew(false)}>ביטול</Button>
            <Button variant="primary" icon={<Plus size={14} />} onClick={handleCreate}>צור משימה</Button>
          </div>
        </div>
      </Modal>

      {/* Task Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title || ''} size="md">
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {selected.description && (
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selected.description}</p>
            )}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Badge value={selected.priority} />
              <Badge value={selected.status} />
              {(selected.taskType ?? 'one_time') === 'recurring' && selected.recurrenceFrequency && (
                <span style={{ fontSize: '12px', color: 'var(--accent-purple)', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <RefreshCw size={10} />
                  {RECURRENCE_LABELS[selected.recurrenceFrequency]} (חוזרת)
                </span>
              )}
              {selected.dueDate && (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} />
                  {format(new Date(selected.dueDate), 'dd/MM/yyyy')}
                </span>
              )}
            </div>

            {/* Assigned Users */}
            {users.length > 0 && (
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={13} />
                  משויכים למשימה
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {users.map(u => {
                    const isAssigned = (selected.assignedUserIds ?? []).includes(u.id!);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleToggleAssignee(u.id!)}
                        style={{
                          padding: '5px 12px', borderRadius: '20px', cursor: 'pointer',
                          border: `1px solid ${isAssigned ? 'var(--accent-primary)' : 'var(--border)'}`,
                          background: isAssigned ? 'rgba(0,212,255,0.15)' : 'var(--bg-hover)',
                          color: isAssigned ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          fontSize: '13px', fontWeight: isAssigned ? 600 : 400, transition: 'all 0.15s',
                        }}
                      >
                        {isAssigned ? '✓ ' : ''}{u.fullName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>העבר לשלב</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {COLUMNS.filter(c => c.status !== selected.status).map(col => (
                  <Button key={col.status} variant="ghost" size="sm" onClick={() => handleMove(selected.id!, col.status)}>
                    {col.label}
                  </Button>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <Button variant="ghost" size="sm" icon={<Mail size={14} />} onClick={() => setShowEmail(true)}>
                שלח מייל על משימה זו
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <EmailModal
        open={showEmail}
        onClose={() => setShowEmail(false)}
        onSent={() => addToast({ type: 'success', message: 'מייל נשלח בהצלחה' })}
        initialSubject={selected ? `[TASK] ${selected.title}` : ''}
        initialBody={selected ? `משימה: ${selected.title}\nעדיפות: ${TASK_PRIORITY_LABELS[selected.priority]}\nסטטוס: ${TASK_STATUS_LABELS[selected.status]}${selected.dueDate ? `\nתאריך יעד: ${selected.dueDate}` : ''}${selected.description ? `\n\nתיאור:\n${selected.description}` : ''}` : ''}
      />
    </div>
  );
}
