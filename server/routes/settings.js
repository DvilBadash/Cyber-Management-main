const { Router } = require('express');
const { getDb } = require('../db');

const router = Router();

// GET /api/settings — return all settings as key→value map
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT key, value FROM system_settings`).all();
  const map = {};
  rows.forEach(r => { map[r.key] = r.value; });
  res.json(map);
});

// PUT /api/settings/:key
router.put('/:key', (req, res) => {
  const db = getDb();
  db.prepare(`INSERT INTO system_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`)
    .run(req.params.key, req.body.value);
  res.json({ key: req.params.key, value: req.body.value });
});

// PUT /api/settings (bulk)
router.put('/', (req, res) => {
  const db = getDb();
  const upsert = db.prepare(`INSERT INTO system_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`);
  const bulkUpsert = db.transaction((entries) => {
    for (const [key, value] of entries) upsert.run(key, value);
  });
  bulkUpsert(Object.entries(req.body));
  res.json({ ok: true });
});

// ── Ticker Messages ─────────────────────────────────────────────────────────

// GET /api/settings/ticker
router.get('/ticker/messages', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM ticker_messages ORDER BY "order" ASC`).all();
  res.json(rows.map(r => ({ ...r, isActive: !!r.isActive })));
});

// POST /api/settings/ticker
router.post('/ticker/messages', (req, res) => {
  const db = getDb();
  const d = { ...req.body, isActive: req.body.isActive ? 1 : 0 };
  const info = db.prepare(`
    INSERT INTO ticker_messages (content,severity,"order",isActive,createdAt)
    VALUES (@content,@severity,@order,@isActive,@createdAt)
  `).run(d);
  res.status(201).json({ ...d, id: info.lastInsertRowid, isActive: !!d.isActive });
});

// PUT /api/settings/ticker/:id
router.put('/ticker/messages/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  const existing = db.prepare(`SELECT * FROM ticker_messages WHERE id=?`).get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const merged = { ...existing, ...req.body, id, isActive: req.body.isActive !== undefined ? (req.body.isActive ? 1 : 0) : existing.isActive };
  db.prepare(`UPDATE ticker_messages SET content=@content,severity=@severity,"order"=@order,isActive=@isActive WHERE id=@id`).run(merged);
  res.json({ ...merged, isActive: !!merged.isActive });
});

// DELETE /api/settings/ticker/:id
router.delete('/ticker/messages/:id', (req, res) => {
  const db = getDb();
  db.prepare(`DELETE FROM ticker_messages WHERE id=?`).run(req.params.id);
  res.json({ ok: true });
});

// ── Emergency Banner ─────────────────────────────────────────────────────────

// GET /api/settings/banner
router.get('/banner/active', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM emergency_banners WHERE isActive=1`).all();
  const banner = rows.find(b => !b.expiresAt || new Date(b.expiresAt) > new Date());
  res.json(banner ? { ...banner, isActive: !!banner.isActive } : null);
});

// GET /api/settings/banners
router.get('/banners/all', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM emergency_banners ORDER BY createdAt DESC`).all();
  res.json(rows.map(r => ({ ...r, isActive: !!r.isActive })));
});

// POST /api/settings/banners
router.post('/banners/all', (req, res) => {
  const db = getDb();
  const d = { ...req.body, isActive: req.body.isActive ? 1 : 0 };
  const info = db.prepare(`
    INSERT INTO emergency_banners (message,severity,expiresAt,isActive,createdAt)
    VALUES (@message,@severity,@expiresAt,@isActive,@createdAt)
  `).run(d);
  res.status(201).json({ ...d, id: info.lastInsertRowid, isActive: !!d.isActive });
});

// PUT /api/settings/banners/:id
router.put('/banners/all/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  const existing = db.prepare(`SELECT * FROM emergency_banners WHERE id=?`).get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const merged = { ...existing, ...req.body, id, isActive: req.body.isActive !== undefined ? (req.body.isActive ? 1 : 0) : existing.isActive };
  db.prepare(`UPDATE emergency_banners SET message=@message,severity=@severity,expiresAt=@expiresAt,isActive=@isActive WHERE id=@id`).run(merged);
  res.json({ ...merged, isActive: !!merged.isActive });
});

module.exports = router;
