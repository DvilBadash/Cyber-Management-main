const { Router } = require('express');
const { getDb } = require('../db');

const router = Router();

// GET /api/playbooks
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM playbooks ORDER BY name ASC`).all();
  res.json(rows.map(r => ({ ...r, isActive: !!r.isActive })));
});

// POST /api/playbooks
router.post('/', (req, res) => {
  const db = getDb();
  const d = { ...req.body, isActive: req.body.isActive ? 1 : 0 };
  const info = db.prepare(`
    INSERT INTO playbooks (name,category,description,isActive,createdAt,updatedAt)
    VALUES (@name,@category,@description,@isActive,@createdAt,@updatedAt)
  `).run(d);
  res.status(201).json({ ...d, id: info.lastInsertRowid, isActive: !!d.isActive });
});

// PUT /api/playbooks/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  const existing = db.prepare(`SELECT * FROM playbooks WHERE id=?`).get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const merged = { ...existing, ...req.body, id, isActive: req.body.isActive !== undefined ? (req.body.isActive ? 1 : 0) : existing.isActive };
  db.prepare(`UPDATE playbooks SET name=@name,category=@category,description=@description,isActive=@isActive,updatedAt=@updatedAt WHERE id=@id`).run(merged);
  res.json({ ...merged, isActive: !!merged.isActive });
});

// DELETE /api/playbooks/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare(`DELETE FROM playbooks WHERE id=?`).run(req.params.id);
  db.prepare(`DELETE FROM playbook_items WHERE playbookId=?`).run(req.params.id);
  res.json({ ok: true });
});

// GET /api/playbooks/:id/items
router.get('/:id/items', (req, res) => {
  const db = getDb();
  res.json(db.prepare(`SELECT * FROM playbook_items WHERE playbookId=? ORDER BY "order" ASC`).all(req.params.id));
});

// POST /api/playbooks/:id/items
router.post('/:id/items', (req, res) => {
  const db = getDb();
  const d = { ...req.body, playbookId: parseInt(req.params.id) };
  const info = db.prepare(`INSERT INTO playbook_items (playbookId,item,phase,"order") VALUES (@playbookId,@item,@phase,@order)`).run(d);
  res.status(201).json({ ...d, id: info.lastInsertRowid });
});

// PUT /api/playbooks/items/:itemId
router.put('/items/:itemId', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.itemId);
  const existing = db.prepare(`SELECT * FROM playbook_items WHERE id=?`).get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const merged = { ...existing, ...req.body, id };
  db.prepare(`UPDATE playbook_items SET item=@item,phase=@phase,"order"=@order WHERE id=@id`).run(merged);
  res.json(merged);
});

// DELETE /api/playbooks/items/:itemId
router.delete('/items/:itemId', (req, res) => {
  const db = getDb();
  db.prepare(`DELETE FROM playbook_items WHERE id=?`).run(req.params.itemId);
  res.json({ ok: true });
});

module.exports = router;
