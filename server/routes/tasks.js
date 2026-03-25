const { Router } = require('express');
const { getDb, parseJsonField, serializeJsonField } = require('../db');

const router = Router();

function deserializeTask(row) {
  if (!row) return null;
  return { ...row, assignedUserIds: parseJsonField(row.assignedUserIds) };
}

// GET /api/tasks
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM tasks ORDER BY createdAt DESC`).all();
  res.json(rows.map(deserializeTask));
});

// GET /api/tasks/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(deserializeTask(row));
});

// POST /api/tasks
router.post('/', (req, res) => {
  const db = getDb();
  const d = { ...req.body, assignedUserIds: serializeJsonField(req.body.assignedUserIds) };
  const info = db.prepare(`
    INSERT INTO tasks
      (title,description,priority,status,taskType,recurrenceFrequency,
       incidentId,assigneeId,assignedUserIds,dueDate,createdAt,updatedAt)
    VALUES
      (@title,@description,@priority,@status,@taskType,@recurrenceFrequency,
       @incidentId,@assigneeId,@assignedUserIds,@dueDate,@createdAt,@updatedAt)
  `).run(d);
  res.status(201).json(deserializeTask({ ...d, id: info.lastInsertRowid }));
});

// PUT /api/tasks/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  const existing = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const merged = {
    ...existing,
    ...req.body,
    id,
    assignedUserIds: serializeJsonField(req.body.assignedUserIds ?? parseJsonField(existing.assignedUserIds)),
  };
  db.prepare(`
    UPDATE tasks SET
      title=@title,description=@description,priority=@priority,status=@status,
      taskType=@taskType,recurrenceFrequency=@recurrenceFrequency,
      incidentId=@incidentId,assigneeId=@assigneeId,assignedUserIds=@assignedUserIds,
      dueDate=@dueDate,updatedAt=@updatedAt
    WHERE id=@id
  `).run(merged);
  res.json(deserializeTask(merged));
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  db.prepare(`DELETE FROM tasks WHERE id = ?`).run(id);
  db.prepare(`DELETE FROM task_comments WHERE taskId = ?`).run(id);
  db.prepare(`DELETE FROM task_checklist WHERE taskId = ?`).run(id);
  res.json({ ok: true });
});

// GET /api/tasks/:id/comments
router.get('/:id/comments', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM task_comments WHERE taskId = ? ORDER BY createdAt ASC`).all(req.params.id);
  res.json(rows);
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', (req, res) => {
  const db = getDb();
  const d = { ...req.body, taskId: parseInt(req.params.id) };
  const info = db.prepare(`
    INSERT INTO task_comments (taskId,userId,comment,createdAt)
    VALUES (@taskId,@userId,@comment,@createdAt)
  `).run(d);
  res.status(201).json({ ...d, id: info.lastInsertRowid });
});

// GET /api/tasks/:id/checklist
router.get('/:id/checklist', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM task_checklist WHERE taskId = ?`).all(req.params.id);
  res.json(rows.map(r => ({ ...r, isDone: !!r.isDone })));
});

// POST /api/tasks/:id/checklist
router.post('/:id/checklist', (req, res) => {
  const db = getDb();
  const d = { ...req.body, taskId: parseInt(req.params.id), isDone: req.body.isDone ? 1 : 0 };
  const info = db.prepare(`
    INSERT INTO task_checklist (taskId,item,isDone) VALUES (@taskId,@item,@isDone)
  `).run(d);
  res.status(201).json({ ...d, id: info.lastInsertRowid, isDone: !!d.isDone });
});

// PUT /api/tasks/checklist/:itemId
router.put('/checklist/:itemId', (req, res) => {
  const db = getDb();
  db.prepare(`UPDATE task_checklist SET isDone=? WHERE id=?`).run(req.body.isDone ? 1 : 0, req.params.itemId);
  res.json({ ok: true });
});

module.exports = router;
