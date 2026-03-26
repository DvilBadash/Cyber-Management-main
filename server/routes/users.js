const { Router } = require('express');
const { getDb } = require('../db');

const router = Router();

function verifyPassword(input, hash) {
  // btoa-encoded (primary)
  if (hash === Buffer.from(input).toString('base64')) return true;
  // Legacy demo hashes
  if (hash === `hashed_${input}`) return true;
  return false;
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const db = getDb();
  const { username, password } = req.body;
  const user = db.prepare(`SELECT * FROM users WHERE username = ? AND isActive = 1`).get(username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (!verifyPassword(password, user.passwordHash)) return res.status(401).json({ error: 'Invalid credentials' });

  const now = new Date().toISOString();
  db.prepare(`UPDATE users SET lastLogin = ? WHERE id = ?`).run(now, user.id);
  db.prepare(`INSERT INTO activity_log (userId,action,module,details,timestamp) VALUES (?,?,?,?,?)`)
    .run(user.id, 'כניסה למערכת', 'מערכת', `משתמש ${user.username} התחבר`, now);

  res.json({ ...user, lastLogin: now });
});

// GET /api/users
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM users ORDER BY fullName ASC`).all();
  res.json(rows.map(u => ({ ...u, isActive: !!u.isActive })));
});

// GET /api/users/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ ...row, isActive: !!row.isActive });
});

// POST /api/users
router.post('/', (req, res) => {
  const db = getDb();
  const d = { ...req.body, isActive: req.body.isActive ? 1 : 0 };
  const info = db.prepare(`
    INSERT INTO users (fullName,username,passwordHash,email,phone,role,department,avatarUrl,isActive,createdAt,lastLogin)
    VALUES (@fullName,@username,@passwordHash,@email,@phone,@role,@department,@avatarUrl,@isActive,@createdAt,@lastLogin)
  `).run(d);
  res.status(201).json({ ...d, id: info.lastInsertRowid, isActive: !!d.isActive });
});

// PUT /api/users/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  const existing = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const merged = { ...existing, ...req.body, id, isActive: req.body.isActive !== undefined ? (req.body.isActive ? 1 : 0) : existing.isActive };
  db.prepare(`
    UPDATE users SET
      fullName=@fullName,username=@username,passwordHash=@passwordHash,email=@email,
      phone=@phone,role=@role,department=@department,avatarUrl=@avatarUrl,
      isActive=@isActive,lastLogin=@lastLogin
    WHERE id=@id
  `).run({ id, fullName: merged.fullName, username: merged.username, passwordHash: merged.passwordHash, email: merged.email, phone: merged.phone, role: merged.role, department: merged.department, avatarUrl: merged.avatarUrl, isActive: merged.isActive, lastLogin: merged.lastLogin });
  res.json({ ...merged, isActive: !!merged.isActive });
});

// DELETE /api/users/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  // Prevent deleting socadmin
  const user = db.prepare(`SELECT username FROM users WHERE id = ?`).get(req.params.id);
  if (user?.username === 'socadmin') return res.status(403).json({ error: 'Cannot delete system admin' });
  db.prepare(`DELETE FROM users WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// PATCH /api/users/:id/password
router.patch('/:id/password', (req, res) => {
  const db = getDb();
  const { password } = req.body;
  const hash = Buffer.from(password).toString('base64');
  db.prepare(`UPDATE users SET passwordHash = ? WHERE id = ?`).run(hash, req.params.id);
  res.json({ ok: true });
});

// GET /api/users/:id/permissions
router.get('/:id/permissions', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM permissions WHERE userId = ?`).all(req.params.id);
  res.json(rows.map(r => ({ ...r, canRead: !!r.canRead, canWrite: !!r.canWrite, canDelete: !!r.canDelete, canAdmin: !!r.canAdmin })));
});

// POST /api/users/:id/permissions
router.post('/:id/permissions', (req, res) => {
  const db = getDb();
  const d = {
    ...req.body,
    userId: parseInt(req.params.id),
    canRead: req.body.canRead ? 1 : 0,
    canWrite: req.body.canWrite ? 1 : 0,
    canDelete: req.body.canDelete ? 1 : 0,
    canAdmin: req.body.canAdmin ? 1 : 0,
  };
  const info = db.prepare(`
    INSERT INTO permissions (userId,module,canRead,canWrite,canDelete,canAdmin)
    VALUES (@userId,@module,@canRead,@canWrite,@canDelete,@canAdmin)
  `).run(d);
  res.status(201).json({ ...d, id: info.lastInsertRowid });
});

// GET /api/users/activity
router.get('/activity/log', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 200`).all();
  res.json(rows);
});

// POST /api/users/activity
router.post('/activity/log', (req, res) => {
  const db = getDb();
  const d = req.body;
  const info = db.prepare(`
    INSERT INTO activity_log (userId,action,module,details,ipAddress,timestamp)
    VALUES (@userId,@action,@module,@details,@ipAddress,@timestamp)
  `).run(d);
  res.status(201).json({ ...d, id: info.lastInsertRowid });
});

module.exports = router;
