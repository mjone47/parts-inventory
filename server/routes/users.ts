import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';

const router = Router();

router.get('/', (_req, res) => {
  const db = getDb();
  const users = db.prepare('SELECT * FROM users').all();
  res.json(users);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.post('/', (req, res) => {
  const db = getDb();
  const { name, email, role, avatar } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO users (id, name, email, role, avatar) VALUES (?, ?, ?, ?, ?)').run(id, name, email, role || 'viewer', avatar || null);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.status(201).json(user);
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, email, role, avatar } = req.body;
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'User not found' });
  db.prepare('UPDATE users SET name = ?, email = ?, role = ?, avatar = ? WHERE id = ?').run(
    name ?? (existing as any).name,
    email ?? (existing as any).email,
    role ?? (existing as any).role,
    avatar !== undefined ? avatar : (existing as any).avatar,
    req.params.id
  );
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  res.json(user);
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ success: true });
});

export default router;
