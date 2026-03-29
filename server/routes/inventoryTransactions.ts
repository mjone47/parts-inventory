import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';

const router = Router();

interface TransactionRow {
  id: string;
  part_id: string;
  type: string;
  quantity: number;
  reference: string;
  notes: string;
  performed_by: string;
  date: string;
}

function formatTransaction(row: TransactionRow) {
  return {
    id: row.id,
    partId: row.part_id,
    type: row.type,
    quantity: row.quantity,
    reference: row.reference,
    notes: row.notes,
    performedBy: row.performed_by,
    date: row.date,
  };
}

router.get('/', (_req, res) => {
  const db = getDb();
  const transactions = db.prepare('SELECT * FROM inventory_transactions').all() as TransactionRow[];
  res.json(transactions.map(formatTransaction));
});

router.get('/part/:partId', (req, res) => {
  const db = getDb();
  const transactions = db.prepare('SELECT * FROM inventory_transactions WHERE part_id = ?').all(req.params.partId) as TransactionRow[];
  res.json(transactions.map(formatTransaction));
});

router.post('/', (req, res) => {
  const db = getDb();
  const { partId, type, quantity, reference, notes, performedBy, date } = req.body;
  const id = uuidv4();
  const now = date || new Date().toISOString();
  db.prepare(
    'INSERT INTO inventory_transactions (id, part_id, type, quantity, reference, notes, performed_by, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, partId, type, quantity || 0, reference || '', notes || '', performedBy || '', now);
  const transaction = db.prepare('SELECT * FROM inventory_transactions WHERE id = ?').get(id) as TransactionRow;
  res.status(201).json(formatTransaction(transaction));
});

export default router;
