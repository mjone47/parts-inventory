import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';

const router = Router();

interface InternalOrderRow {
  id: string;
  requested_by: string;
  workstation: string;
  priority: string;
  status: string;
  notes: string;
  assigned_runner: string | null;
  requested_at: string;
  pulled_at: string | null;
  delivered_at: string | null;
}

interface InternalOrderItemRow {
  id: string;
  order_id: string;
  part_id: string;
  part_number: string;
  part_name: string;
  quantity_requested: number;
  quantity_pulled: number;
  warehouse_location_id: string | null;
  pulled: number;
}

function formatInternalOrder(row: InternalOrderRow, items: InternalOrderItemRow[]) {
  return {
    id: row.id,
    requestedBy: row.requested_by,
    workstation: row.workstation,
    priority: row.priority,
    status: row.status,
    notes: row.notes,
    assignedRunner: row.assigned_runner,
    requestedAt: row.requested_at,
    pulledAt: row.pulled_at,
    deliveredAt: row.delivered_at,
    items: items.map(i => ({
      id: i.id,
      partId: i.part_id,
      partNumber: i.part_number,
      partName: i.part_name,
      quantityRequested: i.quantity_requested,
      quantityPulled: i.quantity_pulled,
      warehouseLocationId: i.warehouse_location_id,
      pulled: i.pulled === 1,
    })),
  };
}

router.get('/', (_req, res) => {
  const db = getDb();
  const orders = db.prepare('SELECT * FROM internal_orders').all() as InternalOrderRow[];
  const allItems = db.prepare('SELECT * FROM internal_order_items').all() as InternalOrderItemRow[];
  const result = orders.map(o => {
    const items = allItems.filter(i => i.order_id === o.id);
    return formatInternalOrder(o, items);
  });
  res.json(result);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM internal_orders WHERE id = ?').get(req.params.id) as InternalOrderRow | undefined;
  if (!order) return res.status(404).json({ error: 'Internal order not found' });
  const items = db.prepare('SELECT * FROM internal_order_items WHERE order_id = ?').all(req.params.id) as InternalOrderItemRow[];
  res.json(formatInternalOrder(order, items));
});

router.post('/', (req, res) => {
  const db = getDb();
  const { requestedBy, workstation, priority, status, notes, assignedRunner, items } = req.body;
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO internal_orders (id, requested_by, workstation, priority, status, notes, assigned_runner, requested_at, pulled_at, delivered_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, requestedBy, workstation || '', priority || 'normal', status || 'new', notes || '', assignedRunner || null, now, null, null);

  if (items && Array.isArray(items)) {
    const insertItem = db.prepare(
      'INSERT INTO internal_order_items (id, order_id, part_id, part_number, part_name, quantity_requested, quantity_pulled, warehouse_location_id, pulled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const item of items) {
      insertItem.run(
        item.id || uuidv4(), id, item.partId, item.partNumber || '', item.partName || '',
        item.quantityRequested || 1, item.quantityPulled || 0, item.warehouseLocationId || null, item.pulled ? 1 : 0
      );
    }
  }

  const order = db.prepare('SELECT * FROM internal_orders WHERE id = ?').get(id) as InternalOrderRow;
  const orderItems = db.prepare('SELECT * FROM internal_order_items WHERE order_id = ?').all(id) as InternalOrderItemRow[];
  res.status(201).json(formatInternalOrder(order, orderItems));
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM internal_orders WHERE id = ?').get(req.params.id) as InternalOrderRow | undefined;
  if (!existing) return res.status(404).json({ error: 'Internal order not found' });

  const { requestedBy, workstation, priority, status, notes, assignedRunner, items } = req.body;
  db.prepare(
    'UPDATE internal_orders SET requested_by = ?, workstation = ?, priority = ?, status = ?, notes = ?, assigned_runner = ? WHERE id = ?'
  ).run(
    requestedBy ?? existing.requested_by,
    workstation ?? existing.workstation,
    priority ?? existing.priority,
    status ?? existing.status,
    notes ?? existing.notes,
    assignedRunner !== undefined ? assignedRunner : existing.assigned_runner,
    req.params.id
  );

  if (items && Array.isArray(items)) {
    db.prepare('DELETE FROM internal_order_items WHERE order_id = ?').run(req.params.id);
    const insertItem = db.prepare(
      'INSERT INTO internal_order_items (id, order_id, part_id, part_number, part_name, quantity_requested, quantity_pulled, warehouse_location_id, pulled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const item of items) {
      insertItem.run(
        item.id || uuidv4(), req.params.id, item.partId, item.partNumber || '', item.partName || '',
        item.quantityRequested || 1, item.quantityPulled || 0, item.warehouseLocationId || null, item.pulled ? 1 : 0
      );
    }
  }

  const order = db.prepare('SELECT * FROM internal_orders WHERE id = ?').get(req.params.id) as InternalOrderRow;
  const orderItems = db.prepare('SELECT * FROM internal_order_items WHERE order_id = ?').all(req.params.id) as InternalOrderItemRow[];
  res.json(formatInternalOrder(order, orderItems));
});

router.patch('/:id/status', (req, res) => {
  const db = getDb();
  const { status, runnerId } = req.body;
  const existing = db.prepare('SELECT * FROM internal_orders WHERE id = ?').get(req.params.id) as InternalOrderRow | undefined;
  if (!existing) return res.status(404).json({ error: 'Internal order not found' });

  const now = new Date().toISOString();
  let assignedRunner = existing.assigned_runner;
  let pulledAt = existing.pulled_at;
  let deliveredAt = existing.delivered_at;

  if (runnerId) {
    assignedRunner = runnerId;
  }

  if (status === 'pulling' || status === 'pulled') {
    pulledAt = now;
  }

  if (status === 'delivered') {
    deliveredAt = now;
  }

  db.prepare(
    'UPDATE internal_orders SET status = ?, assigned_runner = ?, pulled_at = ?, delivered_at = ? WHERE id = ?'
  ).run(status, assignedRunner, pulledAt, deliveredAt, req.params.id);

  const order = db.prepare('SELECT * FROM internal_orders WHERE id = ?').get(req.params.id) as InternalOrderRow;
  const items = db.prepare('SELECT * FROM internal_order_items WHERE order_id = ?').all(req.params.id) as InternalOrderItemRow[];
  res.json(formatInternalOrder(order, items));
});

export default router;
