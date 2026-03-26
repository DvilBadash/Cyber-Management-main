const { Router } = require('express');
const { getDb } = require('../db');

const router = Router();

// GET /api/handover
router.get('/', (req, res) => {
  const db = getDb();
  res.json(db.prepare(`SELECT * FROM shift_handovers ORDER BY createdAt DESC LIMIT 50`).all());
});

// POST /api/handover
router.post('/', (req, res) => {
  const db = getDb();
  const info = db.prepare(`
    INSERT INTO shift_handovers (outgoingShiftId,incomingShiftId,outgoingAnalyst,incomingAnalyst,createdAt,signedAt,receivedAt,notes)
    VALUES (@outgoingShiftId,@incomingShiftId,@outgoingAnalyst,@incomingAnalyst,@createdAt,@signedAt,@receivedAt,@notes)
  `).run(req.body);
  res.status(201).json({ ...req.body, id: info.lastInsertRowid });
});

// PUT /api/handover/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  const existing = db.prepare(`SELECT * FROM shift_handovers WHERE id=?`).get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const merged = { ...existing, ...req.body, id };
  db.prepare(`UPDATE shift_handovers SET outgoingAnalyst=@outgoingAnalyst,incomingAnalyst=@incomingAnalyst,signedAt=@signedAt,receivedAt=@receivedAt,notes=@notes WHERE id=@id`)
    .run({ id, outgoingAnalyst: merged.outgoingAnalyst, incomingAnalyst: merged.incomingAnalyst, signedAt: merged.signedAt, receivedAt: merged.receivedAt, notes: merged.notes });
  res.json(merged);
});

// GET /api/handover/:id/items
router.get('/:id/items', (req, res) => {
  const db = getDb();
  res.json(db.prepare(`SELECT * FROM handover_items WHERE handoverId=?`).all(req.params.id));
});

// POST /api/handover/:id/items
router.post('/:id/items', (req, res) => {
  const db = getDb();
  const d = { ...req.body, handoverId: parseInt(req.params.id) };
  const info = db.prepare(`
    INSERT INTO handover_items (handoverId,type,description,linkedIncidentId,status)
    VALUES (@handoverId,@type,@description,@linkedIncidentId,@status)
  `).run(d);
  res.status(201).json({ ...d, id: info.lastInsertRowid });
});

// PUT /api/handover/items/:itemId
router.put('/items/:itemId', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.itemId);
  const existing = db.prepare(`SELECT * FROM handover_items WHERE id=?`).get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const merged = { ...existing, ...req.body, id };
  db.prepare(`UPDATE handover_items SET type=@type,description=@description,linkedIncidentId=@linkedIncidentId,status=@status WHERE id=@id`)
    .run({ id, type: merged.type, description: merged.description, linkedIncidentId: merged.linkedIncidentId, status: merged.status });
  res.json(merged);
});

module.exports = router;
