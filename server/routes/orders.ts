import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';

const router = Router();

interface OrderRow {
  id: string;
  order_number: string;
  vendor_id: string;
  status: string;
  order_date: string;
  expected_delivery: string;
  tracking_number: string;
  notes: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  created_by: string;
  created_at: string;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  part_id: string;
  quantity: number;
  unit_cost: number;
  received_quantity: number;
}

function formatOrder(row: OrderRow, items: OrderItemRow[]) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    vendorId: row.vendor_id,
    status: row.status,
    orderDate: row.order_date,
    expectedDelivery: row.expected_delivery,
    trackingNumber: row.tracking_number,
    notes: row.notes,
    subtotal: row.subtotal,
    tax: row.tax,
    shipping: row.shipping,
    total: row.total,
    createdBy: row.created_by,
    createdAt: row.created_at,
    items: items.map(i => ({
      id: i.id,
      partId: i.part_id,
      quantity: i.quantity,
      unitCost: i.unit_cost,
      receivedQuantity: i.received_quantity,
    })),
  };
}

router.get('/', (_req, res) => {
  const db = getDb();
  const orders = db.prepare('SELECT * FROM orders').all() as OrderRow[];
  const allItems = db.prepare('SELECT * FROM order_items').all() as OrderItemRow[];
  const result = orders.map(o => {
    const items = allItems.filter(i => i.order_id === o.id);
    return formatOrder(o, items);
  });
  res.json(result);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as OrderRow | undefined;
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id) as OrderItemRow[];
  res.json(formatOrder(order, items));
});

router.post('/', (req, res) => {
  const db = getDb();
  const { orderNumber, vendorId, status, orderDate, expectedDelivery, trackingNumber, notes, subtotal, tax, shipping, total, createdBy, items } = req.body;
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO orders (id, order_number, vendor_id, status, order_date, expected_delivery, tracking_number, notes, subtotal, tax, shipping, total, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, orderNumber, vendorId, status || 'draft', orderDate || '', expectedDelivery || '', trackingNumber || '', notes || '', subtotal || 0, tax || 0, shipping || 0, total || 0, createdBy || '', now);

  if (items && Array.isArray(items)) {
    const insertItem = db.prepare('INSERT INTO order_items (id, order_id, part_id, quantity, unit_cost, received_quantity) VALUES (?, ?, ?, ?, ?, ?)');
    for (const item of items) {
      insertItem.run(item.id || uuidv4(), id, item.partId, item.quantity || 0, item.unitCost || 0, item.receivedQuantity || 0);
    }
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as OrderRow;
  const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id) as OrderItemRow[];
  res.status(201).json(formatOrder(order, orderItems));
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as OrderRow | undefined;
  if (!existing) return res.status(404).json({ error: 'Order not found' });

  const { orderNumber, vendorId, status, orderDate, expectedDelivery, trackingNumber, notes, subtotal, tax, shipping, total, createdBy, items } = req.body;
  db.prepare(
    'UPDATE orders SET order_number = ?, vendor_id = ?, status = ?, order_date = ?, expected_delivery = ?, tracking_number = ?, notes = ?, subtotal = ?, tax = ?, shipping = ?, total = ?, created_by = ? WHERE id = ?'
  ).run(
    orderNumber ?? existing.order_number,
    vendorId ?? existing.vendor_id,
    status ?? existing.status,
    orderDate ?? existing.order_date,
    expectedDelivery ?? existing.expected_delivery,
    trackingNumber ?? existing.tracking_number,
    notes ?? existing.notes,
    subtotal ?? existing.subtotal,
    tax ?? existing.tax,
    shipping ?? existing.shipping,
    total ?? existing.total,
    createdBy ?? existing.created_by,
    req.params.id
  );

  if (items && Array.isArray(items)) {
    db.prepare('DELETE FROM order_items WHERE order_id = ?').run(req.params.id);
    const insertItem = db.prepare('INSERT INTO order_items (id, order_id, part_id, quantity, unit_cost, received_quantity) VALUES (?, ?, ?, ?, ?, ?)');
    for (const item of items) {
      insertItem.run(item.id || uuidv4(), req.params.id, item.partId, item.quantity || 0, item.unitCost || 0, item.receivedQuantity || 0);
    }
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as OrderRow;
  const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id) as OrderItemRow[];
  res.json(formatOrder(order, orderItems));
});

router.patch('/:id/status', (req, res) => {
  const db = getDb();
  const { status } = req.body;
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as OrderRow | undefined;
  if (!existing) return res.status(404).json({ error: 'Order not found' });

  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as OrderRow;
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id) as OrderItemRow[];
  res.json(formatOrder(order, items));
});

router.post('/:id/receive', (req, res) => {
  const db = getDb();
  const { receivedItems } = req.body;
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as OrderRow | undefined;
  if (!existing) return res.status(404).json({ error: 'Order not found' });

  if (receivedItems && Array.isArray(receivedItems)) {
    const updateItem = db.prepare('UPDATE order_items SET received_quantity = received_quantity + ? WHERE id = ?');
    for (const ri of receivedItems) {
      updateItem.run(ri.quantity || 0, ri.itemId);
    }
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as OrderRow;
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id) as OrderItemRow[];
  res.json(formatOrder(order, items));
});

export default router;
