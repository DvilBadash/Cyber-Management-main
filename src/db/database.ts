import Dexie, { type Table } from 'dexie';
import type {
  User, Permission, ActivityLog,
  Incident, IncidentAction, IncidentAsset,
  Task, TaskComment, TaskChecklistItem,
  Analyst, Shift, ShiftHandover, HandoverItem,
  MonitoredSystem, SystemCheck, SystemDowntime,
  CVE, CVEAsset,
  SpecialEvent, EventParticipant,
  SystemSetting, TickerMessage, EmergencyBanner,
  DailyCheckSession,
  Playbook, PlaybookItem, IncidentChecklistItem,
} from '../types';
import { INCIDENT_CATEGORIES, INCIDENT_SOURCES, SYSTEM_CATEGORIES } from '../types';

export class CyberManagementDB extends Dexie {
  users!: Table<User, number>;
  permissions!: Table<Permission, number>;
  activityLog!: Table<ActivityLog, number>;

  incidents!: Table<Incident, number>;
  incidentActions!: Table<IncidentAction, number>;
  incidentAssets!: Table<IncidentAsset, number>;

  tasks!: Table<Task, number>;
  taskComments!: Table<TaskComment, number>;
  taskChecklist!: Table<TaskChecklistItem, number>;

  analysts!: Table<Analyst, number>;
  shifts!: Table<Shift, number>;
  shiftHandovers!: Table<ShiftHandover, number>;
  handoverItems!: Table<HandoverItem, number>;

  systems!: Table<MonitoredSystem, number>;
  systemChecks!: Table<SystemCheck, number>;
  systemDowntime!: Table<SystemDowntime, number>;

  cves!: Table<CVE, number>;
  cveAssets!: Table<CVEAsset, number>;

  specialEvents!: Table<SpecialEvent, number>;
  eventParticipants!: Table<EventParticipant, number>;

  systemSettings!: Table<SystemSetting, string>;
  tickerMessages!: Table<TickerMessage, number>;
  emergencyBanners!: Table<EmergencyBanner, number>;
  dailyCheckSessions!: Table<DailyCheckSession, number>;

  playbooks!: Table<Playbook, number>;
  playbookItems!: Table<PlaybookItem, number>;
  incidentChecklists!: Table<IncidentChecklistItem, number>;

  constructor() {
    super('CyberManagementDB');

    this.version(1).stores({
      users: '++id, username, email, role, isActive',
      permissions: '++id, userId, module',
      activityLog: '++id, userId, module, timestamp',

      incidents: '++id, incidentNumber, severity, status, category, analystId, createdAt',
      incidentActions: '++id, incidentId, timestamp',
      incidentAssets: '++id, incidentId',

      tasks: '++id, status, priority, assigneeId, incidentId, dueDate, createdAt',
      taskComments: '++id, taskId, createdAt',
      taskChecklist: '++id, taskId',

      analysts: '++id, name, status',
      shifts: '++id, analystId, shiftType, date',
      shiftHandovers: '++id, createdAt',
      handoverItems: '++id, handoverId, type',

      systems: '++id, name, category, isActive, currentStatus',
      systemChecks: '++id, systemId, checkedAt',
      systemDowntime: '++id, systemId, startTime',

      cves: '++id, cveId, cvssScore, discoveredAt',
      cveAssets: '++id, cveId, status',

      specialEvents: '++id, type, status, startDate',
      eventParticipants: '++id, eventId, userId',

      systemSettings: 'key',
      tickerMessages: '++id, isActive, order',
      emergencyBanners: '++id, isActive',
    });

    this.version(2).stores({
      dailyCheckSessions: '++id, date, checkedBy',
    });

    this.version(3).stores({
      playbooks: '++id, name, category, isActive',
      playbookItems: '++id, playbookId, order',
      incidentChecklists: '++id, incidentId, order',
    });
  }
}

export const db = new CyberManagementDB();

// ===== SEED DATA =====

export async function seedDatabase() {
  const userCount = await db.users.count();
  if (userCount > 0) return; // Already seeded

  const now = new Date().toISOString();

  // Users
  await db.users.bulkAdd([
    {
      fullName: 'אדמין מערכת',
      username: 'admin',
      passwordHash: 'hashed_admin123',
      email: 'admin@soc.local',
      role: 'admin',
      department: 'IT Security',
      isActive: true,
      createdAt: now,
      lastLogin: now,
    },
    {
      fullName: 'דנה כהן',
      username: 'dana.cohen',
      passwordHash: 'hashed_pass',
      email: 'dana@soc.local',
      role: 'team_lead',
      department: 'SOC',
      isActive: true,
      createdAt: now,
      lastLogin: now,
    },
    {
      fullName: 'יוסי לוי',
      username: 'yossi.levi',
      passwordHash: 'hashed_pass',
      email: 'yossi@soc.local',
      role: 'senior_analyst',
      department: 'SOC',
      isActive: true,
      createdAt: now,
    },
    {
      fullName: 'מיכל ברק',
      username: 'michal.barak',
      passwordHash: 'hashed_pass',
      email: 'michal@soc.local',
      role: 'analyst',
      department: 'SOC',
      isActive: true,
      createdAt: now,
    },
    {
      fullName: 'אביב שמש',
      username: 'aviv.shemesh',
      passwordHash: 'hashed_pass',
      email: 'aviv@soc.local',
      role: 'analyst',
      department: 'SOC',
      isActive: true,
      createdAt: now,
    },
  ]);

  // Analysts
  await db.analysts.bulkAdd([
    { name: 'דנה כהן', role: 'ראש צוות', email: 'dana@soc.local', status: 'active' },
    { name: 'יוסי לוי', role: 'אנליסט בכיר', email: 'yossi@soc.local', status: 'active' },
    { name: 'מיכל ברק', role: 'אנליסט', email: 'michal@soc.local', status: 'active' },
    { name: 'אביב שמש', role: 'אנליסט', email: 'aviv@soc.local', status: 'active' },
    { name: 'נועה גל', role: 'אנליסט', email: 'noa@soc.local', status: 'active' },
  ]);

  // Incidents
  const incidents = [
    {
      incidentNumber: 'INC-2026-0001',
      title: 'ניסיון Phishing לעובדים',
      description: 'זוהתה קמפיין פישינג מכוון לעובדי הארגון עם קישורים זדוניים',
      severity: 'high' as const,
      status: 'in_progress' as const,
      category: 'Phishing',
      source: 'SIEM',
      analystId: 2,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      tags: 'phishing,email,credentials',
    },
    {
      incidentNumber: 'INC-2026-0002',
      title: 'זיהוי Malware בתחנת קצה',
      description: 'EDR זיהה קוד זדוני בתחנת עבודה של עובד במחלקת כספים',
      severity: 'critical' as const,
      status: 'open' as const,
      category: 'Malware',
      source: 'EDR',
      analystId: 3,
      affectedAsset: 'WS-FIN-042',
      sourceIp: '10.1.2.42',
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    },
    {
      incidentNumber: 'INC-2026-0003',
      title: 'חיבור חריג מ-IP חיצוני',
      description: 'זוהה חיבור VPN חריג ממיקום גיאוגרפי לא מוכר',
      severity: 'medium' as const,
      status: 'open' as const,
      category: 'Intrusion',
      source: 'Firewall',
      analystId: 4,
      sourceIp: '185.220.101.45',
      destIp: '10.0.0.5',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      incidentNumber: 'INC-2026-0004',
      title: 'עלייה חריגה בתעבורת רשת',
      description: 'זוהתה עלייה של 400% בתעבורת יציאה בשעות הלילה',
      severity: 'high' as const,
      status: 'pending' as const,
      category: 'Data Breach',
      source: 'SIEM',
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      incidentNumber: 'INC-2026-0005',
      title: 'כשל אימות MFA',
      description: 'מספר ניסיונות כושלים לאימות MFA על חשבון מנהל',
      severity: 'medium' as const,
      status: 'closed' as const,
      category: 'Intrusion',
      source: 'SOC Analyst',
      rca: 'נמצא שמדובר בבעיית תצורה. המשתמש לא זוהה כאיום',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
      closedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    },
    {
      incidentNumber: 'INC-2026-0006',
      title: 'Ransomware בשרת קבצים',
      description: 'זוהתה פעילות הצפנה חשודה בשרת קבצים משותף',
      severity: 'critical' as const,
      status: 'in_progress' as const,
      category: 'Ransomware',
      source: 'EDR',
      affectedAsset: 'FS-PROD-01',
      analystId: 2,
      createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
  ];
  await db.incidents.bulkAdd(incidents);

  // Tasks
  await db.tasks.bulkAdd([
    { title: 'עדכון חתימות IDS', description: 'עדכון חתימות IDS לגרסה 23.4', priority: 'high', status: 'todo', taskType: 'one_time', assigneeId: 3, createdAt: now, updatedAt: now, dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() },
    { title: 'בדיקת לוגים - SIEM', description: 'בדיקת לוגי SIEM יומית', priority: 'normal', status: 'in_progress', taskType: 'recurring', recurrenceFrequency: 'daily', assigneeId: 4, createdAt: now, updatedAt: now },
    { title: 'תחקיר INC-2026-0002', description: 'תחקיר מלא לאירוע מלוור', priority: 'urgent', status: 'in_progress', taskType: 'one_time', assigneeId: 2, incidentId: 2, createdAt: now, updatedAt: now },
    { title: 'עדכון נהלי IR', description: 'עדכון נהלי תגובה לאירועים לגרסה 2026', priority: 'normal', status: 'review', taskType: 'one_time', assigneeId: 2, createdAt: now, updatedAt: now, dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() },
    { title: 'הדרכת צוות', description: 'הדרכת צוות על כלי SOAR חדש', priority: 'high', status: 'todo', taskType: 'one_time', assigneeId: 2, createdAt: now, updatedAt: now, dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() },
    { title: 'בדיקת תפוגת סיסמאות', description: 'בדיקה שחשבונות Service יש סיסמאות תקינות', priority: 'normal', status: 'done', taskType: 'recurring', recurrenceFrequency: 'monthly', assigneeId: 3, createdAt: now, updatedAt: now },
    { title: 'סקירת אירועי שבוע', description: 'סקירה שבועית של כל האירועים שנסגרו', priority: 'high', status: 'todo', taskType: 'recurring', recurrenceFrequency: 'weekly', assigneeId: 2, createdAt: now, updatedAt: now },
    { title: 'גיבוי לוגים לאחסון', description: 'ארכוב חודשי של לוגי SIEM לאחסון ארוך טווח', priority: 'normal', status: 'todo', taskType: 'recurring', recurrenceFrequency: 'monthly', assigneeId: 3, createdAt: now, updatedAt: now },
  ]);

  // Systems
  await db.systems.bulkAdd([
    { name: 'Microsoft Sentinel', category: 'SIEM', description: 'מערכת SIEM ראשית', owner: 'דנה כהן', checkFrequency: 'hourly', isActive: true, currentStatus: 'online', lastChecked: now },
    { name: 'CrowdStrike Falcon', category: 'EDR', description: 'פלטפורמת EDR', owner: 'יוסי לוי', checkFrequency: 'hourly', isActive: true, currentStatus: 'online', lastChecked: now },
    { name: 'Palo Alto NGFW', category: 'Firewall', description: 'חומת אש ראשית', owner: 'מיכל ברק', checkFrequency: 'daily', isActive: true, currentStatus: 'online', lastChecked: now },
    { name: 'Suricata IDS', category: 'IDS/IPS', description: 'מערכת זיהוי חדירות', owner: 'אביב שמש', checkFrequency: 'daily', isActive: true, currentStatus: 'degraded', lastChecked: now },
    { name: 'Splunk SOAR', category: 'SOAR', description: 'פלטפורמת אוטומציה', owner: 'דנה כהן', checkFrequency: 'daily', isActive: true, currentStatus: 'online', lastChecked: now },
    { name: 'Veeam Backup', category: 'Backup', description: 'מערכת גיבוי', owner: 'IT', checkFrequency: 'daily', isActive: true, currentStatus: 'offline', lastChecked: now },
    { name: 'Active Directory', category: 'Active Directory', description: 'שירות ספריה', owner: 'IT', checkFrequency: 'hourly', isActive: true, currentStatus: 'online', lastChecked: now },
  ]);

  // CVEs
  await db.cves.bulkAdd([
    { cveId: 'CVE-2025-0001', description: 'חולשת RCE קריטית ב-Apache Log4j', cvssScore: 10.0, cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H', publishedDate: '2025-12-10', discoveredAt: now, exploitAvailable: true },
    { cveId: 'CVE-2025-1234', description: 'SQL Injection בממשק ניהול', cvssScore: 9.8, cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', publishedDate: '2025-11-15', discoveredAt: now, exploitAvailable: true },
    { cveId: 'CVE-2025-5678', description: 'XSS מתמשך בפורטל לקוחות', cvssScore: 7.5, cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:N/A:N', publishedDate: '2025-10-20', discoveredAt: now, exploitAvailable: false },
    { cveId: 'CVE-2026-0123', description: 'Privilege Escalation בקרנל Windows', cvssScore: 8.8, cvssVector: 'CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:C/C:H/I:H/A:H', publishedDate: '2026-01-05', discoveredAt: now, exploitAvailable: false },
    { cveId: 'CVE-2025-9999', description: 'Buffer Overflow בדרייבר רשת', cvssScore: 6.5, cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H', publishedDate: '2025-09-30', discoveredAt: now, exploitAvailable: false },
  ]);

  // Special Events
  await db.specialEvents.bulkAdd([
    {
      name: 'תרגיל Red Team Q1 2026',
      type: 'red_team',
      description: 'תרגיל חדירה מתוכנן לבדיקת עמידות הארגון',
      objectives: 'בדיקת מנגנוני הזיהוי, בדיקת נהלי IR',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'planned',
      createdBy: 1,
      createdAt: now,
    },
    {
      name: 'תגובה לאירוע Ransomware',
      type: 'operation',
      description: 'מבצע תגובה לאירוע Ransomware פעיל',
      startDate: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      status: 'active',
      createdBy: 1,
      createdAt: now,
    },
  ]);

  // Ticker Messages
  await db.tickerMessages.bulkAdd([
    { content: 'מערכת מבצעית - כל המערכות פעילות', severity: 'info', order: 1, isActive: true, createdAt: now },
    { content: 'אזהרה: זוהתה פעילות חשודה ברשת - אנליסטים נא לבדוק', severity: 'high', order: 2, isActive: true, createdAt: now },
    { content: 'עדכון: CVE-2025-0001 - יש לעדכן Apache על כל השרתים', severity: 'critical', order: 3, isActive: true, createdAt: now },
    { content: 'תזכורת: ישיבת צוות יומית בשעה 09:00', severity: 'info', order: 4, isActive: true, createdAt: now },
  ]);

  // System Settings
  await db.systemSettings.bulkAdd([
    { key: 'system_name', value: 'מרכז פעולות סייבר' },
    { key: 'org_name', value: 'ארגון לדוגמה' },
    { key: 'theme', value: 'dark' },
    { key: 'timezone', value: 'Asia/Jerusalem' },
    { key: 'language', value: 'he' },
    { key: 'ticker_speed', value: '120' },
    { key: 'ticker_enabled', value: 'true' },
    { key: 'sla_critical', value: '15' },
    { key: 'sla_high', value: '60' },
    { key: 'sla_medium', value: '240' },
    { key: 'sla_low', value: '1440' },
    { key: 'incident_categories', value: JSON.stringify(INCIDENT_CATEGORIES) },
    { key: 'incident_sources', value: JSON.stringify(INCIDENT_SOURCES) },
    { key: 'system_categories', value: JSON.stringify(SYSTEM_CATEGORIES) },
  ]);

  // Shifts for current week
  const today = new Date();
  const analysts = await db.analysts.toArray();
  if (analysts.length >= 3) {
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - 3 + i);
      const dateStr = date.toISOString().split('T')[0];

      await db.shifts.bulkAdd([
        { analystId: analysts[0].id!, shiftType: 'morning', date: dateStr, startTime: '07:00', endTime: '15:00' },
        { analystId: analysts[1].id!, shiftType: 'afternoon', date: dateStr, startTime: '15:00', endTime: '23:00' },
        { analystId: analysts[2].id!, shiftType: 'night', date: dateStr, startTime: '23:00', endTime: '07:00' },
      ]);
    }
  }

  // System Checks
  const systemsList = await db.systems.toArray();
  for (const sys of systemsList) {
    await db.systemChecks.add({
      systemId: sys.id!,
      status: sys.currentStatus,
      checkedBy: 'מערכת',
      checkedAt: now,
      notes: 'בדיקה אוטומטית',
    });
  }

  // Playbooks
  const phishingId = await db.playbooks.add({ name: 'Phishing Response', category: 'Phishing', description: 'תגובה לאירוע פישינג', isActive: true, createdAt: now, updatedAt: now });
  await db.playbookItems.bulkAdd([
    { playbookId: phishingId, item: 'בדוק את הכתובת השולחת וודא שמדובר בפישינג', phase: 'זיהוי', order: 1 },
    { playbookId: phishingId, item: 'הכנס את הדומיין/כתובת למחולל ה-IOC', phase: 'זיהוי', order: 2 },
    { playbookId: phishingId, item: 'חסום את הדומיין הזדוני בשרת ה-DNS', phase: 'הכלה', order: 3 },
    { playbookId: phishingId, item: 'בדוק כמה משתמשים קיבלו את המייל', phase: 'הכלה', order: 4 },
    { playbookId: phishingId, item: 'הודע למשתמשים שקיבלו את המייל', phase: 'הכלה', order: 5 },
    { playbookId: phishingId, item: 'בדוק אם משתמש לחץ על הקישור ואסוף לוגים', phase: 'חקירה', order: 6 },
    { playbookId: phishingId, item: 'אפס סיסמאות למשתמשים שנפגעו', phase: 'תיקון', order: 7 },
    { playbookId: phishingId, item: 'תעד ממצאים וסגור אירוע', phase: 'סיום', order: 8 },
  ]);

  const malwareId = await db.playbooks.add({ name: 'Malware Incident Response', category: 'Malware', description: 'תגובה לאירוע מלוור', isActive: true, createdAt: now, updatedAt: now });
  await db.playbookItems.bulkAdd([
    { playbookId: malwareId, item: 'בודד את התחנה הנגועה מהרשת', phase: 'הכלה', order: 1 },
    { playbookId: malwareId, item: 'אסוף דגימה מה-EDR לניתוח', phase: 'זיהוי', order: 2 },
    { playbookId: malwareId, item: 'בדוק IOCs: Hash, IP, Domain', phase: 'זיהוי', order: 3 },
    { playbookId: malwareId, item: 'חפש תנועה לרוחב (Lateral Movement)', phase: 'חקירה', order: 4 },
    { playbookId: malwareId, item: 'בדוק persistence mechanisms ברישום ו-Scheduled Tasks', phase: 'חקירה', order: 5 },
    { playbookId: malwareId, item: 'הסר את המלוור וכל נקודות ה-Persistence', phase: 'תיקון', order: 6 },
    { playbookId: malwareId, item: 'בצע Reimaging לתחנה אם נדרש', phase: 'תיקון', order: 7 },
    { playbookId: malwareId, item: 'עדכן חתימות ב-EDR/AV', phase: 'תיקון', order: 8 },
    { playbookId: malwareId, item: 'תעד ממצאים ועדכן IOC Repository', phase: 'סיום', order: 9 },
  ]);

  const ransomwareId = await db.playbooks.add({ name: 'Ransomware Response', category: 'Ransomware', description: 'תגובה לאירוע Ransomware', isActive: true, createdAt: now, updatedAt: now });
  await db.playbookItems.bulkAdd([
    { playbookId: ransomwareId, item: 'נתק מיידית את כל הסגמנטים הנגועים מהרשת', phase: 'הכלה', order: 1 },
    { playbookId: ransomwareId, item: 'זהה את טיפוס ה-Ransomware וגרסתו', phase: 'זיהוי', order: 2 },
    { playbookId: ransomwareId, item: 'בדוק קיום גיבויים תקינים', phase: 'הכלה', order: 3 },
    { playbookId: ransomwareId, item: 'הודע להנהלה ולצוות ניהול המשבר', phase: 'הכלה', order: 4 },
    { playbookId: ransomwareId, item: 'הפסק את תהליכי ההצפנה הפעילים', phase: 'הכלה', order: 5 },
    { playbookId: ransomwareId, item: 'זהה את נקודת הכניסה הראשונית', phase: 'חקירה', order: 6 },
    { playbookId: ransomwareId, item: 'בדוק האם בוצעה גניבת מידע לפני ההצפנה', phase: 'חקירה', order: 7 },
    { playbookId: ransomwareId, item: 'שחזר ממערכת גיבוי תקינה', phase: 'תיקון', order: 8 },
    { playbookId: ransomwareId, item: 'סגור את נקודת הכניסה וחזק הגנות', phase: 'תיקון', order: 9 },
    { playbookId: ransomwareId, item: 'דווח לרגולטור אם נדרש (GDPR/SOX)', phase: 'סיום', order: 10 },
  ]);
}

// Ensure the immutable socadmin user always exists
export async function ensureSocAdmin() {
  const existing = await db.users.where('username').equals('socadmin').first();
  if (existing) return;
  const now = new Date().toISOString();
  await db.users.add({
    fullName: 'מנהל ראשי',
    username: 'socadmin',
    passwordHash: btoa('qw12!@'),
    email: 'socadmin@soc.local',
    role: 'admin',
    department: 'Management',
    isActive: true,
    createdAt: now,
    lastLogin: now,
  });
}
