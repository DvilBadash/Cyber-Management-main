const { Router } = require('express');
const { getDb } = require('../db');

const router = Router();

// GET /api/events
router.get('/', (req, res) => {
  const db = getDb();
  res.json(db.prepare(`SELECT * FROM special_events ORDER BY startDate DESC`).all());
});

// POST /api/events
router.post('/', (req, res) => {
  const db = getDb();
  const info = db.prepare(`
    INSERT INTO special_events (name,type,description,objectives,startDate,endDate,status,findings,lessonsLearned,createdBy,createdAt)
    VALUES (@name,@type,@description,@objectives,@startDate,@endDate,@status,@findings,@lessonsLearned,@createdBy,@createdAt)
  `).run(req.body);
  res.status(201).json({ ...req.body, id: info.lastInsertRowid });
});

// PUT /api/events/checklist/:itemId  ← must be before /:id
router.put('/checklist/:itemId', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.itemId);
  const row = db.prepare('SELECT * FROM event_checklist WHERE id=?').get(id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const isDone = req.body.isDone !== undefined ? (req.body.isDone ? 1 : 0) : row.is_done;
  const doneBy = req.body.doneBy !== undefined ? req.body.doneBy : row.done_by;
  const doneAt = req.body.doneAt !== undefined ? req.body.doneAt : row.done_at;
  db.prepare('UPDATE event_checklist SET is_done=?, done_by=?, done_at=? WHERE id=?').run(isDone, doneBy, doneAt, id);
  res.json({ id, eventId: row.event_id, item: row.item, isDone: !!isDone, doneBy, doneAt, order: row.order });
});

// PUT /api/events/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  const existing = db.prepare(`SELECT * FROM special_events WHERE id=?`).get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const merged = { ...existing, ...req.body, id };
  const params = {
    id,
    name: merged.name,
    type: merged.type,
    description: merged.description ?? null,
    objectives: merged.objectives ?? null,
    startDate: merged.startDate,
    endDate: merged.endDate ?? null,
    status: merged.status,
    findings: merged.findings ?? null,
    lessonsLearned: merged.lessonsLearned ?? null,
  };
  db.prepare(`
    UPDATE special_events SET
      name=@name,type=@type,description=@description,objectives=@objectives,
      startDate=@startDate,endDate=@endDate,status=@status,
      findings=@findings,lessonsLearned=@lessonsLearned
    WHERE id=@id
  `).run(params);
  res.json({ ...merged, ...params });
});

// DELETE /api/events/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare(`DELETE FROM special_events WHERE id=?`).run(req.params.id);
  db.prepare(`DELETE FROM event_participants WHERE eventId=?`).run(req.params.id);
  res.json({ ok: true });
});

// GET /api/events/:id/checklist
router.get('/:id/checklist', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM event_checklist WHERE event_id=? ORDER BY "order"').all(req.params.id);
  res.json(rows.map(r => ({
    id: r.id, eventId: r.event_id, playbookItemId: r.playbook_item_id,
    item: r.item, isDone: !!r.is_done, doneBy: r.done_by, doneAt: r.done_at, order: r.order,
  })));
});

// POST /api/events/:id/checklist
router.post('/:id/checklist', (req, res) => {
  const db = getDb();
  const eventId = parseInt(req.params.id);
  const d = req.body;
  const info = db.prepare(`
    INSERT INTO event_checklist (event_id, playbook_item_id, item, is_done, done_by, done_at, "order")
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(eventId, d.playbookItemId || null, d.item, d.isDone ? 1 : 0, d.doneBy || null, d.doneAt || null, d.order || 0);
  res.status(201).json({ id: info.lastInsertRowid, eventId, ...d });
});

// GET /api/events/:id/participants
router.get('/:id/participants', (req, res) => {
  const db = getDb();
  res.json(db.prepare(`SELECT * FROM event_participants WHERE eventId=?`).all(req.params.id));
});

// POST /api/events/:id/participants
router.post('/:id/participants', (req, res) => {
  const db = getDb();
  const d = { ...req.body, eventId: parseInt(req.params.id) };
  const info = db.prepare(`INSERT INTO event_participants (eventId,userId,role) VALUES (@eventId,@userId,@role)`).run(d);
  res.status(201).json({ ...d, id: info.lastInsertRowid });
});

// DELETE /api/events/:id/participants/:userId
router.delete('/:id/participants/:userId', (req, res) => {
  const db = getDb();
  db.prepare(`DELETE FROM event_participants WHERE eventId=? AND userId=?`).run(req.params.id, req.params.userId);
  res.json({ ok: true });
});

module.exports = router;
