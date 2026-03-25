const { Router } = require('express');
const { getDb } = require('../db');

const router = Router();

// GET /api/analysts
router.get('/', (req, res) => {
  const db = getDb();
  res.json(db.prepare(`SELECT * FROM analysts ORDER BY name ASC`).all());
});

// POST /api/analysts
router.post('/', (req, res) => {
  const db = getDb();
  const info = db.prepare(`
    INSERT INTO analysts (name,role,email,phone,status,avatar)
    VALUES (@name,@role,@email,@phone,@status,@avatar)
  `).run(req.body);
  res.status(201).json({ ...req.body, id: info.lastInsertRowid });
});

// PUT /api/analysts/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  const existing = db.prepare(`SELECT * FROM analysts WHERE id=?`).get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const merged = { ...existing, ...req.body, id };
  db.prepare(`UPDATE analysts SET name=@name,role=@role,email=@email,phone=@phone,status=@status,avatar=@avatar WHERE id=@id`).run(merged);
  res.json(merged);
});

// DELETE /api/analysts/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare(`DELETE FROM analysts WHERE id=?`).run(req.params.id);
  res.json({ ok: true });
});

// GET /api/analysts/shifts
router.get('/shifts/all', (req, res) => {
  const db = getDb();
  const { from, to } = req.query;
  let query = `SELECT * FROM shifts`;
  const params = [];
  if (from && to) {
    query += ` WHERE date >= ? AND date <= ?`;
    params.push(from, to);
  }
  query += ` ORDER BY date ASC, shiftType ASC`;
  res.json(db.prepare(query).all(...params));
});

// POST /api/analysts/shifts
router.post('/shifts/all', (req, res) => {
  const db = getDb();
  const info = db.prepare(`
    INSERT INTO shifts (analystId,shiftType,date,startTime,endTime,notes)
    VALUES (@analystId,@shiftType,@date,@startTime,@endTime,@notes)
  `).run(req.body);
  res.status(201).json({ ...req.body, id: info.lastInsertRowid });
});

// PUT /api/analysts/shifts/:id
router.put('/shifts/all/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  const existing = db.prepare(`SELECT * FROM shifts WHERE id=?`).get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const merged = { ...existing, ...req.body, id };
  db.prepare(`UPDATE shifts SET analystId=@analystId,shiftType=@shiftType,date=@date,startTime=@startTime,endTime=@endTime,notes=@notes WHERE id=@id`).run(merged);
  res.json(merged);
});

// DELETE /api/analysts/shifts/:id
router.delete('/shifts/all/:id', (req, res) => {
  const db = getDb();
  db.prepare(`DELETE FROM shifts WHERE id=?`).run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
