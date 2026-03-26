const { Router } = require('express');
const { getDb } = require('../db');

const router = Router();

// GET /api/cves
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM cves ORDER BY cvssScore DESC`).all();
  res.json(rows.map(r => ({ ...r, exploitAvailable: !!r.exploitAvailable })));
});

// POST /api/cves
router.post('/', (req, res) => {
  const db = getDb();
  const d = { ...req.body, exploitAvailable: req.body.exploitAvailable ? 1 : 0 };
  const info = db.prepare(`
    INSERT INTO cves (cveId,description,cvssScore,cvssVector,publishedDate,discoveredAt,exploitAvailable,treatmentMethod)
    VALUES (@cveId,@description,@cvssScore,@cvssVector,@publishedDate,@discoveredAt,@exploitAvailable,@treatmentMethod)
  `).run(d);
  res.status(201).json({ ...d, id: info.lastInsertRowid, exploitAvailable: !!d.exploitAvailable });
});

// PUT /api/cves/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  const existing = db.prepare(`SELECT * FROM cves WHERE id = ?`).get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const merged = { ...existing, ...req.body, id, exploitAvailable: req.body.exploitAvailable !== undefined ? (req.body.exploitAvailable ? 1 : 0) : existing.exploitAvailable };
  db.prepare(`
    UPDATE cves SET
      cveId=@cveId,description=@description,cvssScore=@cvssScore,cvssVector=@cvssVector,
      publishedDate=@publishedDate,discoveredAt=@discoveredAt,exploitAvailable=@exploitAvailable,treatmentMethod=@treatmentMethod
    WHERE id=@id
  `).run(merged);
  res.json({ ...merged, exploitAvailable: !!merged.exploitAvailable });
});

// DELETE /api/cves/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare(`DELETE FROM cves WHERE id = ?`).run(req.params.id);
  db.prepare(`DELETE FROM cve_assets WHERE cveId = ?`).run(req.params.id);
  res.json({ ok: true });
});

// GET /api/cves/:id/assets
router.get('/:id/assets', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM cve_assets WHERE cveId = ?`).all(req.params.id);
  res.json(rows);
});

// POST /api/cves/:id/assets
router.post('/:id/assets', (req, res) => {
  const db = getDb();
  const d = { ...req.body, cveId: parseInt(req.params.id) };
  const info = db.prepare(`
    INSERT INTO cve_assets (cveId,assetName,assetType,status,owner,dueDate,notes)
    VALUES (@cveId,@assetName,@assetType,@status,@owner,@dueDate,@notes)
  `).run(d);
  res.status(201).json({ ...d, id: info.lastInsertRowid });
});

// PUT /api/cves/assets/:assetId
router.put('/assets/:assetId', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.assetId);
  const existing = db.prepare(`SELECT * FROM cve_assets WHERE id = ?`).get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const merged = { ...existing, ...req.body, id };
  db.prepare(`
    UPDATE cve_assets SET assetName=@assetName,assetType=@assetType,status=@status,owner=@owner,dueDate=@dueDate,notes=@notes WHERE id=@id
  `).run({ id, assetName: merged.assetName, assetType: merged.assetType, status: merged.status, owner: merged.owner, dueDate: merged.dueDate, notes: merged.notes });
  res.json(merged);
});

module.exports = router;
