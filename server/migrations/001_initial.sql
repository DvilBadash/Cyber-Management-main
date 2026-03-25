-- =====================================================================
-- Migration 001: Initial Schema
-- All ALTER TABLE migrations should go in numbered files (002, 003...)
-- NEVER drop columns — add new columns with DEFAULT NULL instead.
-- =====================================================================

-- Users & Auth
CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  fullName     TEXT NOT NULL,
  username     TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  role         TEXT NOT NULL DEFAULT 'analyst',
  department   TEXT,
  avatarUrl    TEXT,
  isActive     INTEGER NOT NULL DEFAULT 1,
  createdAt    TEXT NOT NULL,
  lastLogin    TEXT
);

CREATE TABLE IF NOT EXISTS permissions (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  userId    INTEGER NOT NULL,
  module    TEXT NOT NULL,
  canRead   INTEGER NOT NULL DEFAULT 1,
  canWrite  INTEGER NOT NULL DEFAULT 0,
  canDelete INTEGER NOT NULL DEFAULT 0,
  canAdmin  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS activity_log (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  userId    INTEGER NOT NULL,
  action    TEXT NOT NULL,
  module    TEXT NOT NULL,
  details   TEXT,
  ipAddress TEXT,
  timestamp TEXT NOT NULL
);

-- Incidents
CREATE TABLE IF NOT EXISTS incidents (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  incidentNumber TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  description    TEXT NOT NULL,
  severity       TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'open',
  category       TEXT NOT NULL,
  source         TEXT NOT NULL,
  analystId      INTEGER,
  affectedAsset  TEXT,
  sourceIp       TEXT,
  destIp         TEXT,
  urls           TEXT,
  fileHashes     TEXT,
  rca            TEXT,
  tags           TEXT,
  playbookId     INTEGER,
  createdAt      TEXT NOT NULL,
  updatedAt      TEXT NOT NULL,
  closedAt       TEXT
);

CREATE TABLE IF NOT EXISTS incident_actions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  incidentId  INTEGER NOT NULL,
  action      TEXT NOT NULL,
  performedBy TEXT NOT NULL,
  timestamp   TEXT NOT NULL,
  notes       TEXT
);

CREATE TABLE IF NOT EXISTS incident_assets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  incidentId INTEGER NOT NULL,
  assetType  TEXT NOT NULL,
  value      TEXT NOT NULL
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  title               TEXT NOT NULL,
  description         TEXT,
  priority            TEXT NOT NULL DEFAULT 'normal',
  status              TEXT NOT NULL DEFAULT 'todo',
  taskType            TEXT,
  recurrenceFrequency TEXT,
  incidentId          INTEGER,
  assigneeId          INTEGER,
  assignedUserIds     TEXT,
  dueDate             TEXT,
  createdAt           TEXT NOT NULL,
  updatedAt           TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_comments (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  taskId    INTEGER NOT NULL,
  userId    INTEGER NOT NULL,
  comment   TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_checklist (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  taskId INTEGER NOT NULL,
  item   TEXT NOT NULL,
  isDone INTEGER NOT NULL DEFAULT 0
);

-- Analysts & Shifts
CREATE TABLE IF NOT EXISTS analysts (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  name   TEXT NOT NULL,
  role   TEXT NOT NULL,
  email  TEXT NOT NULL,
  phone  TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  avatar TEXT
);

CREATE TABLE IF NOT EXISTS shifts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  analystId  INTEGER NOT NULL,
  shiftType  TEXT NOT NULL,
  date       TEXT NOT NULL,
  startTime  TEXT NOT NULL,
  endTime    TEXT NOT NULL,
  notes      TEXT
);

CREATE TABLE IF NOT EXISTS shift_handovers (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  outgoingShiftId  INTEGER,
  incomingShiftId  INTEGER,
  outgoingAnalyst  TEXT NOT NULL,
  incomingAnalyst  TEXT NOT NULL,
  createdAt        TEXT NOT NULL,
  signedAt         TEXT,
  receivedAt       TEXT,
  notes            TEXT
);

CREATE TABLE IF NOT EXISTS handover_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  handoverId       INTEGER NOT NULL,
  type             TEXT NOT NULL,
  description      TEXT NOT NULL,
  linkedIncidentId INTEGER,
  status           TEXT NOT NULL DEFAULT 'open'
);

-- Systems
CREATE TABLE IF NOT EXISTS systems (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  category       TEXT NOT NULL,
  description    TEXT,
  owner          TEXT,
  checkFrequency TEXT NOT NULL DEFAULT 'daily',
  isActive       INTEGER NOT NULL DEFAULT 1,
  currentStatus  TEXT NOT NULL DEFAULT 'online',
  lastChecked    TEXT
);

CREATE TABLE IF NOT EXISTS system_checks (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  systemId  INTEGER NOT NULL,
  status    TEXT NOT NULL,
  checkedBy TEXT NOT NULL,
  checkedAt TEXT NOT NULL,
  notes     TEXT
);

CREATE TABLE IF NOT EXISTS system_downtime (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  systemId   INTEGER NOT NULL,
  startTime  TEXT NOT NULL,
  endTime    TEXT,
  cause      TEXT,
  resolvedBy TEXT
);

CREATE TABLE IF NOT EXISTS daily_check_sessions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  date            TEXT NOT NULL UNIQUE,
  checkedBy       TEXT NOT NULL,
  completedAt     TEXT NOT NULL,
  totalSystems    INTEGER NOT NULL DEFAULT 0,
  onlineSystems   INTEGER NOT NULL DEFAULT 0,
  degradedSystems INTEGER NOT NULL DEFAULT 0,
  offlineSystems  INTEGER NOT NULL DEFAULT 0,
  notes           TEXT
);

-- CVEs
CREATE TABLE IF NOT EXISTS cves (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  cveId            TEXT NOT NULL UNIQUE,
  description      TEXT NOT NULL,
  cvssScore        REAL,
  cvssVector       TEXT,
  publishedDate    TEXT,
  discoveredAt     TEXT NOT NULL,
  exploitAvailable INTEGER NOT NULL DEFAULT 0,
  treatmentMethod  TEXT
);

CREATE TABLE IF NOT EXISTS cve_assets (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  cveId     INTEGER NOT NULL,
  assetName TEXT NOT NULL,
  assetType TEXT NOT NULL,
  status    TEXT NOT NULL DEFAULT 'new',
  owner     TEXT,
  dueDate   TEXT,
  notes     TEXT
);

-- Special Events
CREATE TABLE IF NOT EXISTS special_events (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  type           TEXT NOT NULL,
  description    TEXT,
  objectives     TEXT,
  startDate      TEXT NOT NULL,
  endDate        TEXT,
  status         TEXT NOT NULL DEFAULT 'planned',
  findings       TEXT,
  lessonsLearned TEXT,
  createdBy      INTEGER NOT NULL,
  createdAt      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_participants (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  eventId INTEGER NOT NULL,
  userId  INTEGER NOT NULL,
  role    TEXT
);

-- Settings & UI
CREATE TABLE IF NOT EXISTS system_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ticker_messages (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  content   TEXT NOT NULL,
  severity  TEXT NOT NULL DEFAULT 'info',
  "order"   INTEGER NOT NULL DEFAULT 0,
  isActive  INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS emergency_banners (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  message   TEXT NOT NULL,
  severity  TEXT NOT NULL DEFAULT 'high',
  expiresAt TEXT,
  isActive  INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL
);

-- Playbooks
CREATE TABLE IF NOT EXISTS playbooks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  description TEXT,
  isActive    INTEGER NOT NULL DEFAULT 1,
  createdAt   TEXT NOT NULL,
  updatedAt   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS playbook_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  playbookId  INTEGER NOT NULL,
  item        TEXT NOT NULL,
  phase       TEXT,
  "order"     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS incident_checklists (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  incidentId     INTEGER NOT NULL,
  playbookItemId INTEGER,
  item           TEXT NOT NULL,
  isDone         INTEGER NOT NULL DEFAULT 0,
  doneBy         TEXT,
  doneAt         TEXT,
  "order"        INTEGER NOT NULL DEFAULT 0
);
