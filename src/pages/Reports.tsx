import { useState, useEffect, useMemo } from 'react';
import { Download, AlertTriangle, CheckSquare, ShieldAlert, Monitor, Star, Activity, FileBarChart2, Package, CalendarDays } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useIncidentsStore } from '../store/incidentsStore';
import { useTasksStore } from '../store/tasksStore';
import { useSystemsStore } from '../store/systemsStore';
import { eventsApi, usersApi, inventoryApi, analystsApi } from '../api/client';
import type { SpecialEvent, ActivityLog, User, Loan, Analyst, Shift } from '../types';
import {
  SEVERITY_LABELS, INCIDENT_STATUS_LABELS, TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS, SPECIAL_EVENT_TYPE_LABELS,
  LOAN_STATUS_LABELS, INVENTORY_TYPE_LABELS,
} from '../types';

type ReportType = 'incidents' | 'tasks' | 'cves' | 'systems' | 'events' | 'activity' | 'loans' | 'shifts';

const SHIFT_TYPE_LABELS: Record<string, string> = { morning: 'בוקר', afternoon: 'צהריים', night: 'לילה' };
const SHIFT_TYPE_COLOR: Record<string, string> = { morning: '#f59e0b', afternoon: '#58a6ff', night: '#a371f7' };
const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function getWeekBounds(anchorDate: string): { from: string; to: string } {
  const d = new Date(anchorDate + 'T12:00:00');
  const day = d.getDay(); // 0=Sun
  const sun = new Date(d); sun.setDate(d.getDate() - day);
  const sat = new Date(sun); sat.setDate(sun.getDate() + 6);
  return {
    from: sun.toISOString().split('T')[0],
    to:   sat.toISOString().split('T')[0],
  };
}

const REPORT_TYPES: { id: ReportType; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'incidents', label: 'דוח אירועים', icon: AlertTriangle },
  { id: 'tasks', label: 'דוח משימות', icon: CheckSquare },
  { id: 'cves', label: 'דוח CVEs', icon: ShieldAlert },
  { id: 'systems', label: 'דוח מערכות', icon: Monitor },
  { id: 'events', label: 'אירועים מיוחדים', icon: Star },
  { id: 'activity', label: 'לוג פעולות', icon: Activity },
  { id: 'loans', label: 'היסטוריית השאלות', icon: Package },
  { id: 'shifts', label: 'דוח משמרות שבועי', icon: CalendarDays },
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

// ── HTML Export ──────────────────────────────────────────────────────────────

type HtmlCell = string | { text: string; color?: string; badge?: boolean; mono?: boolean };

function buildHtmlDoc(
  title: string,
  subtitle: string,
  generated: string,
  stats: { label: string; value: number; color: string }[],
  headers: string[],
  rows: HtmlCell[][],
): string {
  const statsHtml = stats.map(s => `
    <div class="kpi">
      <div class="kpi-val" style="color:${s.color}">${s.value}</div>
      <div class="kpi-label">${s.label}</div>
    </div>`).join('');

  const theadHtml = headers.map(h => `<th>${h}</th>`).join('');

  const tbodyHtml = rows.map((row, ri) => {
    const cells = row.map(cell => {
      if (typeof cell === 'string') return `<td>${cell}</td>`;
      const style = cell.color ? `color:${cell.color}` : '';
      const cls   = [cell.badge ? 'badge' : '', cell.mono ? 'mono' : ''].filter(Boolean).join(' ');
      const inner = cell.badge
        ? `<span class="badge-pill" style="color:${cell.color};border-color:${cell.color}20;background:${cell.color}18">${cell.text}</span>`
        : `<span class="${cls}" style="${style}">${cell.text}</span>`;
      return `<td>${inner}</td>`;
    }).join('');
    return `<tr class="${ri % 2 === 0 ? 'even' : 'odd'}">${cells}</tr>`;
  }).join('');

  const emptyRow = rows.length === 0
    ? `<tr><td colspan="${headers.length}" class="empty">No records match the current filters</td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
       background:#0d1117;color:#e6edf3;direction:rtl;font-size:13px;line-height:1.5}
  .page{max-width:1100px;margin:0 auto;padding:32px 24px}
  /* Header */
  .report-header{background:linear-gradient(135deg,#161b22,#1a2332);border:1px solid #30363d;
    border-radius:12px;padding:28px 32px;margin-bottom:24px;
    display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px}
  .report-title{font-size:22px;font-weight:800;color:#e6edf3;margin-bottom:4px}
  .report-sub{font-size:13px;color:#8b949e}
  .report-meta{text-align:left;font-size:12px;color:#8b949e;line-height:1.8}
  .report-meta strong{color:#58a6ff}
  .logo{font-size:11px;font-weight:700;letter-spacing:1px;color:#58a6ff;
        background:rgba(88,166,255,0.1);border:1px solid rgba(88,166,255,0.3);
        border-radius:6px;padding:4px 10px;display:inline-block;margin-bottom:8px}
  /* KPI */
  .kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:24px}
  .kpi{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:16px 20px;text-align:center}
  .kpi-val{font-size:28px;font-weight:800;font-variant-numeric:tabular-nums;margin-bottom:4px}
  .kpi-label{font-size:11px;color:#8b949e;font-weight:500}
  /* Table */
  .table-wrap{background:#161b22;border:1px solid #30363d;border-radius:12px;overflow:hidden}
  .table-header{display:flex;align-items:center;justify-content:space-between;
    padding:14px 20px;border-bottom:1px solid #30363d}
  .table-header h3{font-size:13px;font-weight:700;color:#e6edf3}
  .record-count{font-size:12px;color:#8b949e}
  .record-count strong{color:#58a6ff}
  table{width:100%;border-collapse:collapse}
  th{padding:10px 14px;text-align:right;font-size:11px;color:#8b949e;font-weight:600;
     background:#0d1117;border-bottom:1px solid #30363d;white-space:nowrap}
  td{padding:9px 14px;font-size:12px;color:#e6edf3;border-bottom:1px solid #21262d;
     vertical-align:middle}
  tr.even td{background:transparent}
  tr.odd td{background:rgba(255,255,255,0.015)}
  tr:last-child td{border-bottom:none}
  tr:hover td{background:rgba(88,166,255,0.04)}
  .mono{font-family:'SF Mono',Consolas,monospace;font-size:11px;color:#8b949e}
  .badge-pill{display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;
    font-weight:600;border:1px solid;white-space:nowrap}
  .empty{text-align:center;padding:40px;color:#8b949e;font-style:italic}
  /* Print button */
  .actions{text-align:center;margin-top:24px}
  .btn-print{background:#238636;color:#fff;border:none;border-radius:8px;
    padding:10px 24px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
  .btn-print:hover{background:#2ea043}
  /* Footer */
  .footer{margin-top:20px;text-align:center;font-size:11px;color:#484f58}
  @media print{
    body{background:#fff;color:#000}
    .page{padding:0}
    .actions{display:none}
    .report-header{background:#f6f8fa;border-color:#d0d7de;color:#24292f}
    .report-title,.report-meta strong,.kpi-val{color:inherit}
    .report-sub,.report-meta,.kpi-label,.record-count{color:#57606a}
    .kpi{background:#f6f8fa;border-color:#d0d7de}
    .table-wrap{background:#fff;border-color:#d0d7de}
    th{background:#f6f8fa;color:#57606a;border-color:#d0d7de}
    td{border-color:#d0d7de;color:#24292f}
    tr.odd td{background:#f6f8fa}
  }
</style>
</head>
<body>
<div class="page">
  <div class="report-header">
    <div>
      <div class="logo">SOC CYBER MANAGEMENT</div>
      <div class="report-title">${title}</div>
      <div class="report-sub">${subtitle}</div>
    </div>
    <div class="report-meta">
      <div>Generated: <strong>${generated}</strong></div>
      <div>Records: <strong>${rows.length}</strong></div>
    </div>
  </div>

  <div class="kpi-row">${statsHtml}</div>

  <div class="table-wrap">
    <div class="table-header">
      <h3>Report Data</h3>
      <span class="record-count"><strong>${rows.length}</strong> records</span>
    </div>
    <div style="overflow-x:auto">
      <table>
        <thead><tr>${theadHtml}</tr></thead>
        <tbody>${tbodyHtml}${emptyRow}</tbody>
      </table>
    </div>
  </div>

  <div class="actions">
    <button class="btn-print" onclick="window.print()">🖨 Print / Save as PDF</button>
  </div>

  <div class="footer">Cyber Management SOC System &mdash; ${generated}</div>
</div>
</body>
</html>`;
}

function downloadHTML(filename: string, html: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.html`;
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
  const [loans, setLoans] = useState<Loan[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [analysts, setAnalysts] = useState<Analyst[]>([]);

  const today = new Date().toISOString().split('T')[0];
  const d30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const [incF, setIncF] = useState({ dateFrom: d30, dateTo: today, severity: '', status: '', category: '' });
  const [taskF, setTaskF] = useState({ dateFrom: d30, dateTo: today, status: '', priority: '' });
  const [cveF, setCveF] = useState({ dateFrom: '', dateTo: '', cvssMin: '', cvssMax: '', exploit: '' });
  const [sysF, setSysF] = useState({ status: '', category: '' });
  const [evtF, setEvtF] = useState({ dateFrom: '', dateTo: '', type: '', status: '' });
  const [actF, setActF] = useState({ dateFrom: d30, dateTo: today, module: '', userId: '' });
  const [loanF, setLoanF] = useState({ dateFrom: '', dateTo: '', status: '', itemType: '', borrower: '' });
  const [shiftF, setShiftF] = useState({ weekAnchor: today, analystId: '', shiftType: '' });

  useEffect(() => {
    eventsApi.getAll().then(setSpecialEvents);
    usersApi.getAll().then(setUsers);
    inventoryApi.getLoans().then(setLoans);
    analystsApi.getAll().then(setAnalysts);
  }, []);

  useEffect(() => {
    if (reportType !== 'shifts') return;
    const { from, to } = getWeekBounds(shiftF.weekAnchor);
    analystsApi.getShifts(from, to).then(setShifts);
  }, [reportType, shiftF.weekAnchor]);

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

  const fLoan = useMemo(() => loans.filter(l =>
    inRange(l.loanedAt, loanF.dateFrom, loanF.dateTo) &&
    (!loanF.status || l.status === loanF.status) &&
    (!loanF.itemType || l.itemType === loanF.itemType) &&
    (!loanF.borrower || l.borrowerName.toLowerCase().includes(loanF.borrower.toLowerCase()))
  ), [loans, loanF]);

  const weekBounds = useMemo(() => getWeekBounds(shiftF.weekAnchor), [shiftF.weekAnchor]);
  const analystMap = useMemo(() => {
    const m: Record<number, string> = {};
    analysts.forEach(a => { m[a.id!] = a.name; });
    return m;
  }, [analysts]);

  const fShift = useMemo(() => shifts.filter(s =>
    (!shiftF.analystId || String(s.analystId) === shiftF.analystId) &&
    (!shiftF.shiftType || s.shiftType === shiftF.shiftType)
  ).sort((a, b) => a.date.localeCompare(b.date) || ['morning','afternoon','night'].indexOf(a.shiftType) - ['morning','afternoon','night'].indexOf(b.shiftType)),
  [shifts, shiftF.analystId, shiftF.shiftType]);

  const actModules = useMemo(() => [...new Set(activityLogs.map(l => l.module))].sort(), [activityLogs]);
  const incCategories = useMemo(() => [...new Set(incidents.map(i => i.category))].sort(), [incidents]);
  const sysCats = useMemo(() => [...new Set(systems.map(s => s.category))].sort(), [systems]);

  const resultCount = { incidents: fInc.length, tasks: fTask.length, cves: fCve.length, systems: fSys.length, events: fEvt.length, activity: fAct.length, loans: fLoan.length, shifts: fShift.length }[reportType];

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
      case 'loans':
        exportCSV('loans-history', fLoan.map(l => ({
          'פריט': l.itemName || '', 'סוג': l.itemType ? (INVENTORY_TYPE_LABELS as Record<string,string>)[l.itemType] || l.itemType : '',
          'מספר סידורי': l.itemSerial || '', 'שואל': l.borrowerName,
          'ת.ז.': l.borrowerId || '', 'מחלקה': (l as any).department || '',
          'מטרה': l.purpose || '', 'תאריך השאלה': l.loanedAt.slice(0, 10),
          'יעד החזרה': l.expectedReturn || '', 'הוחזר': l.returnedAt?.slice(0, 10) || '',
          'סטטוס': LOAN_STATUS_LABELS[l.status],
        })));
        break;
      case 'shifts':
        exportCSV('shifts-weekly', fShift.map(s => ({
          'תאריך': s.date,
          'יום': DAY_NAMES[new Date(s.date + 'T12:00:00').getDay()],
          'משמרת': SHIFT_TYPE_LABELS[s.shiftType] || s.shiftType,
          'אנליסט': analystMap[s.analystId] || String(s.analystId),
          'שעת התחלה': s.startTime || '',
          'שעת סיום': s.endTime || '',
          'הערות': s.notes || '',
        })));
        break;
    }
  };

  const handleExportHTML = () => {
    const gen  = new Date().toLocaleString('he-IL');
    const stat = summaryStats;

    const SEV_COLOR: Record<string, string> = {
      critical: '#f85149', high: '#d29922', medium: '#f59e0b', low: '#3fb950', info: '#8b949e',
    };
    const STATUS_COLOR: Record<string, string> = {
      online: '#3fb950', degraded: '#d29922', offline: '#f85149',
      open: '#d29922', in_progress: '#58a6ff', pending: '#8b949e',
      closed: '#3fb950', false_positive: '#484f58',
      todo: '#8b949e', review: '#a371f7', done: '#3fb950',
      active: '#3fb950', returned: '#8b949e', overdue: '#f85149',
      planned: '#d29922', completed: '#8b949e', cancelled: '#f85149',
    };

    switch (reportType) {
      case 'incidents':
        downloadHTML('incidents', buildHtmlDoc(
          'דוח אירועים', `${fInc.length} אירועים בטווח ${incF.dateFrom || '—'} עד ${incF.dateTo || '—'}`, gen, stat,
          ['מספר', 'כותרת', 'חומרה', 'סטטוס', 'קטגוריה', 'מקור', 'נפתח', 'נסגר'],
          fInc.map(i => [
            { text: i.incidentNumber, mono: true },
            i.title,
            { text: SEVERITY_LABELS[i.severity], color: SEV_COLOR[i.severity], badge: true },
            { text: INCIDENT_STATUS_LABELS[i.status], color: STATUS_COLOR[i.status], badge: true },
            i.category,
            i.source || '—',
            i.createdAt.slice(0, 10),
            i.closedAt?.slice(0, 10) || '—',
          ])
        ));
        break;

      case 'tasks':
        downloadHTML('tasks', buildHtmlDoc(
          'דוח משימות', `${fTask.length} משימות`, gen, stat,
          ['כותרת', 'עדיפות', 'סטטוס', 'תאריך יצירה', 'תאריך יעד'],
          fTask.map(t => [
            t.title,
            { text: TASK_PRIORITY_LABELS[t.priority], color: t.priority === 'urgent' ? '#f85149' : t.priority === 'high' ? '#d29922' : '#8b949e', badge: true },
            { text: TASK_STATUS_LABELS[t.status], color: STATUS_COLOR[t.status] || '#8b949e', badge: true },
            t.createdAt.slice(0, 10),
            t.dueDate || '—',
          ])
        ));
        break;

      case 'cves':
        downloadHTML('cves', buildHtmlDoc(
          'דוח CVEs', `${fCve.length} פגיעויות`, gen, stat,
          ['CVE ID', 'CVSS', 'Exploit', 'נגלה', 'דרך טיפול', 'תיאור'],
          fCve.map(c => {
            const score = c.cvssScore ?? 0;
            const scoreColor = score >= 9 ? '#f85149' : score >= 7 ? '#d29922' : score >= 4 ? '#f59e0b' : '#3fb950';
            return [
              { text: c.cveId, mono: true, color: '#58a6ff' },
              { text: c.cvssScore?.toFixed(1) ?? '—', color: scoreColor, badge: true },
              { text: c.exploitAvailable ? '⚠ Yes' : '✓ No', color: c.exploitAvailable ? '#f85149' : '#3fb950', badge: true },
              c.discoveredAt.slice(0, 10),
              c.treatmentMethod || '—',
              c.description,
            ];
          })
        ));
        break;

      case 'systems':
        downloadHTML('systems', buildHtmlDoc(
          'דוח מערכות', `${fSys.length} מערכות`, gen, stat,
          ['שם מערכת', 'קטגוריה', 'סטטוס', 'בדיקה אחרונה', 'בעלים', 'תדירות'],
          fSys.map(s => [
            s.name,
            s.category,
            { text: s.currentStatus === 'online' ? 'תקין' : s.currentStatus === 'offline' ? 'לא זמין' : 'מדורדר', color: STATUS_COLOR[s.currentStatus], badge: true },
            s.lastChecked?.slice(0, 10) || '—',
            s.owner || '—',
            s.checkFrequency === 'hourly' ? 'שעתי' : s.checkFrequency === 'daily' ? 'יומי' : 'שבועי',
          ])
        ));
        break;

      case 'events':
        downloadHTML('events', buildHtmlDoc(
          'אירועים מיוחדים', `${fEvt.length} אירועים`, gen, stat,
          ['שם', 'סוג', 'סטטוס', 'תחילה', 'סיום', 'תיאור'],
          fEvt.map(e => [
            e.name,
            SPECIAL_EVENT_TYPE_LABELS[e.type],
            { text: e.status === 'planned' ? 'מתוכנן' : e.status === 'active' ? 'פעיל' : e.status === 'completed' ? 'הושלם' : 'בוטל', color: STATUS_COLOR[e.status], badge: true },
            e.startDate,
            e.endDate || '—',
            e.description || '—',
          ])
        ));
        break;

      case 'activity':
        downloadHTML('activity', buildHtmlDoc(
          'לוג פעולות', `${fAct.length} רשומות`, gen, stat,
          ['משתמש', 'פעולה', 'מודול', 'פרטים', 'זמן'],
          fAct.map(l => [
            l.username || '—',
            l.action,
            { text: l.module, color: '#58a6ff' },
            l.details || '—',
            { text: l.timestamp.slice(0, 19).replace('T', ' '), mono: true },
          ])
        ));
        break;

      case 'loans':
        downloadHTML('loans-history', buildHtmlDoc(
          'היסטוריית השאלות', `${fLoan.length} רשומות`, gen, stat,
          ['פריט', 'סוג', 'מ"ס', 'שואל', 'ת.ז.', 'מטרה', 'תאריך השאלה', 'יעד החזרה', 'הוחזר', 'סטטוס'],
          fLoan.map(l => [
            l.itemName || '—',
            l.itemType ? (INVENTORY_TYPE_LABELS as Record<string,string>)[l.itemType] || l.itemType : '—',
            { text: l.itemSerial || '—', mono: true },
            l.borrowerName,
            l.borrowerId || '—',
            l.purpose || '—',
            l.loanedAt.slice(0, 10),
            l.expectedReturn || '—',
            l.returnedAt?.slice(0, 10) || '—',
            { text: LOAN_STATUS_LABELS[l.status], color: STATUS_COLOR[l.status], badge: true },
          ])
        ));
        break;
      case 'shifts': {
        const { from, to } = weekBounds;
        const sun2 = new Date(from + 'T12:00:00');
        const weekDaysHtml = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(sun2); d.setDate(sun2.getDate() + i);
          return d.toISOString().split('T')[0];
        });
        const gridHtml: Record<string, Record<string, string[]>> = { morning: {}, afternoon: {}, night: {} };
        fShift.forEach(s => {
          if (!gridHtml[s.shiftType][s.date]) gridHtml[s.shiftType][s.date] = [];
          gridHtml[s.shiftType][s.date].push(analystMap[s.analystId] || `#${s.analystId}`);
        });
        const SHIFT_HOURS_H: Record<string, string> = { morning: '07:00–15:00', afternoon: '15:00–23:00', night: '23:00–07:00' };
        const SHIFT_COLOR_H: Record<string, string> = { morning: '#f59e0b', afternoon: '#58a6ff', night: '#a371f7' };
        const headCols = weekDaysHtml.map(date => {
          const dn = DAY_NAMES[new Date(date + 'T12:00:00').getDay()];
          return `<th style="padding:10px 14px;text-align:center;font-size:11px;color:#8b949e;font-weight:600;background:#0d1117;border-bottom:1px solid #30363d;min-width:110px"><div style="font-weight:700;color:#e6edf3">${dn}</div><div style="font-size:10px;margin-top:2px">${date.slice(5)}</div></th>`;
        }).join('');
        const bodyRows = (['morning', 'afternoon', 'night'] as const).map(st => {
          const color = SHIFT_COLOR_H[st];
          const firstCell = `<td style="padding:10px 14px;font-size:12px;border-bottom:1px solid #21262d;background:${color}18;border-left:3px solid ${color};white-space:nowrap"><span style="font-weight:700;color:${color}">${SHIFT_TYPE_LABELS[st]}</span><br/><span style="font-size:10px;color:#8b949e;font-family:monospace">${SHIFT_HOURS_H[st]}</span></td>`;
          const dayCells = weekDaysHtml.map(date => {
            const names = gridHtml[st][date] || [];
            const inner = names.length === 0
              ? '<span style="color:#484f58;font-size:11px">—</span>'
              : names.map(n => `<div style="font-size:12px;font-weight:600;color:#e6edf3;background:${color}22;border-radius:6px;padding:2px 8px;margin-bottom:3px">${n}</div>`).join('');
            return `<td style="padding:10px 8px;text-align:center;border-bottom:1px solid #21262d;vertical-align:middle;background:${names.length ? color + '08' : 'transparent'}">${inner}</td>`;
          }).join('');
          return `<tr>${firstCell}${dayCells}</tr>`;
        }).join('');
        const statsHtml2 = stat.map(s => `<div class="kpi"><div class="kpi-val" style="color:${s.color}">${s.value}</div><div class="kpi-label">${s.label}</div></div>`).join('');
        const shiftGridHtml = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="UTF-8"/><title>דוח משמרות שבועי</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0d1117;color:#e6edf3;direction:rtl;font-size:13px}
  .page{max-width:1200px;margin:0 auto;padding:32px 24px}
  .report-header{background:linear-gradient(135deg,#161b22,#1a2332);border:1px solid #30363d;border-radius:12px;padding:28px 32px;margin-bottom:24px;display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px}
  .logo{font-size:11px;font-weight:700;letter-spacing:1px;color:#58a6ff;background:rgba(88,166,255,0.1);border:1px solid rgba(88,166,255,0.3);border-radius:6px;padding:4px 10px;display:inline-block;margin-bottom:8px}
  .report-title{font-size:22px;font-weight:800;color:#e6edf3;margin-bottom:4px}
  .report-sub{font-size:13px;color:#8b949e}
  .report-meta{text-align:left;font-size:12px;color:#8b949e;line-height:1.8}
  .report-meta strong{color:#58a6ff}
  .kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin-bottom:24px}
  .kpi{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:16px 20px;text-align:center}
  .kpi-val{font-size:28px;font-weight:800;margin-bottom:4px}
  .kpi-label{font-size:11px;color:#8b949e;font-weight:500}
  .table-wrap{background:#161b22;border:1px solid #30363d;border-radius:12px;overflow:hidden}
  .table-header{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid #30363d}
  .table-header h3{font-size:13px;font-weight:700;color:#e6edf3}
  table{width:100%;border-collapse:collapse}
  th{padding:10px 14px;text-align:right;font-size:11px;color:#8b949e;font-weight:600;background:#0d1117;border-bottom:1px solid #30363d}
  .actions{text-align:center;margin-top:24px}
  .btn-print{background:#238636;color:#fff;border:none;border-radius:8px;padding:10px 24px;font-size:13px;font-weight:600;cursor:pointer}
  .footer{margin-top:20px;text-align:center;font-size:11px;color:#484f58}
  @media print{body{background:#fff;color:#000}.page{padding:0}.actions{display:none}}
</style></head>
<body><div class="page">
  <div class="report-header">
    <div><div class="logo">SOC CYBER MANAGEMENT</div><div class="report-title">דוח משמרות שבועי</div><div class="report-sub">שבוע ${from} — ${to}</div></div>
    <div class="report-meta"><div>Generated: <strong>${gen}</strong></div><div>משמרות: <strong>${fShift.length}</strong></div></div>
  </div>
  <div class="kpi-row">${statsHtml2}</div>
  <div class="table-wrap">
    <div class="table-header"><h3>סידור משמרות</h3><span style="font-size:12px;color:#8b949e">${from} — ${to}</span></div>
    <div style="overflow-x:auto"><table>
      <thead><tr><th style="padding:10px 14px;text-align:right;font-size:11px;color:#8b949e;font-weight:600;background:#0d1117;border-bottom:1px solid #30363d;min-width:110px">משמרת</th>${headCols}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table></div>
  </div>
  <div class="actions"><button class="btn-print" onclick="window.print()">🖨 Print / Save as PDF</button></div>
  <div class="footer">Cyber Management SOC System &mdash; ${gen}</div>
</div></body></html>`;
        downloadHTML('shifts-weekly', shiftGridHtml);
        break;
      }
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
    if (reportType === 'activity') {
      return [{ label: 'רשומות', value: fAct.length, color: 'var(--accent-primary)' }];
    }
    if (reportType === 'loans') {
      return [
        { label: 'סה"כ', value: fLoan.length, color: 'var(--accent-primary)' },
        { label: 'בהשאלה', value: fLoan.filter(l => l.status === 'active').length, color: 'var(--accent-warning)' },
        { label: 'באיחור', value: fLoan.filter(l => l.status === 'overdue').length, color: 'var(--accent-danger)' },
        { label: 'הוחזרו', value: fLoan.filter(l => l.status === 'returned').length, color: 'var(--accent-success)' },
      ];
    }
    if (reportType === 'shifts') {
      return [
        { label: 'סה"כ', value: fShift.length, color: 'var(--accent-primary)' },
        { label: 'בוקר', value: fShift.filter(s => s.shiftType === 'morning').length, color: '#f59e0b' },
        { label: 'צהריים', value: fShift.filter(s => s.shiftType === 'afternoon').length, color: '#58a6ff' },
        { label: 'לילה', value: fShift.filter(s => s.shiftType === 'night').length, color: '#a371f7' },
      ];
    }
    return [{ label: 'רשומות', value: fAct.length, color: 'var(--accent-primary)' }];
  }, [reportType, fInc, fTask, fCve, fSys, fEvt, fAct, fLoan, fShift]);

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

                {/* ── Loans filters ── */}
                {reportType === 'loans' && (<>
                  <div>
                    <label style={labelSt}>מתאריך השאלה</label>
                    <input type="date" style={inputSt} value={loanF.dateFrom} onChange={e => setLoanF(f => ({ ...f, dateFrom: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelSt}>עד תאריך</label>
                    <input type="date" style={inputSt} value={loanF.dateTo} onChange={e => setLoanF(f => ({ ...f, dateTo: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelSt}>סטטוס</label>
                    <select style={inputSt} value={loanF.status} onChange={e => setLoanF(f => ({ ...f, status: e.target.value }))}>
                      <option value="">הכל</option>
                      <option value="active">בהשאלה</option>
                      <option value="overdue">באיחור</option>
                      <option value="returned">הוחזר</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelSt}>סוג ציוד</label>
                    <select style={inputSt} value={loanF.itemType} onChange={e => setLoanF(f => ({ ...f, itemType: e.target.value }))}>
                      <option value="">הכל</option>
                      {Object.entries(INVENTORY_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelSt}>שם שואל</label>
                    <input style={{ ...inputSt, width: '140px' }} value={loanF.borrower} placeholder="חיפוש..." onChange={e => setLoanF(f => ({ ...f, borrower: e.target.value }))} />
                  </div>
                </>)}

                {/* ── Shifts filters ── */}
                {reportType === 'shifts' && (<>
                  <div>
                    <label style={labelSt}>שבוע (בחר תאריך בשבוע)</label>
                    <input type="date" style={inputSt} value={shiftF.weekAnchor} onChange={e => setShiftF(f => ({ ...f, weekAnchor: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '6px', padding: '7px 10px', whiteSpace: 'nowrap' }}>
                      {weekBounds.from} — {weekBounds.to}
                    </span>
                  </div>
                  <div>
                    <label style={labelSt}>אנליסט</label>
                    <select style={inputSt} value={shiftF.analystId} onChange={e => setShiftF(f => ({ ...f, analystId: e.target.value }))}>
                      <option value="">הכל</option>
                      {analysts.filter(a => a.status === 'active').map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelSt}>סוג משמרת</label>
                    <select style={inputSt} value={shiftF.shiftType} onChange={e => setShiftF(f => ({ ...f, shiftType: e.target.value }))}>
                      <option value="">הכל</option>
                      <option value="morning">בוקר</option>
                      <option value="afternoon">צהריים</option>
                      <option value="night">לילה</option>
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
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Download size={13} />}
                  onClick={handleExport}
                  disabled={!resultCount}
                >
                  ייצוא CSV
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Download size={13} />}
                  onClick={handleExportHTML}
                  disabled={!resultCount}
                >
                  ייצוא HTML
                </Button>
              </div>
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

              {reportType === 'loans' && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['פריט', 'סוג', 'מ"ס', 'שואל', 'ת.ז.', 'מטרה', 'תאריך השאלה', 'יעד החזרה', 'הוחזר בפועל', 'סטטוס'].map(h => <th key={h} style={thSt}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {fLoan.map(l => {
                      const statusColor = l.status === 'returned' ? 'var(--accent-success)' : l.status === 'overdue' ? 'var(--accent-danger)' : 'var(--accent-warning)';
                      const isOverdue = l.status === 'overdue' || (l.status === 'active' && l.expectedReturn && l.expectedReturn < new Date().toISOString().split('T')[0]);
                      return (
                        <tr key={l.id} className="hover:bg-[var(--bg-hover)]">
                          <td style={{ ...tdSt, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{l.itemName || '—'}</td>
                          <td style={tdSt}>{l.itemType ? (INVENTORY_TYPE_LABELS as Record<string,string>)[l.itemType] || l.itemType : '—'}</td>
                          <td style={{ ...tdSt, fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{l.itemSerial || '—'}</td>
                          <td style={{ ...tdSt, whiteSpace: 'nowrap' }}>{l.borrowerName}</td>
                          <td style={{ ...tdSt, fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--text-muted)' }}>{l.borrowerId || '—'}</td>
                          <td style={{ ...tdSt, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.purpose || '—'}</td>
                          <td style={{ ...tdSt, whiteSpace: 'nowrap' }}>{l.loanedAt.slice(0, 10)}</td>
                          <td style={{ ...tdSt, whiteSpace: 'nowrap', color: isOverdue ? 'var(--accent-danger)' : 'var(--text-primary)' }}>{l.expectedReturn || '—'}</td>
                          <td style={{ ...tdSt, whiteSpace: 'nowrap', color: l.returnedAt ? 'var(--accent-success)' : 'var(--text-muted)' }}>{l.returnedAt?.slice(0, 10) || '—'}</td>
                          <td style={tdSt}>
                            <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: `${statusColor}20`, color: statusColor }}>
                              {LOAN_STATUS_LABELS[l.status]}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {reportType === 'shifts' && (() => {
                const sun = new Date(weekBounds.from + 'T12:00:00');
                const weekDays = Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(sun); d.setDate(sun.getDate() + i);
                  return d.toISOString().split('T')[0];
                });
                const grid: Record<string, Record<string, string[]>> = { morning: {}, afternoon: {}, night: {} };
                fShift.forEach(s => {
                  if (!grid[s.shiftType][s.date]) grid[s.shiftType][s.date] = [];
                  grid[s.shiftType][s.date].push(analystMap[s.analystId] || `#${s.analystId}`);
                });
                const SHIFT_HOURS: Record<string, string> = { morning: '07:00–15:00', afternoon: '15:00–23:00', night: '23:00–07:00' };
                return (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ ...thSt, width: '110px' }}>משמרת</th>
                        {weekDays.map(date => {
                          const isToday = date === today;
                          return (
                            <th key={date} style={{ ...thSt, textAlign: 'center', minWidth: '110px', background: isToday ? 'rgba(88,166,255,0.08)' : undefined }}>
                              <div style={{ fontWeight: 700, color: isToday ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                                {DAY_NAMES[new Date(date + 'T12:00:00').getDay()]}
                              </div>
                              <div style={{ fontSize: '10px', color: isToday ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>
                                {date.slice(5).replace('-', '/')}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {(['morning', 'afternoon', 'night'] as const).map(shiftType => {
                        const color = SHIFT_TYPE_COLOR[shiftType];
                        return (
                          <tr key={shiftType}>
                            <td style={{ ...tdSt, verticalAlign: 'middle', background: `${color}10`, borderLeft: `3px solid ${color}` }}>
                              <span style={{ display: 'block', fontWeight: 700, fontSize: '12px', color }}>{SHIFT_TYPE_LABELS[shiftType]}</span>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{SHIFT_HOURS[shiftType]}</span>
                            </td>
                            {weekDays.map(date => {
                              const names = grid[shiftType][date] || [];
                              const isToday = date === today;
                              return (
                                <td key={date} style={{ ...tdSt, textAlign: 'center', verticalAlign: 'middle', padding: '10px 8px', background: isToday ? 'rgba(88,166,255,0.04)' : names.length ? `${color}06` : undefined, minHeight: '60px' }}>
                                  {names.length === 0
                                    ? <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>
                                    : names.map((name, i) => (
                                      <div key={i} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', padding: '2px 6px', borderRadius: '6px', background: `${color}18`, marginBottom: i < names.length - 1 ? '4px' : 0 }}>{name}</div>
                                    ))
                                  }
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}

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

              {resultCount === 0 && reportType !== 'shifts' && (
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
