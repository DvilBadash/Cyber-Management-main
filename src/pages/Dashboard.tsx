import { useState, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { motion } from 'framer-motion';
import {
  AlertTriangle, CheckSquare, ShieldAlert, Activity, Clock, Users,
  TrendingUp, BarChart2, RefreshCw,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { KPICard } from '../components/ui/KPICard';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useIncidentsStore } from '../store/incidentsStore';
import { useTasksStore } from '../store/tasksStore';
import { useSystemsStore } from '../store/systemsStore';
import { analystsApi } from '../api/client';
import { format, subDays } from 'date-fns';
import { TASK_PRIORITY_LABELS } from '../types';
import type { TaskPriority, TaskStatus } from '../types';

const RANGE_OPTIONS = ['7 ימים', '30 ימים', '90 ימים'] as const;
type Range = typeof RANGE_OPTIONS[number];

const DONUT_COLORS = ['#ff3b5c', '#ffb020', '#8b5cf6', '#00c48c', '#00d4ff'];

function buildTrendData(incidents: any[], days: number) {
  return Array.from({ length: days }, (_, i) => {
    const date = subDays(new Date(), days - 1 - i);
    const dateStr = date.toDateString();
    const count = incidents.filter(
      (inc) => new Date(inc.createdAt).toDateString() === dateStr
    ).length;
    return { date: format(date, 'dd/MM'), count };
  });
}

const stagger = {
  container: { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } },
  item: { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } },
};

const TASK_PANEL_HEIGHT = 300;

export function Dashboard() {
  const { incidents } = useIncidentsStore();
  const { tasks } = useTasksStore();
  const { systems } = useSystemsStore();
  const [range, setRange] = useState<Range>('7 ימים');
  const [analysts, setAnalysts] = useState<any[]>([]);

  useEffect(() => {
    analystsApi.getAll().then(setAnalysts);
  }, []);

  const incidentStats = useIncidentsStore(useShallow((s) => s.getStats()));
  const taskStats = useTasksStore(useShallow((s) => s.getStats()));

  const onlineSystems = systems.filter((s) => s.currentStatus === 'online').length;
  const uptimePct = systems.length ? Math.round((onlineSystems / systems.length) * 100) : 0;

  const rangeDays = range === '7 ימים' ? 7 : range === '30 ימים' ? 30 : 90;
  const trendData = buildTrendData(incidents, rangeDays);

  const severityData = [
    { name: 'קריטי', value: incidents.filter(i => i.severity === 'critical' && i.status !== 'closed').length },
    { name: 'גבוה', value: incidents.filter(i => i.severity === 'high' && i.status !== 'closed').length },
    { name: 'בינוני', value: incidents.filter(i => i.severity === 'medium' && i.status !== 'closed').length },
    { name: 'נמוך', value: incidents.filter(i => i.severity === 'low' && i.status !== 'closed').length },
  ].filter(d => d.value > 0);

  const categoryData = Object.entries(
    incidents.reduce((acc: Record<string, number>, inc) => {
      acc[inc.category] = (acc[inc.category] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6);

  const recentIncidents = incidents.slice(0, 5);

  const priorityOrder: Record<TaskPriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
  const statusOrder: Record<TaskStatus, number> = { in_progress: 0, todo: 1, review: 2, done: 3 };

  const sortTasks = (list: typeof tasks) =>
    list
      .filter(t => t.status !== 'done')
      .sort((a, b) => {
        const po = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (po !== 0) return po;
        return statusOrder[a.status] - statusOrder[b.status];
      });

  const recurringTop5 = useMemo(() =>
    sortTasks(tasks.filter(t => (t.taskType ?? 'one_time') === 'recurring')).slice(0, 5),
  [tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  const oneTimeTop5 = useMemo(() =>
    sortTasks(tasks.filter(t => (t.taskType ?? 'one_time') === 'one_time')).slice(0, 5),
  [tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '39px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          לוח בקרה
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '23px', margin: '4px 0 0' }}>
          סקירה כללית של מרכז פעולות הסייבר
        </p>
      </div>

      {/* KPIs */}
      <motion.div
        variants={stagger.container}
        initial="hidden"
        animate="visible"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}
      >
        <motion.div variants={stagger.item}>
          <KPICard
            label="אירועים פתוחים"
            value={incidentStats.open + incidentStats.inProgress}
            icon={<AlertTriangle size={20} />}
            color="var(--accent-danger)"
            danger={incidentStats.critical > 0}
          />
        </motion.div>
        <motion.div variants={stagger.item}>
          <KPICard
            label="אירועים קריטיים"
            value={incidentStats.critical}
            icon={<ShieldAlert size={20} />}
            color="#ff3b5c"
            danger={incidentStats.critical > 0}
          />
        </motion.div>
        <motion.div variants={stagger.item}>
          <KPICard
            label="משימות פעילות"
            value={taskStats.todo + taskStats.inProgress}
            icon={<CheckSquare size={20} />}
            color="var(--accent-primary)"
          />
        </motion.div>
        <motion.div variants={stagger.item}>
          <KPICard
            label="זמינות מערכות"
            value={uptimePct}
            icon={<Activity size={20} />}
            color={uptimePct > 90 ? 'var(--accent-success)' : 'var(--accent-warning)'}
            suffix="%"
          />
        </motion.div>
        <motion.div variants={stagger.item}>
          <KPICard
            label="אירועים היום"
            value={incidentStats.today}
            icon={<Clock size={20} />}
            color="var(--accent-purple)"
          />
        </motion.div>
        <motion.div variants={stagger.item}>
          <KPICard
            label="אנליסטים פעילים"
            value={analysts.filter(a => a.status === 'active').length}
            icon={<Users size={20} />}
            color="var(--accent-success)"
          />
        </motion.div>
      </motion.div>

      {/* Row 1: Severity Donut | Recurring TOP5 | One-time TOP5 */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 1fr', gap: '16px', marginBottom: '16px', alignItems: 'stretch' }}>

        {/* Severity Donut */}
        <Card title="פיזור לפי חומרה" titleIcon={<ShieldAlert size={16} />}>
          <div style={{ height: TASK_PANEL_HEIGHT, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {severityData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={severityData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} dataKey="value">
                      {severityData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px', justifyContent: 'center' }}>
                  {severityData.map((d, i) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '18px', color: 'var(--text-secondary)' }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: DONUT_COLORS[i], display: 'inline-block' }} />
                      {d.name}: <strong style={{ color: 'var(--text-primary)' }}>{d.value}</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '21px' }}>אין אירועים פתוחים</div>
            )}
          </div>
        </Card>

        {/* Recurring TOP 5 */}
        <Card
          title="משימות חוזרות TOP 5"
          titleIcon={<RefreshCw size={13} />}
          actions={<span style={{ fontSize: '17px', color: 'var(--accent-purple)' }}>{recurringTop5.length}/5</span>}
        >
          <div style={{ height: TASK_PANEL_HEIGHT, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {recurringTop5.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '50px', fontSize: '20px' }}>אין משימות</div>
            ) : recurringTop5.map((task, idx) => {
              const priorityColors: Record<TaskPriority, string> = { urgent: 'var(--accent-danger)', high: 'var(--accent-warning)', normal: 'var(--accent-primary)', low: 'var(--accent-success)' };
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
              return (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', background: isOverdue ? 'rgba(255,59,92,0.10)' : 'var(--bg-hover)', borderRight: `3px solid ${isOverdue ? 'var(--accent-danger)' : priorityColors[task.priority]}`, border: isOverdue ? '1px solid rgba(255,59,92,0.35)' : undefined }}>
                  <span style={{ fontSize: '17px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', minWidth: '16px' }}>{idx + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '21px', fontWeight: 600, color: isOverdue ? 'var(--accent-danger)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                    <div style={{ fontSize: '18px', color: isOverdue ? 'var(--accent-danger)' : 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      {isOverdue ? '⚠ איחור' : TASK_PRIORITY_LABELS[task.priority]}
                      {task.dueDate && <><Clock size={9} />{format(new Date(task.dueDate), 'dd/MM')}</>}
                    </div>
                  </div>
                  <Badge value={task.status} />
                </div>
              );
            })}
          </div>
        </Card>

        {/* One-time TOP 5 */}
        <Card
          title="משימות חד פעמיות TOP 5"
          titleIcon={<CheckSquare size={13} />}
          actions={<span style={{ fontSize: '17px', color: 'var(--accent-primary)' }}>{oneTimeTop5.length}/5</span>}
        >
          <div style={{ height: TASK_PANEL_HEIGHT, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {oneTimeTop5.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '50px', fontSize: '20px' }}>אין משימות</div>
            ) : oneTimeTop5.map((task, idx) => {
              const priorityColors: Record<TaskPriority, string> = { urgent: 'var(--accent-danger)', high: 'var(--accent-warning)', normal: 'var(--accent-primary)', low: 'var(--accent-success)' };
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
              return (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', background: isOverdue ? 'rgba(255,59,92,0.10)' : 'var(--bg-hover)', borderRight: `3px solid ${isOverdue ? 'var(--accent-danger)' : priorityColors[task.priority]}`, border: isOverdue ? '1px solid rgba(255,59,92,0.35)' : undefined }}>
                  <span style={{ fontSize: '17px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', minWidth: '16px' }}>{idx + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '21px', fontWeight: 600, color: isOverdue ? 'var(--accent-danger)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                    <div style={{ fontSize: '18px', color: isOverdue ? 'var(--accent-danger)' : 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      {isOverdue ? '⚠ איחור' : TASK_PRIORITY_LABELS[task.priority]}
                      {task.dueDate && <><Clock size={9} />{format(new Date(task.dueDate), 'dd/MM')}</>}
                    </div>
                  </div>
                  <Badge value={task.status} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Row 2: Category Bar + Recent Incidents */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Category Bar */}
        <Card title="אירועים לפי קטגוריה" titleIcon={<BarChart2 size={16} />}>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={categoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 18 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 18 }} width={110} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Bar dataKey="count" fill="var(--accent-primary)" name="אירועים" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Recent Incidents */}
        <Card title="אירועים פתוחים אחרונים" titleIcon={<AlertTriangle size={16} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentIncidents.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '21px', textAlign: 'center', padding: '20px 0' }}>
                אין אירועים פתוחים
              </div>
            ) : recentIncidents.map((inc) => (
              <div
                key={inc.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px', borderRadius: '8px',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '18px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', marginBottom: '2px' }}>
                    {inc.incidentNumber}
                  </div>
                  <div style={{ fontSize: '21px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inc.title}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <Badge value={inc.severity} />
                  <Badge value={inc.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 3: Systems Status + Incident Trend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Systems Status */}
        <Card title="סטטוס מערכות" titleIcon={<Activity size={16} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {systems.slice(0, 6).map((sys) => (
              <div
                key={sys.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-hover)',
                }}
              >
                <span style={{ fontSize: '21px', color: 'var(--text-primary)' }}>{sys.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>{sys.category}</span>
                  <Badge value={sys.currentStatus} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Incident Trend (moved from row 1) */}
        <Card
          title="מגמת אירועים שבועי"
          titleIcon={<TrendingUp size={16} />}
          actions={
            <div style={{ display: 'flex', gap: '6px' }}>
              {RANGE_OPTIONS.map((r) => (
                <button key={r} onClick={() => setRange(r)} style={{ padding: '3px 8px', fontSize: '18px', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--border)', background: range === r ? 'var(--accent-primary)' : 'transparent', color: range === r ? '#000' : 'var(--text-secondary)', fontWeight: range === r ? 700 : 400 }}>
                  {r}
                </button>
              ))}
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 18 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 18 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} labelStyle={{ color: 'var(--text-primary)' }} />
              <Line type="monotone" dataKey="count" stroke="var(--accent-primary)" strokeWidth={2} dot={{ fill: 'var(--accent-primary)', r: 3 }} name="אירועים" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
