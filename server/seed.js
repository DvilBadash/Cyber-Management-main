/**
 * Seed the database with initial data.
 * Only runs if the users table is empty.
 */
function seedDatabase(db) {
  const userCount = db.prepare(`SELECT COUNT(*) as c FROM users`).get().c;
  if (userCount > 0) return;

  console.log('[DB] Seeding initial data...');
  const now = new Date().toISOString();

  db.exec('BEGIN');
  try {

    // ── Users ─────────────────────────────────────────────────────────────
    const insertUser = db.prepare(`
      INSERT INTO users (fullName,username,passwordHash,email,role,department,isActive,createdAt,lastLogin)
      VALUES (@fullName,@username,@passwordHash,@email,@role,@department,@isActive,@createdAt,@lastLogin)
    `);
    const users = [
      { fullName: 'מנהל ראשי', username: 'socadmin', passwordHash: Buffer.from('qw12!@').toString('base64'), email: 'socadmin@soc.local', role: 'admin', department: 'Management', isActive: 1, createdAt: now, lastLogin: now },
      { fullName: 'אדמין מערכת', username: 'admin', passwordHash: Buffer.from('admin123').toString('base64'), email: 'admin@soc.local', role: 'admin', department: 'IT Security', isActive: 1, createdAt: now, lastLogin: now },
      { fullName: 'דנה כהן', username: 'dana.cohen', passwordHash: 'hashed_pass', email: 'dana@soc.local', role: 'team_lead', department: 'SOC', isActive: 1, createdAt: now, lastLogin: null },
      { fullName: 'יוסי לוי', username: 'yossi.levi', passwordHash: 'hashed_pass', email: 'yossi@soc.local', role: 'senior_analyst', department: 'SOC', isActive: 1, createdAt: now, lastLogin: null },
      { fullName: 'מיכל ברק', username: 'michal.barak', passwordHash: 'hashed_pass', email: 'michal@soc.local', role: 'analyst', department: 'SOC', isActive: 1, createdAt: now, lastLogin: null },
      { fullName: 'אביב שמש', username: 'aviv.shemesh', passwordHash: 'hashed_pass', email: 'aviv@soc.local', role: 'analyst', department: 'SOC', isActive: 1, createdAt: now, lastLogin: null },
    ];
    for (const u of users) insertUser.run(u);

    // ── Analysts ───────────────────────────────────────────────────────────
    const insertAnalyst = db.prepare(`INSERT INTO analysts (name,role,email,status) VALUES (?,?,?,?)`);
    insertAnalyst.run('דנה כהן', 'ראש צוות', 'dana@soc.local', 'active');
    insertAnalyst.run('יוסי לוי', 'אנליסט בכיר', 'yossi@soc.local', 'active');
    insertAnalyst.run('מיכל ברק', 'אנליסט', 'michal@soc.local', 'active');
    insertAnalyst.run('אביב שמש', 'אנליסט', 'aviv@soc.local', 'active');
    insertAnalyst.run('נועה גל', 'אנליסט', 'noa@soc.local', 'active');

    // ── Incidents ──────────────────────────────────────────────────────────
    const insertIncident = db.prepare(`
      INSERT INTO incidents (incidentNumber,title,description,severity,status,category,source,analystId,affectedAsset,sourceIp,destIp,rca,tags,createdAt,updatedAt,closedAt)
      VALUES (@incidentNumber,@title,@description,@severity,@status,@category,@source,@analystId,@affectedAsset,@sourceIp,@destIp,@rca,@tags,@createdAt,@updatedAt,@closedAt)
    `);
    const h = (n) => new Date(Date.now() - n * 60 * 1000).toISOString();
    insertIncident.run({ incidentNumber: 'INC-2026-0001', title: 'ניסיון Phishing לעובדים', description: 'זוהתה קמפיין פישינג', severity: 'high', status: 'in_progress', category: 'Phishing', source: 'SIEM', analystId: 3, affectedAsset: null, sourceIp: null, destIp: null, rca: null, tags: 'phishing,email', createdAt: h(120), updatedAt: h(30), closedAt: null });
    insertIncident.run({ incidentNumber: 'INC-2026-0002', title: 'זיהוי Malware בתחנת קצה', description: 'EDR זיהה קוד זדוני', severity: 'critical', status: 'open', category: 'Malware', source: 'EDR', analystId: 4, affectedAsset: 'WS-FIN-042', sourceIp: '10.1.2.42', destIp: null, rca: null, tags: null, createdAt: h(45), updatedAt: h(20), closedAt: null });
    insertIncident.run({ incidentNumber: 'INC-2026-0003', title: 'חיבור חריג מ-IP חיצוני', description: 'חיבור VPN חריג', severity: 'medium', status: 'open', category: 'Intrusion', source: 'Firewall', analystId: 5, affectedAsset: null, sourceIp: '185.220.101.45', destIp: '10.0.0.5', rca: null, tags: null, createdAt: h(180), updatedAt: h(180), closedAt: null });
    insertIncident.run({ incidentNumber: 'INC-2026-0004', title: 'עלייה חריגה בתעבורת רשת', description: 'עלייה 400% בתעבורת יציאה', severity: 'high', status: 'pending', category: 'Data Breach', source: 'SIEM', analystId: null, affectedAsset: null, sourceIp: null, destIp: null, rca: null, tags: null, createdAt: h(300), updatedAt: h(240), closedAt: null });
    insertIncident.run({ incidentNumber: 'INC-2026-0005', title: 'כשל אימות MFA', description: 'ניסיונות כושלים לאימות', severity: 'medium', status: 'closed', category: 'Intrusion', source: 'SOC Analyst', analystId: null, affectedAsset: null, sourceIp: null, destIp: null, rca: 'בעיית תצורה - לא איום', tags: null, createdAt: h(1440), updatedAt: h(1200), closedAt: h(1200) });
    insertIncident.run({ incidentNumber: 'INC-2026-0006', title: 'Ransomware בשרת קבצים', description: 'פעילות הצפנה חשודה', severity: 'critical', status: 'in_progress', category: 'Ransomware', source: 'EDR', analystId: 3, affectedAsset: 'FS-PROD-01', sourceIp: null, destIp: null, rca: null, tags: null, createdAt: h(90), updatedAt: h(10), closedAt: null });

    // ── Tasks ──────────────────────────────────────────────────────────────
    const insertTask = db.prepare(`
      INSERT INTO tasks (title,description,priority,status,taskType,recurrenceFrequency,assigneeId,assignedUserIds,dueDate,createdAt,updatedAt)
      VALUES (@title,@description,@priority,@status,@taskType,@recurrenceFrequency,@assigneeId,@assignedUserIds,@dueDate,@createdAt,@updatedAt)
    `);
    const d = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();
    insertTask.run({ title: 'עדכון חתימות IDS', description: 'עדכון IDS לגרסה 23.4', priority: 'high', status: 'todo', taskType: 'one_time', recurrenceFrequency: null, assigneeId: 4, assignedUserIds: null, dueDate: d(2), createdAt: now, updatedAt: now });
    insertTask.run({ title: 'בדיקת לוגים - SIEM', description: 'בדיקה יומית', priority: 'normal', status: 'in_progress', taskType: 'recurring', recurrenceFrequency: 'daily', assigneeId: 5, assignedUserIds: null, dueDate: null, createdAt: now, updatedAt: now });
    insertTask.run({ title: 'תחקיר INC-2026-0002', description: 'תחקיר מלא למלוור', priority: 'urgent', status: 'in_progress', taskType: 'one_time', recurrenceFrequency: null, assigneeId: 3, assignedUserIds: null, dueDate: null, createdAt: now, updatedAt: now });
    insertTask.run({ title: 'עדכון נהלי IR', description: 'עדכון נהלי תגובה', priority: 'normal', status: 'review', taskType: 'one_time', recurrenceFrequency: null, assigneeId: 3, assignedUserIds: null, dueDate: d(7), createdAt: now, updatedAt: now });
    insertTask.run({ title: 'הדרכת צוות SOAR', description: 'הדרכה על כלי SOAR חדש', priority: 'high', status: 'todo', taskType: 'one_time', recurrenceFrequency: null, assigneeId: 3, assignedUserIds: null, dueDate: d(5), createdAt: now, updatedAt: now });
    insertTask.run({ title: 'בדיקת תפוגת סיסמאות', description: 'בדיקת חשבונות Service', priority: 'normal', status: 'done', taskType: 'recurring', recurrenceFrequency: 'monthly', assigneeId: 4, assignedUserIds: null, dueDate: null, createdAt: now, updatedAt: now });
    insertTask.run({ title: 'סקירת אירועי שבוע', description: 'סקירה שבועית של אירועים', priority: 'high', status: 'todo', taskType: 'recurring', recurrenceFrequency: 'weekly', assigneeId: 3, assignedUserIds: null, dueDate: null, createdAt: now, updatedAt: now });
    insertTask.run({ title: 'גיבוי לוגים', description: 'ארכוב חודשי של לוגי SIEM', priority: 'normal', status: 'todo', taskType: 'recurring', recurrenceFrequency: 'monthly', assigneeId: 4, assignedUserIds: null, dueDate: null, createdAt: now, updatedAt: now });

    // ── Systems ────────────────────────────────────────────────────────────
    const insertSystem = db.prepare(`
      INSERT INTO systems (name,category,description,owner,checkFrequency,isActive,currentStatus,lastChecked)
      VALUES (@name,@category,@description,@owner,@checkFrequency,@isActive,@currentStatus,@lastChecked)
    `);
    insertSystem.run({ name: 'Microsoft Sentinel', category: 'SIEM', description: 'מערכת SIEM ראשית', owner: 'דנה כהן', checkFrequency: 'hourly', isActive: 1, currentStatus: 'online', lastChecked: now });
    insertSystem.run({ name: 'CrowdStrike Falcon', category: 'EDR', description: 'פלטפורמת EDR', owner: 'יוסי לוי', checkFrequency: 'hourly', isActive: 1, currentStatus: 'online', lastChecked: now });
    insertSystem.run({ name: 'Palo Alto NGFW', category: 'Firewall', description: 'חומת אש ראשית', owner: 'מיכל ברק', checkFrequency: 'daily', isActive: 1, currentStatus: 'online', lastChecked: now });
    insertSystem.run({ name: 'Suricata IDS', category: 'IDS/IPS', description: 'מערכת זיהוי חדירות', owner: 'אביב שמש', checkFrequency: 'daily', isActive: 1, currentStatus: 'degraded', lastChecked: now });
    insertSystem.run({ name: 'Splunk SOAR', category: 'SOAR', description: 'פלטפורמת אוטומציה', owner: 'דנה כהן', checkFrequency: 'daily', isActive: 1, currentStatus: 'online', lastChecked: now });
    insertSystem.run({ name: 'Veeam Backup', category: 'Backup', description: 'מערכת גיבוי', owner: 'IT', checkFrequency: 'daily', isActive: 1, currentStatus: 'offline', lastChecked: now });
    insertSystem.run({ name: 'Active Directory', category: 'Active Directory', description: 'שירות ספריה', owner: 'IT', checkFrequency: 'hourly', isActive: 1, currentStatus: 'online', lastChecked: now });

    // ── CVEs ───────────────────────────────────────────────────────────────
    const insertCve = db.prepare(`
      INSERT INTO cves (cveId,description,cvssScore,cvssVector,publishedDate,discoveredAt,exploitAvailable)
      VALUES (@cveId,@description,@cvssScore,@cvssVector,@publishedDate,@discoveredAt,@exploitAvailable)
    `);
    insertCve.run({ cveId: 'CVE-2025-0001', description: 'חולשת RCE קריטית ב-Apache Log4j', cvssScore: 10.0, cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H', publishedDate: '2025-12-10', discoveredAt: now, exploitAvailable: 1 });
    insertCve.run({ cveId: 'CVE-2025-1234', description: 'SQL Injection בממשק ניהול', cvssScore: 9.8, cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', publishedDate: '2025-11-15', discoveredAt: now, exploitAvailable: 1 });
    insertCve.run({ cveId: 'CVE-2025-5678', description: 'XSS מתמשך בפורטל לקוחות', cvssScore: 7.5, cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:N/A:N', publishedDate: '2025-10-20', discoveredAt: now, exploitAvailable: 0 });
    insertCve.run({ cveId: 'CVE-2026-0123', description: 'Privilege Escalation בקרנל Windows', cvssScore: 8.8, cvssVector: 'CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:C/C:H/I:H/A:H', publishedDate: '2026-01-05', discoveredAt: now, exploitAvailable: 0 });
    insertCve.run({ cveId: 'CVE-2025-9999', description: 'Buffer Overflow בדרייבר רשת', cvssScore: 6.5, cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H', publishedDate: '2025-09-30', discoveredAt: now, exploitAvailable: 0 });

    // ── Special Events ─────────────────────────────────────────────────────
    db.prepare(`INSERT INTO special_events (name,type,description,objectives,startDate,endDate,status,createdBy,createdAt) VALUES (?,?,?,?,?,?,?,?,?)`)
      .run('תרגיל Red Team Q1 2026', 'red_team', 'תרגיל חדירה מתוכנן', 'בדיקת מנגנוני הזיהוי',
        new Date(Date.now() + 7 * 86400000).toISOString(), new Date(Date.now() + 10 * 86400000).toISOString(), 'planned', 1, now);
    db.prepare(`INSERT INTO special_events (name,type,description,startDate,status,createdBy,createdAt) VALUES (?,?,?,?,?,?,?)`)
      .run('תגובה לאירוע Ransomware', 'operation', 'מבצע תגובה פעיל',
        new Date(Date.now() - 5400000).toISOString(), 'active', 1, now);

    // ── Ticker Messages ────────────────────────────────────────────────────
    const ins = db.prepare(`INSERT INTO ticker_messages (content,severity,"order",isActive,createdAt) VALUES (?,?,?,?,?)`);
    ins.run('מערכת מבצעית - כל המערכות פעילות', 'info', 1, 1, now);
    ins.run('אזהרה: זוהתה פעילות חשודה ברשת', 'high', 2, 1, now);
    ins.run('עדכון: CVE-2025-0001 - יש לעדכן Apache', 'critical', 3, 1, now);
    ins.run('תזכורת: ישיבת צוות יומית בשעה 09:00', 'info', 4, 1, now);

    // ── System Settings ────────────────────────────────────────────────────
    const INCIDENT_CATEGORIES = ['Phishing','Malware','Intrusion','DDoS','Insider Threat','Data Breach','Ransomware','Vulnerability Exploit','Social Engineering','אחר'];
    const INCIDENT_SOURCES = ['SIEM','EDR','Firewall','IDS/IPS','SOC Analyst','לקוח','ספק','אחר'];
    const SYSTEM_CATEGORIES = ['SIEM','EDR','Firewall','IDS/IPS','SOAR','Backup','Active Directory','אחר'];
    const insSetting = db.prepare(`INSERT OR IGNORE INTO system_settings (key,value) VALUES (?,?)`);
    [
      ['system_name','מרכז פעולות סייבר'], ['org_name','ארגון לדוגמה'], ['theme','dark'],
      ['timezone','Asia/Jerusalem'], ['language','he'], ['ticker_speed','120'],
      ['ticker_enabled','true'], ['sla_critical','15'], ['sla_high','60'],
      ['sla_medium','240'], ['sla_low','1440'],
      ['incident_categories', JSON.stringify(INCIDENT_CATEGORIES)],
      ['incident_sources', JSON.stringify(INCIDENT_SOURCES)],
      ['system_categories', JSON.stringify(SYSTEM_CATEGORIES)],
    ].forEach(([k, v]) => insSetting.run(k, v));

    // ── Shifts ─────────────────────────────────────────────────────────────
    const analysts = db.prepare(`SELECT id FROM analysts LIMIT 3`).all();
    if (analysts.length >= 3) {
      const insShift = db.prepare(`INSERT INTO shifts (analystId,shiftType,date,startTime,endTime) VALUES (?,?,?,?,?)`);
      const today = new Date();
      for (let i = -3; i < 4; i++) {
        const dt = new Date(today);
        dt.setDate(today.getDate() + i);
        const dateStr = dt.toISOString().split('T')[0];
        insShift.run(analysts[0].id, 'morning', dateStr, '07:00', '15:00');
        insShift.run(analysts[1].id, 'afternoon', dateStr, '15:00', '23:00');
        insShift.run(analysts[2].id, 'night', dateStr, '23:00', '07:00');
      }
    }

    // ── Playbooks ──────────────────────────────────────────────────────────
    const insPb = db.prepare(`INSERT INTO playbooks (name,category,description,isActive,createdAt,updatedAt) VALUES (?,?,?,?,?,?)`);
    const insItem = db.prepare(`INSERT INTO playbook_items (playbookId,item,phase,"order") VALUES (?,?,?,?)`);

    const phishingId = insPb.run('Phishing Response','Phishing','תגובה לאירוע פישינג',1,now,now).lastInsertRowid;
    [[1,'בדוק כתובת שולחת','זיהוי'],[2,'הכנס דומיין למחולל IOC','זיהוי'],[3,'חסום דומיין ב-DNS','הכלה'],[4,'בדוק כמה קיבלו','הכלה'],[5,'הודע למשתמשים','הכלה'],[6,'בדוק לחיצות על קישור','חקירה'],[7,'אפס סיסמאות','תיקון'],[8,'תעד וסגור','סיום']].forEach(([o,i,p]) => insItem.run(phishingId,i,p,o));

    const malwareId = insPb.run('Malware Incident Response','Malware','תגובה לאירוע מלוור',1,now,now).lastInsertRowid;
    [[1,'בודד תחנה נגועה','הכלה'],[2,'אסוף דגימה מ-EDR','זיהוי'],[3,'בדוק IOCs','זיהוי'],[4,'חפש Lateral Movement','חקירה'],[5,'בדוק persistence','חקירה'],[6,'הסר מלוור','תיקון'],[7,'Reimaging אם נדרש','תיקון'],[8,'עדכן חתימות','תיקון'],[9,'תעד ועדכן IOC','סיום']].forEach(([o,i,p]) => insItem.run(malwareId,i,p,o));

    const ranId = insPb.run('Ransomware Response','Ransomware','תגובה לאירוע Ransomware',1,now,now).lastInsertRowid;
    [[1,'נתק סגמנטים נגועים','הכלה'],[2,'זהה טיפוס Ransomware','זיהוי'],[3,'בדוק גיבויים','הכלה'],[4,'הודע להנהלה','הכלה'],[5,'הפסק הצפנה','הכלה'],[6,'זהה נקודת כניסה','חקירה'],[7,'בדוק גניבת מידע','חקירה'],[8,'שחזר מגיבוי','תיקון'],[9,'סגור נקודת כניסה','תיקון'],[10,'דווח לרגולטור','סיום']].forEach(([o,i,p]) => insItem.run(ranId,i,p,o));

    db.exec('COMMIT');
    console.log('[DB] Seed complete.');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = { seedDatabase };
