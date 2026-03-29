import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';

const router = Router();

interface SessionRow {
  id: string;
  product_id: string;
  serial_number: string;
  condition: string;
  notes: string;
  harvested_by: string;
  date: string;
  status: string;
}

interface HarvestedPartRow {
  id: string;
  session_id: string;
  part_id: string;
  quantity: number;
  condition: string;
  notes: string;
  added_to_inventory: number;
}

function formatSession(row: SessionRow, parts: HarvestedPartRow[]) {
  return {
    id: row.id,
    productId: row.product_id,
    serialNumber: row.serial_number,
    condition: row.condition,
    notes: row.notes,
    harvestedParts: parts.map(p => ({
      id: p.id,
      partId: p.part_id,
      quantity: p.quantity,
      condition: p.condition,
      notes: p.notes,
      addedToInventory: p.added_to_inventory === 1,
    })),
    harvestedBy: row.harvested_by,
    date: row.date,
    status: row.status,
  };
}

router.get('/', (_req, res) => {
  const db = getDb();
  const sessions = db.prepare('SELECT * FROM harvest_sessions').all() as SessionRow[];
  const allParts = db.prepare('SELECT * FROM harvested_parts').all() as HarvestedPartRow[];
  const result = sessions.map(s => {
    const parts = allParts.filter(p => p.session_id === s.id);
    return formatSession(s, parts);
  });
  res.json(result);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const session = db.prepare('SELECT * FROM harvest_sessions WHERE id = ?').get(req.params.id) as SessionRow | undefined;
  if (!session) return res.status(404).json({ error: 'Harvest session not found' });
  const parts = db.prepare('SELECT * FROM harvested_parts WHERE session_id = ?').all(req.params.id) as HarvestedPartRow[];
  res.json(formatSession(session, parts));
});

router.post('/', (req, res) => {
  const db = getDb();
  const { productId, serialNumber, condition, notes, harvestedBy, date, status } = req.body;
  const id = uuidv4();
  const now = date || new Date().toISOString();
  db.prepare(
    'INSERT INTO harvest_sessions (id, product_id, serial_number, condition, notes, harvested_by, date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, productId, serialNumber || '', condition || 'good', notes || '', harvestedBy, now, status || 'in_progress');
  const session = db.prepare('SELECT * FROM harvest_sessions WHERE id = ?').get(id) as SessionRow;
  const parts = db.prepare('SELECT * FROM harvested_parts WHERE session_id = ?').all(id) as HarvestedPartRow[];
  res.status(201).json(formatSession(session, parts));
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM harvest_sessions WHERE id = ?').get(req.params.id) as SessionRow | undefined;
  if (!existing) return res.status(404).json({ error: 'Harvest session not found' });

  const { productId, serialNumber, condition, notes, harvestedBy, date, status } = req.body;
  db.prepare(
    'UPDATE harvest_sessions SET product_id = ?, serial_number = ?, condition = ?, notes = ?, harvested_by = ?, date = ?, status = ? WHERE id = ?'
  ).run(
    productId ?? existing.product_id,
    serialNumber ?? existing.serial_number,
    condition ?? existing.condition,
    notes ?? existing.notes,
    harvestedBy ?? existing.harvested_by,
    date ?? existing.date,
    status ?? existing.status,
    req.params.id
  );
  const session = db.prepare('SELECT * FROM harvest_sessions WHERE id = ?').get(req.params.id) as SessionRow;
  const parts = db.prepare('SELECT * FROM harvested_parts WHERE session_id = ?').all(req.params.id) as HarvestedPartRow[];
  res.json(formatSession(session, parts));
});

router.put('/:id/complete', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM harvest_sessions WHERE id = ?').get(req.params.id) as SessionRow | undefined;
  if (!existing) return res.status(404).json({ error: 'Harvest session not found' });

  db.prepare('UPDATE harvest_sessions SET status = ? WHERE id = ?').run('completed', req.params.id);
  const session = db.prepare('SELECT * FROM harvest_sessions WHERE id = ?').get(req.params.id) as SessionRow;
  const parts = db.prepare('SELECT * FROM harvested_parts WHERE session_id = ?').all(req.params.id) as HarvestedPartRow[];
  res.json(formatSession(session, parts));
});

router.post('/:id/parts', (req, res) => {
  const db = getDb();
  const session = db.prepare('SELECT * FROM harvest_sessions WHERE id = ?').get(req.params.id) as SessionRow | undefined;
  if (!session) return res.status(404).json({ error: 'Harvest session not found' });

  const { partId, quantity, condition, notes, addedToInventory } = req.body;
  const id = uuidv4();
  db.prepare(
    'INSERT INTO harvested_parts (id, session_id, part_id, quantity, condition, notes, added_to_inventory) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.params.id, partId, quantity || 1, condition || 'good', notes || '', addedToInventory ? 1 : 0);

  const updatedSession = db.prepare('SELECT * FROM harvest_sessions WHERE id = ?').get(req.params.id) as SessionRow;
  const parts = db.prepare('SELECT * FROM harvested_parts WHERE session_id = ?').all(req.params.id) as HarvestedPartRow[];
  res.status(201).json(formatSession(updatedSession, parts));
});

export default router;
