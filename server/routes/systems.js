const { Router } = require('express');
const { getDb } = require('../db');

const router = Router();

// GET /api/systems
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM systems ORDER BY name ASC`).all();
  res.json(rows.map(r => ({ ...r, isActive: !!r.isActive })));
});

// POST /api/systems
router.post('/', (req, res) => {
  const db = getDb();
  const d = { ...req.body, isActive: req.body.isActive ? 1 : 0 };
  const info = db.prepare(`
    INSERT INTO systems (name,category,description,owner,checkFrequency,isActive,currentStatus,lastChecked)
    VALUES (@name,@category,@description,@owner,@checkFrequency,@isActive,@currentStatus,@lastChecked)
  `).run(d);
  res.status(201).json({ ...d, id: info.lastInsertRowid, isActive: !!d.isActive });
});

// PUT /api/systems/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  const existing = db.prepare(`SELECT * FROM systems WHERE id = ?`).get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const merged = { ...existing, ...req.body, id, isActive: req.body.isActive !== undefined ? (req.body.isActive ? 1 : 0) : existing.isActive };
  db.prepare(`
    UPDATE systems SET
      name=@name,category=@category,description=@description,owner=@owner,
      checkFrequency=@checkFrequency,isActive=@isActive,currentStatus=@currentStatus,lastChecked=@lastChecked
    WHERE id=@id
  `).run(merged);
  res.json({ ...merged, isActive: !!merged.isActive });
});

// GET /api/systems/:id/checks
router.get('/:id/checks', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM system_checks WHERE systemId = ? ORDER BY checkedAt DESC`).all(req.params.id);
  res.json(rows);
});

// POST /api/systems/:id/checks
router.post('/:id/checks', (req, res) => {
  const db = getDb();
  const d = { ...req.body, systemId: parseInt(req.params.id) };
  const info = db.prepare(`
    INSERT INTO system_checks (systemId,status,checkedBy,checkedAt,notes)
    VALUES (@systemId,@status,@checkedBy,@checkedAt,@notes)
  `).run(d);

  // Update the system's current status + lastChecked
  db.prepare(`UPDATE systems SET currentStatus=@status, lastChecked=@checkedAt WHERE id=@systemId`).run(d);

  // Handle downtime tracking
  if (d.status === 'offline') {
    const existing = db.prepare(`SELECT id FROM system_downtime WHERE systemId=? AND endTime IS NULL`).get(d.systemId);
    if (!existing) {
      db.prepare(`INSERT INTO system_downtime (systemId,startTime) VALUES (?,?)`).run(d.systemId, d.checkedAt);
    }
  } else {
    const downtime = db.prepare(`SELECT id FROM system_downtime WHERE systemId=? AND endTime IS NULL`).get(d.systemId);
    if (downtime) {
      db.prepare(`UPDATE system_downtime SET endTime=?,resolvedBy=? WHERE id=?`)
        .run(d.checkedAt, d.checkedBy, downtime.id);
    }
  }

  // Update today's daily check session if it exists
  const todayStr = d.checkedAt.split('T')[0];
  const session = db.prepare(`SELECT id FROM daily_check_sessions WHERE date=?`).get(todayStr);
  if (session) {
    const allSystems = db.prepare(`SELECT id,currentStatus,isActive FROM systems WHERE isActive=1`).all();
    const counts = { online: 0, degraded: 0, offline: 0 };
    for (const sys of allSystems) {
      const s = sys.id === d.systemId ? d.status : sys.currentStatus;
      counts[s] = (counts[s] || 0) + 1;
    }
    db.prepare(`UPDATE daily_check_sessions SET onlineSystems=?,degradedSystems=?,offlineSystems=? WHERE id=?`)
      .run(counts.online, counts.degraded, counts.offline, session.id);
  }

  res.status(201).json({ ...d, id: info.lastInsertRowid });
});

// GET /api/systems/daily-sessions
router.get('/daily/sessions', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM daily_check_sessions ORDER BY date DESC LIMIT 30`).all();
  res.json(rows);
});

// POST /api/systems/daily-sessions
router.post('/daily/sessions', (req, res) => {
  const db = getDb();
  const d = req.body;
  // Upsert by date
  const existing = db.prepare(`SELECT id FROM daily_check_sessions WHERE date=?`).get(d.date);
  if (existing) {
    db.prepare(`UPDATE daily_check_sessions SET checkedBy=@checkedBy,completedAt=@completedAt,totalSystems=@totalSystems,onlineSystems=@onlineSystems,degradedSystems=@degradedSystems,offlineSystems=@offlineSystems,notes=@notes WHERE date=@date`).run(d);
    res.json({ ...d, id: existing.id });
  } else {
    const info = db.prepare(`
      INSERT INTO daily_check_sessions (date,checkedBy,completedAt,totalSystems,onlineSystems,degradedSystems,offlineSystems,notes)
      VALUES (@date,@checkedBy,@completedAt,@totalSystems,@onlineSystems,@degradedSystems,@offlineSystems,@notes)
    `).run(d);
    res.status(201).json({ ...d, id: info.lastInsertRowid });
  }
});

module.exports = router;
