const express = require('express');
const router  = express.Router();
const { getDb } = require('../db');

// ── helpers ──────────────────────────────────────────────────────────────────
function mapItem(row) {
  if (!row) return null;
  return {
    id:           row.id,
    name:         row.name,
    type:         row.type,
    serialNumber: row.serial_number,
    capacity:     row.capacity,
    manufacturer: row.manufacturer,
    model:        row.model,
    condition:    row.condition,
    location:     row.location,
    notes:        row.notes,
    createdAt:    row.created_at,
  };
}

function mapLoan(row) {
  if (!row) return null;
  return {
    id:              row.id,
    inventoryItemId: row.inventory_item_id,
    borrowerName:    row.borrower_name,
    borrowerId:      row.borrower_id,
    purpose:         row.purpose,
    loanedAt:        row.loaned_at,
    expectedReturn:  row.expected_return,
    returnedAt:      row.returned_at,
    status:          row.status,
    notes:           row.notes,
    approvedBy:      row.approved_by,
    createdAt:       row.created_at,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Inventory items
// ══════════════════════════════════════════════════════════════════════════════

// GET  /api/inventory
router.get('/', (_req, res) => {
  const db   = getDb();
  const rows = db.prepare('SELECT * FROM inventory_items ORDER BY id DESC').all();
  res.json(rows.map(mapItem));
});

// POST /api/inventory
router.post('/', (req, res) => {
  const db = getDb();
  const { name, type = 'drive', serialNumber, capacity, manufacturer, model,
          condition = 'good', location, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const now  = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO inventory_items
      (name, type, serial_number, capacity, manufacturer, model, condition, location, notes, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `);
  const info = stmt.run(name, type, serialNumber || null, capacity || null,
    manufacturer || null, model || null, condition, location || null, notes || null, now);
  const row  = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(mapItem(row));
});

// PUT  /api/inventory/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, type, serialNumber, capacity, manufacturer, model,
          condition, location, notes } = req.body;
  db.prepare(`
    UPDATE inventory_items
    SET name=COALESCE(?,name), type=COALESCE(?,type),
        serial_number=COALESCE(?,serial_number), capacity=COALESCE(?,capacity),
        manufacturer=COALESCE(?,manufacturer), model=COALESCE(?,model),
        condition=COALESCE(?,condition), location=COALESCE(?,location),
        notes=COALESCE(?,notes)
    WHERE id=?
  `).run(name ?? null, type ?? null, serialNumber ?? null, capacity ?? null,
         manufacturer ?? null, model ?? null, condition ?? null,
         location ?? null, notes ?? null, req.params.id);
  const row = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(req.params.id);
  res.json(mapItem(row));
});

// DELETE /api/inventory/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  // also delete associated loans
  db.prepare('DELETE FROM loans WHERE inventory_item_id = ?').run(req.params.id);
  db.prepare('DELETE FROM inventory_items WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════════════
// Loans
// ══════════════════════════════════════════════════════════════════════════════

// GET  /api/inventory/loans  — all loans (with item info)
router.get('/loans', (_req, res) => {
  const db   = getDb();
  const rows = db.prepare(`
    SELECT l.*, i.name AS item_name, i.type AS item_type, i.serial_number AS item_serial
    FROM loans l
    JOIN inventory_items i ON i.id = l.inventory_item_id
    ORDER BY l.id DESC
  `).all();
  res.json(rows.map(row => ({
    ...mapLoan(row),
    itemName:   row.item_name,
    itemType:   row.item_type,
    itemSerial: row.item_serial,
  })));
});

// GET  /api/inventory/:itemId/loans
router.get('/:itemId/loans', (req, res) => {
  const db   = getDb();
  const rows = db.prepare('SELECT * FROM loans WHERE inventory_item_id = ? ORDER BY id DESC').all(req.params.itemId);
  res.json(rows.map(mapLoan));
});

// POST /api/inventory/loans
router.post('/loans', (req, res) => {
  const db = getDb();
  const { inventoryItemId, borrowerName, borrowerId, purpose,
          loanedAt, expectedReturn, approvedBy, notes } = req.body;
  if (!inventoryItemId || !borrowerName) {
    return res.status(400).json({ error: 'inventoryItemId and borrowerName required' });
  }
  const now  = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO loans
      (inventory_item_id, borrower_name, borrower_id, purpose,
       loaned_at, expected_return, status, notes, approved_by, created_at)
    VALUES (?,?,?,?,?,?,'active',?,?,?)
  `);
  const info = stmt.run(inventoryItemId, borrowerName, borrowerId || null,
    purpose || null, loanedAt || now, expectedReturn || null,
    notes || null, approvedBy || null, now);
  const row  = db.prepare('SELECT * FROM loans WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(mapLoan(row));
});

// PUT  /api/inventory/loans/:id
router.put('/loans/:id', (req, res) => {
  const db = getDb();
  const { borrowerName, borrowerId, purpose, loanedAt, expectedReturn,
          returnedAt, status, notes, approvedBy } = req.body;
  db.prepare(`
    UPDATE loans
    SET borrower_name=COALESCE(?,borrower_name),
        borrower_id=COALESCE(?,borrower_id),
        purpose=COALESCE(?,purpose),
        loaned_at=COALESCE(?,loaned_at),
        expected_return=COALESCE(?,expected_return),
        returned_at=COALESCE(?,returned_at),
        status=COALESCE(?,status),
        notes=COALESCE(?,notes),
        approved_by=COALESCE(?,approved_by)
    WHERE id=?
  `).run(borrowerName ?? null, borrowerId ?? null, purpose ?? null,
         loanedAt ?? null, expectedReturn ?? null, returnedAt ?? null,
         status ?? null, notes ?? null, approvedBy ?? null, req.params.id);
  const row = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id);
  res.json(mapLoan(row));
});

// DELETE /api/inventory/loans/:id
router.delete('/loans/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM loans WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
