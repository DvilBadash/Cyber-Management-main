-- ── Inventory items (portable drives, laptops, tablets, etc.) ────────────────
CREATE TABLE IF NOT EXISTS inventory_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL,
  type             TEXT    NOT NULL DEFAULT 'drive',
  serial_number    TEXT,
  capacity         TEXT,
  manufacturer     TEXT,
  model            TEXT,
  condition        TEXT    NOT NULL DEFAULT 'good',
  location         TEXT,
  notes            TEXT,
  created_at       TEXT    NOT NULL
);

-- ── Equipment loans ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loans (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  inventory_item_id   INTEGER NOT NULL REFERENCES inventory_items(id),
  borrower_name       TEXT    NOT NULL,
  borrower_id         TEXT,
  purpose             TEXT,
  loaned_at           TEXT    NOT NULL,
  expected_return     TEXT,
  returned_at         TEXT,
  status              TEXT    NOT NULL DEFAULT 'active',
  notes               TEXT,
  approved_by         TEXT,
  created_at          TEXT    NOT NULL
);
