-- ── Event checklist items (linked to special events via playbooks) ─────────────
CREATE TABLE IF NOT EXISTS event_checklist (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id         INTEGER NOT NULL REFERENCES special_events(id) ON DELETE CASCADE,
  playbook_item_id INTEGER REFERENCES playbook_items(id),
  item             TEXT    NOT NULL,
  is_done          INTEGER NOT NULL DEFAULT 0,
  done_by          TEXT,
  done_at          TEXT,
  "order"          INTEGER NOT NULL DEFAULT 0
);
