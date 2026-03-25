const { Router } = require('express');
const { getDb } = require('../db');

const router = Router();

// GET /api/incidents
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM incidents ORDER BY createdAt DESC`).all();
  res.json(rows);
});

// GET /api/incidents/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM incidents WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// POST /api/incidents
router.post('/', (req, res) => {
  const db = getDb();
  const d = req.body;
  const stmt = db.prepare(`
    INSERT INTO incidents
      (incidentNumber,title,description,severity,status,category,source,
       analystId,affectedAsset,sourceIp,destIp,urls,fileHashes,rca,tags,
       playbookId,createdAt,updatedAt,closedAt)
    VALUES
      (@incidentNumber,@title,@description,@severity,@status,@category,@source,
       @analystId,@affectedAsset,@sourceIp,@destIp,@urls,@fileHashes,@rca,@tags,
       @playbookId,@createdAt,@updatedAt,@closedAt)
  `);
  const info = stmt.run(d);
  res.status(201).json({ ...d, id: info.lastInsertRowid });
});

// PUT /api/incidents/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  const existing = db.prepare(`SELECT * FROM incidents WHERE id = ?`).get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const merged = { ...existing, ...req.body, id };
  db.prepare(`
    UPDATE incidents SET
      incidentNumber=@incidentNumber,title=@title,description=@description,
      severity=@severity,status=@status,category=@category,source=@source,
      analystId=@analystId,affectedAsset=@affectedAsset,sourceIp=@sourceIp,
      destIp=@destIp,urls=@urls,fileHashes=@fileHashes,rca=@rca,tags=@tags,
      playbookId=@playbookId,updatedAt=@updatedAt,closedAt=@closedAt
    WHERE id=@id
  `).run(merged);
  res.json(merged);
});

// DELETE /api/incidents/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare(`DELETE FROM incidents WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// GET /api/incidents/:id/actions
router.get('/:id/actions', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM incident_actions WHERE incidentId = ? ORDER BY timestamp ASC`).all(req.params.id);
  res.json(rows);
});

// POST /api/incidents/:id/actions
router.post('/:id/actions', (req, res) => {
  const db = getDb();
  const d = { ...req.body, incidentId: parseInt(req.params.id) };
  const info = db.prepare(`
    INSERT INTO incident_actions (incidentId,action,performedBy,timestamp,notes)
    VALUES (@incidentId,@action,@performedBy,@timestamp,@notes)
  `).run(d);
  res.status(201).json({ ...d, id: info.lastInsertRowid });
});

// GET /api/incidents/:id/assets
router.get('/:id/assets', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM incident_assets WHERE incidentId = ?`).all(req.params.id);
  res.json(rows);
});

// POST /api/incidents/:id/assets
router.post('/:id/assets', (req, res) => {
  const db = getDb();
  const d = { ...req.body, incidentId: parseInt(req.params.id) };
  const info = db.prepare(`
    INSERT INTO incident_assets (incidentId,assetType,value)
    VALUES (@incidentId,@assetType,@value)
  `).run(d);
  res.status(201).json({ ...d, id: info.lastInsertRowid });
});

// GET /api/incidents/:id/checklist
router.get('/:id/checklist', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM incident_checklists WHERE incidentId = ? ORDER BY "order" ASC`).all(req.params.id);
  res.json(rows.map(r => ({ ...r, isDone: !!r.isDone })));
});

// POST /api/incidents/:id/checklist
router.post('/:id/checklist', (req, res) => {
  const db = getDb();
  const d = { ...req.body, incidentId: parseInt(req.params.id), isDone: req.body.isDone ? 1 : 0 };
  const info = db.prepare(`
    INSERT INTO incident_checklists (incidentId,playbookItemId,item,isDone,doneBy,doneAt,"order")
    VALUES (@incidentId,@playbookItemId,@item,@isDone,@doneBy,@doneAt,@order)
  `).run(d);
  res.status(201).json({ ...d, id: info.lastInsertRowid, isDone: !!d.isDone });
});

// PUT /api/incidents/checklist/:itemId
router.put('/checklist/:itemId', (req, res) => {
  const db = getDb();
  const existing = db.prepare(`SELECT * FROM incident_checklists WHERE id = ?`).get(req.params.itemId);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const merged = { ...existing, ...req.body, isDone: req.body.isDone ? 1 : 0 };
  db.prepare(`UPDATE incident_checklists SET isDone=@isDone,doneBy=@doneBy,doneAt=@doneAt WHERE id=@id`).run(merged);
  res.json({ ...merged, isDone: !!merged.isDone });
});

module.exports = router;
