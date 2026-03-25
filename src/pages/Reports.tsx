import { useState, useEffect, useMemo } from 'react';
import { Download, AlertTriangle, CheckSquare, ShieldAlert, Monitor, Star, Activity, FileBarChart2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useIncidentsStore } from '../store/incidentsStore';
import { useTasksStore } from '../store/tasksStore';
import { useSystemsStore } from '../store/systemsStore';
import { eventsApi, usersApi } from '../api/client';
import type { SpecialEvent, ActivityLog, User } from '../types';
import {
  SEVERITY_LABELS, INCIDENT_STATUS_LABELS, TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS, SPECIAL_EVENT_TYPE_LABELS,
} from '../types';

type ReportType = 'incidents' | 'tasks' | 'cves' | 'systems' | 'events' | 'activity';

const REPORT_TYPES: { id: ReportType; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'incidents', label: 'דוח אירועים', icon: AlertTriangle },
  { id: 'tasks', label: 'דוח משימות', icon: CheckSquare },
  { id: 'cves', label: 'דוח CVEs', icon: ShieldAlert },
  { id: 'systems', label: 'דוח מערכות', icon: Monitor },
  { id: 'events', label: 'אירועים מיוחדים', icon: Star },
  { id: 'activity', label: 'לוג פעולות', icon: Activity },
];

function exportCSV(filename: string, rows: Record<string, string | number | boolean | undefined>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [
    keys.join(','),
    ...rows.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const inRange = (dateStr: string | undefined, from: string, to: string) => {
  if (!dateStr) return true;
  const d = dateStr.slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
};

const sevColor: Record<string, string> = {
  critical: 'var(--accent-danger)', high: 'var(--accent-warning)',
  medium: '#f59e0b', low: 'var(--accent-success)', info: 'var(--text-muted)',
};

const inputSt: React.CSSProperties = {
  padding: '7px 10px', background: 'var(--bg-hover)',
  border: '1px solid var(--border)', borderRadius: '6px',
  color: 'var(--text-primary)', fontSize: '12px',
};

const labelSt: React.CSSProperties = {
  fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block',
};

const thSt: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'right', fontSize: '11px',
  color: 'var(--text-muted)', fontWeight: 600,
  borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)',
  whiteSpace: 'nowrap',
};

const tdSt: React.CSSProperties = {
  padding: '8px 12px', fontSize: '12px', color: 'var(--text-primary)',
  borderBottom: '1px solid var(--border)',
};

export function Reports() {
  const [reportType, setReportType] = useState<ReportType>('incidents');
  const { incidents } = useIncidentsStore();
  const { tasks } = useTasksStore();
  const { systems, cves } = useSystemsStore();
  const [specialEvents, setSpecialEvents] = useState<SpecialEvent[]>([]);
  const [activityLogs, setActivityLogs] = useState<(ActivityLog & { username?: string })[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const today = new Date().toISOString().split('T')[0];
  const d30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const [incF, setIncF] = useState({ dateFrom: d30, dateTo: today, severity: '', status: '', category: '' });
  const [taskF, setTaskF] = useState({ dateFrom: d30, dateTo: today, status: '', priority: '' });
  const [cveF, setCveF] = useState({ dateFrom: '', dateTo: '', cvssMin: '', cvssMax: '', exploit: '' });
  const [sysF, setSysF] = useState({ status: '', category: '' });
  const [evtF, setEvtF] = useState({ dateFrom: '', dateTo: '', type: '', status: '' });
  const [actF, setActF] = useState({ dateFrom: d30, dateTo: today, module: '', userId: '' });

  useEffect(() => {
    eventsApi.getAll().then(setSpecialEvents);
    usersApi.getAll().then(setUsers);
  }, []);

  useEffect(() => {
    if (reportType !== 'activity') return;
    usersApi.getActivity().then(logs => {
      const uMap: Record<number, string> = {};
      users.forEach(u => { if (u.id) uMap[u.id] = u.fullName; });
      setActivityLogs(logs.map(l => ({ ...l, username: uMap[l.userId] || `#${l.userId}` })));
    });
  }, [reportType, users]);

  const fInc = useMemo(() => incidents.filter(i =>
    inRange(i.createdAt, incF.dateFrom, incF.dateTo) &&
    (!incF.severity || i.severity === incF.severity) &&
    (!incF.status || i.status === incF.status) &&
    (!incF.category || i.category === incF.category)
  ), [incidents, incF]);

  const fTask = useMemo(() => tasks.filter(t =>
    inRange(t.createdAt, taskF.dateFrom, taskF.dateTo) &&
    (!taskF.status || t.status === taskF.status) &&
    (!taskF.priority || t.priority === taskF.priority)
  ), [tasks, taskF]);

  const fCve = useMemo(() => cves.filter(c =>
    inRange(c.discoveredAt, cveF.dateFrom, cveF.dateTo) &&
    (!cveF.cvssMin || (c.cvssScore ?? 0) >= parseFloat(cveF.cvssMin)) &&
    (!cveF.cvssMax || (c.cvssScore ?? 10) <= parseFloat(cveF.cvssMax)) &&
    (!cveF.exploit || (cveF.exploit === 'yes') === c.exploitAvailable)
  ), [cves, cveF]);

  const fSys = useMemo(() => systems.filter(s =>
    (!sysF.status || s.currentStatus === sysF.status) &&
    (!sysF.category || s.category === sysF.category)
  ), [systems, sysF]);

  const fEvt = useMemo(() => specialEvents.filter(e =>
    inRange(e.startDate, evtF.dateFrom, evtF.dateTo) &&
    (!evtF.type || e.type === evtF.type) &&
    (!evtF.status || e.status === evtF.status)
  ), [specialEvents, evtF]);

  const fAct = useMemo(() => activityLogs.filter(l =>
    inRange(l.timestamp, actF.dateFrom, actF.dateTo) &&
    (!actF.module || l.module === actF.module) &&
    (!actF.userId || String(l.userId) === actF.userId)
  ), [activityLogs, actF]);

  const actModules = useMemo(() => [...new Set(activityLogs.map(l => l.module))].sort(), [activityLogs]);
  const incCategories = useMemo(() => [...new Set(incidents.map(i => i.category))].sort(), [incidents]);
  const sysCats = useMemo(() => [...new Set(systems.map(s => s.category))].sort(), [systems]);

  const resultCount = { incidents: fInc.length, tasks: fTask.length, cves: fCve.length, systems: fSys.length, events: fEvt.length, activity: fAct.length }[reportType];

  const handleExport = () => {
    switch (reportType) {
      case 'incidents':
        exportCSV('incidents', fInc.map(i => ({
          'מספר אירוע': i.incidentNumber, 'כותרת': i.title,
          'חומרה': SEVERITY_LABELS[i.severity], 'סטטוס': INCIDENT_STATUS_LABELS[i.status],
          'קטגוריה': i.category, 'מקור': i.source,
          'נפתח': i.createdAt.slice(0, 10), 'נסגר': i.closedAt?.slice(0, 10) || '',
        })));
        break;
      case 'tasks':
        exportCSV('tasks', fTask.map(t => ({
          'כותרת': t.title, 'עדיפות': TASK_PRIORITY_LABELS[t.priority],
          'סטטוס': TASK_STATUS_LABELS[t.status],
          'תאריך יצירה': t.createdAt.slice(0, 10), 'תאריך יעד': t.dueDate || '',
        })));
        break;
      case 'cves':
        exportCSV('cves', fCve.map(c => ({
          'CVE ID': c.cveId, 'CVSS': c.cvssScore ?? '',
          'Exploit': c.exploitAvailable ? 'כן' : 'לא',
          'נגלה': c.discoveredAt.slice(0, 10),
          'דרך טיפול': c.treatmentMethod || '', 'תיאור': c.description,
        })));
        break;
      case 'systems':
        exportCSV('systems', fSys.map(s => ({
          'שם': s.name, 'קטגוריה': s.category, 'סטטוס': s.currentStatus,
          'בדיקה אחרונה': s.lastChecked?.slice(0, 10) || '', 'בעלים': s.owner || '',
        })));
        break;
      case 'events':
        exportCSV('events', fEvt.map(e => ({
          'שם': e.name, 'סוג': SPECIAL_EVENT_TYPE_LABELS[e.type], 'סטטוס': e.status,
          'תחילה': e.startDate, 'סיום': e.endDate || '',
        })));
        break;
      case 'activity':
        exportCSV('activity', fAct.map(l => ({
          'משתמש': l.username || '', 'פעולה': l.action, 'מודול': l.module,
          'פרטים': l.details || '', 'זמן': l.timestamp.slice(0, 19).replace('T', ' '),
        })));
        break;
    }
  };

  // Summary stats per report type
  const summaryStats = useMemo(() => {
    if (reportType === 'incidents') {
      const open = fInc.filter(i => i.status === 'open').length;
      const critical = fInc.filter(i => i.severity === 'critical').length;
      const closed = fInc.filter(i => i.status === 'closed').length;
      return [
        { label: 'סה"כ', value: fInc.length, color: 'var(--accent-primary)' },
        { label: 'פתוחים', value: open, color: 'var(--accent-warning)' },
        { label: 'קריטיים', value: critical, color: 'var(--accent-danger)' },
        { label: 'סגורים', value: closed, color: 'var(--accent-success)' },
      ];
    }
    if (reportType === 'tasks') {
      return [
        { label: 'סה"כ', value: fTask.length, color: 'var(--accent-primary)' },
        { label: 'לביצוע', value: fTask.filter(t => t.status === 'todo').length, color: 'var(--text-muted)' },
        { label: 'בתהליך', value: fTask.filter(t => t.status === 'in_progress').length, color: 'var(--accent-warning)' },
        { label: 'הושלמו', value: fTask.filter(t => t.status === 'done').length, color: 'var(--accent-success)' },
      ];
    }
    if (reportType === 'cves') {
      const exploitable = fCve.filter(c => c.exploitAvailable).length;
      const critical = fCve.filter(c => (c.cvssScore ?? 0) >= 9).length;
      const treated = fCve.filter(c => c.treatmentMethod).length;
      return [
        { label: 'סה"כ', value: fCve.length, color: 'var(--accent-primary)' },
        { label: 'Exploit זמין', value: exploitable, color: 'var(--accent-danger)' },
        { label: 'CVSS ≥ 9', value: critical, color: 'var(--accent-warning)' },
        { label: 'עם טיפול', value: treated, color: 'var(--accent-success)' },
      ];
    }
    if (reportType === 'systems') {
      return [
        { label: 'סה"כ', value: fSys.length, color: 'var(--accent-primary)' },
        { label: 'תקינים', value: fSys.filter(s => s.currentStatus === 'online').length, color: 'var(--accent-success)' },
        { label: 'מדורדרים', value: fSys.filter(s => s.currentStatus === 'degraded').length, color: 'var(--accent-warning)' },
        { label: 'לא זמינים', value: fSys.filter(s => s.currentStatus === 'offline').length, color: 'var(--accent-danger)' },
      ];
    }
    if (reportType === 'events') {
      return [
        { label: 'סה"כ', value: fEvt.length, color: 'var(--accent-primary)' },
        { label: 'פעילים', value: fEvt.filter(e => e.status === 'active').length, color: 'var(--accent-success)' },
        { label: 'מתוכננים', value: fEvt.filter(e => e.status === 'planned').length, color: 'var(--accent-warning)' },
        { label: 'הושלמו', value: fEvt.filter(e => e.status === 'completed').length, color: 'var(--text-secondary)' },
      ];
    }
    return [{ label: 'רשומות', value: fAct.length, color: 'var(--accent-primary)' }];
  }, [reportType, fInc, fTask, fCve, fSys, fEvt, fAct]);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>דוחות</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
          ניתוח וייצוא נתונים מכל מודולי המערכת
        </p>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* Left: Report type selector */}
        <div style={{ width: '200px', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {REPORT_TYPES.map(rt => {
              const Icon = rt.icon;
              return (
                <button
                  key={rt.id}
                  onClick={() => setReportType(rt.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    background: reportType === rt.id ? 'var(--bg-hover)' : 'transparent',
                    color: reportType === rt.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontSize: '13px', fontWeight: reportType === rt.id ? 600 : 400,
                    textAlign: 'right', fontFamily: 'inherit',
                    borderLeft: reportType === rt.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  }}
                >
                  <Icon size={16} />
                  {rt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Filters + Results */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Summary Stats */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {summaryStats.map(stat => (
              <div
                key={stat.label}
                style={{
                  flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: '10px', padding: '14px 16px',
                }}
              >
                <div style={{ fontSize: '22px', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <Card>
            {/* Filters */}
            <div style={{ marginBottom: '16px', padding: '14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
                סינון נתונים
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>

                {/* ── Incidents filters ── */}
                {reportType === 'incidents' && (<>
                  <div>
                    <label style={labelSt}>מתאריך</label>
                    <input type="date" style={inputSt} value={incF.dateFrom} onChange={e => setIncF(f => ({ ...f, dateFrom: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelSt}>עד תאריך</label>
                    <input type="date" style={inputSt} value={incF.dateTo} onChange={e => setIncF(f => ({ ...f, dateTo: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelSt}>חומרה</label>
                    <select style={inputSt} value={incF.severity} onChange={e => setIncF(f => ({ ...f, severity: e.target.value }))}>
                      <option value="">הכל</option>
                      {(['critical', 'high', 'medium', 'low', 'info'] as const).map(s => <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelSt}>סטטוס</label>
                    <select style={inputSt} value={incF.status} onChange={e => setIncF(f => ({ ...f, status: e.target.value }))}>
                      <option value="">הכל</option>
                      {(['open', 'in_progress', 'pending', 'closed', 'false_positive'] as const).map(s => <option key={s} value={s}>{INCIDENT_STATUS_LABELS[s]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelSt}>קטגוריה</label>
                    <select style={inputSt} value={incF.category} onChange={e => setIncF(f => ({ ...f, category: e.target.value }))}>
                      <option value="">הכל</option>
                      {incCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </>)}

                {/* ── Tasks filters ── */}
                {reportType === 'tasks' && (<>
                  <div>
                    <label style={labelSt}>מתאריך</label>
                    <input type="date" style={inputSt} value={taskF.dateFrom} onChange={e => setTaskF(f => ({ ...f, dateFrom: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelSt}>עד תאריך</label>
                    <input type="date" style={inputSt} value={taskF.dateTo} onChange={e => setTaskF(f => ({ ...f, dateTo: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelSt}>סטטוס</label>
                    <select style={inputSt} value={taskF.status} onChange={e => setTaskF(f => ({ ...f, status: e.target.value }))}>
                      <option value="">הכל</option>
                      {(['todo', 'in_progress', 'review', 'done'] as const).map(s => <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelSt}>עדיפות</label>
                    <select style={inputSt} value={taskF.priority} onChange={e => setTaskF(f => ({ ...f, priority: e.target.value }))}>
                      <option value="">הכל</option>
                      {(['urgent', 'high', 'normal', 'low'] as const).map(p => <option key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</option>)}
                    </select>
                  </div>
                </>)}

                {/* ── CVEs filters ── */}
                {reportType === 'cves' && (<>
                  <div>
                    <label style={labelSt}>מתאריך גילוי</label>
                    <input type="date" style={inputSt} value={cveF.dateFrom} onChange={e => setCveF(f => ({ ...f, dateFrom: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelSt}>עד תאריך</label>
                    <input type="date" style={inputSt} value={cveF.dateTo} onChange={e => setCveF(f => ({ ...f, dateTo: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelSt}>CVSS מינימום</label>
                    <input type="number" min="0" max="10" step="0.1" style={{ ...inputSt, width: '80px' }} value={cveF.cvssMin} placeholder="0.0" onChange={e => setCveF(f => ({ ...f, cvssMin: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelSt}>CVSS מקסימום</label>
                    <input type="number" min="0" max="10" step="0.1" style={{ ...inputSt, width: '80px' }} value={cveF.cvssMax} placeholder="10.0" onChange={e => setCveF(f => ({ ...f, cvssMax: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelSt}>Exploit זמין</label>
                    <select style={inputSt} value={cveF.exploit} onChange={e => setCveF(f => ({ ...f, exploit: e.target.value }))}>
                      <option value="">הכל</option>
                      <option value="yes">כן</option>
                      <option value="no">לא</option>
                    </select>
                  </div>
                </>)}

                {/* ── Systems filters ── */}
                {reportType === 'systems' && (<>
                  <div>
                    <label style={labelSt}>סטטוס</label>
                    <select style={inputSt} value={sysF.status} onChange={e => setSysF(f => ({ ...f, status: e.target.value }))}>
                      <option value="">הכל</option>
                      <option value="online">תקין</option>
                      <option value="degraded">מדורדר</option>
                      <option value="offline">לא זמין</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelSt}>קטגוריה</label>
                    <select style={inputSt} value={sysF.category} onChange={e => setSysF(f => ({ ...f, category: e.target.value }))}>
                      <option value="">הכל</option>
                      {sysCats.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </>)}

                {/* ── Special Events filters ── */}
                {reportType === 'events' && (<>
                  <div>
                    <label style={labelSt}>מתאריך</label>
                    <input type="date" style={inputSt} value={evtF.dateFrom} onChange={e => setEvtF(f => ({ ...f, dateFrom: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelSt}>עד תאריך</label>
                    <input type="date" style={inputSt} value={evtF.dateTo} onChange={e => setEvtF(f => ({ ...f, dateTo: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelSt}>סוג</label>
                    <select style={inputSt} value={evtF.type} onChange={e => setEvtF(f => ({ ...f, type: e.target.value }))}>
                      <option value="">הכל</option>
                      {(['red_team', 'blue_team', 'operation', 'investigation', 'infrastructure', 'external'] as const).map(t => <option key={t} value={t}>{SPECIAL_EVENT_TYPE_LABELS[t]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelSt}>סטטוס</label>
                    <select style={inputSt} value={evtF.status} onChange={e => setEvtF(f => ({ ...f, status: e.target.value }))}>
                      <option value="">הכל</option>
                      <option value="planned">מתוכנן</option>
                      <option value="active">פעיל</option>
                      <option value="completed">הושלם</option>
                      <option value="cancelled">בוטל</option>
                    </select>
                  </div>
                </>)}

                {/* ── Activity filters ── */}
                {reportType === 'activity' && (<>
                  <div>
                    <label style={labelSt}>מתאריך</label>
                    <input type="date" style={inputSt} value={actF.dateFrom} onChange={e => setActF(f => ({ ...f, dateFrom: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelSt}>עד תאריך</label>
                    <input type="date" style={inputSt} value={actF.dateTo} onChange={e => setActF(f => ({ ...f, dateTo: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelSt}>מודול</label>
                    <select style={inputSt} value={actF.module} onChange={e => setActF(f => ({ ...f, module: e.target.value }))}>
                      <option value="">הכל</option>
                      {actModules.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelSt}>משתמש</label>
                    <select style={inputSt} value={actF.userId} onChange={e => setActF(f => ({ ...f, userId: e.target.value }))}>
                      <option value="">הכל</option>
                      {users.map(u => <option key={u.id} value={String(u.id)}>{u.fullName}</option>)}
                    </select>
                  </div>
                </>)}
              </div>
            </div>

            {/* Results header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                נמצאו{' '}
                <strong style={{ color: 'var(--accent-primary)' }}>{resultCount}</strong>{' '}
                רשומות
              </span>
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={13} />}
                onClick={handleExport}
                disabled={!resultCount}
              >
                ייצוא CSV
              </Button>
            </div>

            {/* Results table */}
            <div style={{ overflowX: 'auto' }}>

              {reportType === 'incidents' && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['מספר', 'כותרת', 'חומרה', 'סטטוס', 'קטגוריה', 'נפתח', 'נסגר'].map(h => <th key={h} style={thSt}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {fInc.map(i => (
                      <tr key={i.id} className="hover:bg-[var(--bg-hover)]">
                        <td style={tdSt}><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>{i.incidentNumber}</span></td>
                        <td style={{ ...tdSt, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.title}</td>
                        <td style={tdSt}><span style={{ color: sevColor[i.severity], fontWeight: 600 }}>{SEVERITY_LABELS[i.severity]}</span></td>
                        <td style={tdSt}>{INCIDENT_STATUS_LABELS[i.status]}</td>
                        <td style={tdSt}>{i.category}</td>
                        <td style={{ ...tdSt, whiteSpace: 'nowrap' }}>{i.createdAt.slice(0, 10)}</td>
                        <td style={{ ...tdSt, whiteSpace: 'nowrap' }}>{i.closedAt?.slice(0, 10) || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportType === 'tasks' && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['כותרת', 'עדיפות', 'סטטוס', 'תאריך יצירה', 'תאריך יעד'].map(h => <th key={h} style={thSt}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {fTask.map(t => (
                      <tr key={t.id} className="hover:bg-[var(--bg-hover)]">
                        <td style={{ ...tdSt, maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</td>
                        <td style={tdSt}>
                          <span style={{ color: t.priority === 'urgent' ? 'var(--accent-danger)' : t.priority === 'high' ? 'var(--accent-warning)' : 'var(--text-primary)', fontWeight: t.priority === 'urgent' ? 700 : 400 }}>
                            {TASK_PRIORITY_LABELS[t.priority]}
                          </span>
                        </td>
                        <td style={tdSt}>{TASK_STATUS_LABELS[t.status]}</td>
                        <td style={{ ...tdSt, whiteSpace: 'nowrap' }}>{t.createdAt.slice(0, 10)}</td>
                        <td style={{ ...tdSt, whiteSpace: 'nowrap' }}>{t.dueDate || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportType === 'cves' && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['CVE ID', 'CVSS', 'Exploit', 'נגלה', 'דרך טיפול', 'תיאור'].map(h => <th key={h} style={thSt}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {fCve.map(c => (
                      <tr key={c.id} className="hover:bg-[var(--bg-hover)]">
                        <td style={tdSt}><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--accent-primary)' }}>{c.cveId}</span></td>
                        <td style={tdSt}>
                          <span style={{ color: (c.cvssScore ?? 0) >= 9 ? 'var(--accent-danger)' : (c.cvssScore ?? 0) >= 7 ? 'var(--accent-warning)' : 'var(--accent-success)', fontWeight: 600 }}>
                            {c.cvssScore?.toFixed(1) ?? '—'}
                          </span>
                        </td>
                        <td style={tdSt}>
                          <span style={{ color: c.exploitAvailable ? 'var(--accent-danger)' : 'var(--accent-success)', fontWeight: 600 }}>
                            {c.exploitAvailable ? '⚠ כן' : '✓ לא'}
                          </span>
                        </td>
                        <td style={{ ...tdSt, whiteSpace: 'nowrap' }}>{c.discoveredAt.slice(0, 10)}</td>
                        <td style={{ ...tdSt, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.treatmentMethod || '—'}</td>
                        <td style={{ ...tdSt, maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportType === 'systems' && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['שם מערכת', 'קטגוריה', 'סטטוס', 'בדיקה אחרונה', 'בעלים', 'תדירות'].map(h => <th key={h} style={thSt}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {fSys.map(s => (
                      <tr key={s.id} className="hover:bg-[var(--bg-hover)]">
                        <td style={tdSt}>{s.name}</td>
                        <td style={tdSt}>{s.category}</td>
                        <td style={tdSt}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                            background: s.currentStatus === 'online' ? 'rgba(0,196,140,0.15)' : s.currentStatus === 'offline' ? 'rgba(255,59,48,0.15)' : 'rgba(255,149,0,0.15)',
                            color: s.currentStatus === 'online' ? 'var(--accent-success)' : s.currentStatus === 'offline' ? 'var(--accent-danger)' : 'var(--accent-warning)',
                          }}>
                            {s.currentStatus === 'online' ? 'תקין' : s.currentStatus === 'offline' ? 'לא זמין' : 'מדורדר'}
                          </span>
                        </td>
                        <td style={{ ...tdSt, whiteSpace: 'nowrap' }}>{s.lastChecked?.slice(0, 10) || '—'}</td>
                        <td style={tdSt}>{s.owner || '—'}</td>
                        <td style={tdSt}>{s.checkFrequency === 'hourly' ? 'שעתי' : s.checkFrequency === 'daily' ? 'יומי' : 'שבועי'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportType === 'events' && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['שם', 'סוג', 'סטטוס', 'תחילה', 'סיום', 'תיאור'].map(h => <th key={h} style={thSt}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {fEvt.map(e => (
                      <tr key={e.id} className="hover:bg-[var(--bg-hover)]">
                        <td style={tdSt}>{e.name}</td>
                        <td style={tdSt}>{SPECIAL_EVENT_TYPE_LABELS[e.type]}</td>
                        <td style={tdSt}>
                          <span style={{ color: e.status === 'active' ? 'var(--accent-success)' : e.status === 'cancelled' ? 'var(--accent-danger)' : e.status === 'planned' ? 'var(--accent-warning)' : 'var(--text-secondary)', fontWeight: 600 }}>
                            {e.status === 'planned' ? 'מתוכנן' : e.status === 'active' ? 'פעיל' : e.status === 'completed' ? 'הושלם' : 'בוטל'}
                          </span>
                        </td>
                        <td style={{ ...tdSt, whiteSpace: 'nowrap' }}>{e.startDate}</td>
                        <td style={{ ...tdSt, whiteSpace: 'nowrap' }}>{e.endDate || '—'}</td>
                        <td style={{ ...tdSt, maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportType === 'activity' && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['משתמש', 'פעולה', 'מודול', 'פרטים', 'זמן'].map(h => <th key={h} style={thSt}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {fAct.map((l, idx) => (
                      <tr key={l.id ?? idx} className="hover:bg-[var(--bg-hover)]">
                        <td style={{ ...tdSt, whiteSpace: 'nowrap' }}>{l.username}</td>
                        <td style={tdSt}>{l.action}</td>
                        <td style={tdSt}><span style={{ color: 'var(--accent-primary)', fontSize: '11px' }}>{l.module}</span></td>
                        <td style={{ ...tdSt, maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.details || '—'}</td>
                        <td style={{ ...tdSt, fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', whiteSpace: 'nowrap' }}>{l.timestamp.slice(0, 19).replace('T', ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {resultCount === 0 && (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  <FileBarChart2 size={32} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
                  אין נתונים להצגה עם הסינון הנוכחי
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
