import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';

const router = Router();

interface PartRow {
  id: string;
  part_number: string;
  name: string;
  description: string;
  category: string;
  image: string | null;
  quantity_in_stock: number;
  minimum_stock: number;
  unit_cost: number;
  qty_new: number;
  qty_like_new: number;
  qty_good: number;
  qty_fair: number;
  qty_poor: number;
  warehouse_location_id: string | null;
  created_at: string;
  updated_at: string;
}

interface PartVendorRow {
  id: string;
  part_id: string;
  vendor_id: string;
  vendor_part_number: string;
  cost: number;
  url: string;
  lead_time_days: number;
}

interface CompatRow {
  part_id: string;
  product_id: string;
}

function formatPart(row: PartRow, vendors: PartVendorRow[], compatibleProducts: string[]) {
  return {
    id: row.id,
    partNumber: row.part_number,
    name: row.name,
    description: row.description,
    category: row.category,
    image: row.image,
    quantityInStock: row.quantity_in_stock,
    minimumStock: row.minimum_stock,
    unitCost: row.unit_cost,
    qtyNew: row.qty_new ?? 0,
    qtyLikeNew: row.qty_like_new ?? 0,
    qtyGood: row.qty_good ?? 0,
    qtyFair: row.qty_fair ?? 0,
    qtyPoor: row.qty_poor ?? 0,
    warehouseLocationId: row.warehouse_location_id,
    vendors: vendors.map(v => ({
      vendorId: v.vendor_id,
      vendorPartNumber: v.vendor_part_number,
      cost: v.cost,
      url: v.url,
      leadTimeDays: v.lead_time_days,
    })),
    compatibleProducts,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getPartWithRelations(db: ReturnType<typeof getDb>, partId: string) {
  const part = db.prepare('SELECT * FROM parts WHERE id = ?').get(partId) as PartRow | undefined;
  if (!part) return null;
  const vendors = db.prepare('SELECT * FROM part_vendors WHERE part_id = ?').all(partId) as PartVendorRow[];
  const compats = db.prepare('SELECT product_id FROM part_compatible_products WHERE part_id = ?').all(partId) as CompatRow[];
  return formatPart(part, vendors, compats.map(c => c.product_id));
}

router.get('/', (_req, res) => {
  const db = getDb();
  const parts = db.prepare('SELECT * FROM parts').all() as PartRow[];
  const allVendors = db.prepare('SELECT * FROM part_vendors').all() as PartVendorRow[];
  const allCompats = db.prepare('SELECT * FROM part_compatible_products').all() as CompatRow[];
  const result = parts.map(p => {
    const vendors = allVendors.filter(v => v.part_id === p.id);
    const compats = allCompats.filter(c => c.part_id === p.id).map(c => c.product_id);
    return formatPart(p, vendors, compats);
  });
  res.json(result);
});

router.get('/search', (req, res) => {
  const db = getDb();
  const q = `%${req.query.q || ''}%`;
  const parts = db.prepare(
    'SELECT * FROM parts WHERE name LIKE ? OR part_number LIKE ? OR description LIKE ? OR category LIKE ?'
  ).all(q, q, q, q) as PartRow[];
  const allVendors = db.prepare('SELECT * FROM part_vendors').all() as PartVendorRow[];
  const allCompats = db.prepare('SELECT * FROM part_compatible_products').all() as CompatRow[];
  const result = parts.map(p => {
    const vendors = allVendors.filter(v => v.part_id === p.id);
    const compats = allCompats.filter(c => c.part_id === p.id).map(c => c.product_id);
    return formatPart(p, vendors, compats);
  });
  res.json(result);
});

// Generate next available PRC Part ID
router.get('/next-prc-id', (_req, res) => {
  const db = getDb();
  const row = db.prepare(
    "SELECT part_number FROM parts WHERE part_number LIKE 'PRC%' ORDER BY part_number DESC LIMIT 1"
  ).get() as { part_number: string } | undefined;

  let nextNum = 1;
  if (row) {
    const match = row.part_number.match(/^PRC(\d+)$/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }
  const nextId = 'PRC' + String(nextNum).padStart(7, '0');
  res.json({ partNumber: nextId });
});

// Check if a part number already exists
router.get('/check-duplicate/:partNumber', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id, name FROM parts WHERE part_number = ?').get(req.params.partNumber) as { id: string; name: string } | undefined;
  res.json({ exists: !!existing, partId: existing?.id, partName: existing?.name });
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const part = getPartWithRelations(db, req.params.id);
  if (!part) return res.status(404).json({ error: 'Part not found' });
  res.json(part);
});

router.post('/', (req, res) => {
  const db = getDb();
  const { partNumber, name, description, category, image, quantityInStock, minimumStock, unitCost, qtyNew, qtyLikeNew, qtyGood, qtyFair, qtyPoor, warehouseLocationId, vendors, compatibleProducts, createdAt, updatedAt } = req.body;

  // Check for duplicate part number
  const existing = db.prepare('SELECT id FROM parts WHERE part_number = ?').get(partNumber) as { id: string } | undefined;
  if (existing) {
    return res.status(409).json({ error: `Part number "${partNumber}" already exists.`, existingId: existing.id });
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO parts (id, part_number, name, description, category, image, quantity_in_stock, minimum_stock, unit_cost, qty_new, qty_like_new, qty_good, qty_fair, qty_poor, warehouse_location_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, partNumber, name, description || '', category || '', image || null, quantityInStock || 0, minimumStock || 0, unitCost || 0, qtyNew || 0, qtyLikeNew || 0, qtyGood || 0, qtyFair || 0, qtyPoor || 0, warehouseLocationId || null, createdAt || now, updatedAt || now);

  if (vendors && Array.isArray(vendors)) {
    const insertVendor = db.prepare('INSERT INTO part_vendors (id, part_id, vendor_id, vendor_part_number, cost, url, lead_time_days) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const v of vendors) {
      insertVendor.run(uuidv4(), id, v.vendorId, v.vendorPartNumber || '', v.cost || 0, v.url || '', v.leadTimeDays || 0);
    }
  }

  if (compatibleProducts && Array.isArray(compatibleProducts)) {
    const insertCompat = db.prepare('INSERT INTO part_compatible_products (part_id, product_id) VALUES (?, ?)');
    for (const productId of compatibleProducts) {
      insertCompat.run(id, productId);
    }
  }

  const part = getPartWithRelations(db, id);
  res.status(201).json(part);
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM parts WHERE id = ?').get(req.params.id) as PartRow | undefined;
  if (!existing) return res.status(404).json({ error: 'Part not found' });

  const { partNumber, name, description, category, image, quantityInStock, minimumStock, unitCost, qtyNew, qtyLikeNew, qtyGood, qtyFair, qtyPoor, warehouseLocationId, vendors, compatibleProducts } = req.body;

  // Check for duplicate part number (if changing)
  if (partNumber && partNumber !== existing.part_number) {
    const dup = db.prepare('SELECT id FROM parts WHERE part_number = ? AND id != ?').get(partNumber, req.params.id) as { id: string } | undefined;
    if (dup) {
      return res.status(409).json({ error: `Part number "${partNumber}" already exists.` });
    }
  }

  const now = new Date().toISOString();
  db.prepare(
    'UPDATE parts SET part_number = ?, name = ?, description = ?, category = ?, image = ?, quantity_in_stock = ?, minimum_stock = ?, unit_cost = ?, qty_new = ?, qty_like_new = ?, qty_good = ?, qty_fair = ?, qty_poor = ?, warehouse_location_id = ?, updated_at = ? WHERE id = ?'
  ).run(
    partNumber ?? existing.part_number,
    name ?? existing.name,
    description ?? existing.description,
    category ?? existing.category,
    image !== undefined ? image : existing.image,
    quantityInStock ?? existing.quantity_in_stock,
    minimumStock ?? existing.minimum_stock,
    unitCost ?? existing.unit_cost,
    qtyNew ?? (existing as any).qty_new ?? 0,
    qtyLikeNew ?? (existing as any).qty_like_new ?? 0,
    qtyGood ?? (existing as any).qty_good ?? 0,
    qtyFair ?? (existing as any).qty_fair ?? 0,
    qtyPoor ?? (existing as any).qty_poor ?? 0,
    warehouseLocationId !== undefined ? warehouseLocationId : existing.warehouse_location_id,
    now,
    req.params.id
  );

  if (vendors && Array.isArray(vendors)) {
    db.prepare('DELETE FROM part_vendors WHERE part_id = ?').run(req.params.id);
    const insertVendor = db.prepare('INSERT INTO part_vendors (id, part_id, vendor_id, vendor_part_number, cost, url, lead_time_days) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const v of vendors) {
      insertVendor.run(uuidv4(), req.params.id, v.vendorId, v.vendorPartNumber || '', v.cost || 0, v.url || '', v.leadTimeDays || 0);
    }
  }

  if (compatibleProducts && Array.isArray(compatibleProducts)) {
    db.prepare('DELETE FROM part_compatible_products WHERE part_id = ?').run(req.params.id);
    const insertCompat = db.prepare('INSERT INTO part_compatible_products (part_id, product_id) VALUES (?, ?)');
    for (const productId of compatibleProducts) {
      insertCompat.run(req.params.id, productId);
    }
  }

  const part = getPartWithRelations(db, req.params.id);
  res.json(part);
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM parts WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Part not found' });
  res.json({ success: true });
});

router.patch('/:id/stock', (req, res) => {
  const db = getDb();
  const { quantityChange, condition } = req.body;
  const existing = db.prepare('SELECT * FROM parts WHERE id = ?').get(req.params.id) as PartRow | undefined;
  if (!existing) return res.status(404).json({ error: 'Part not found' });

  const newQuantity = existing.quantity_in_stock + (quantityChange || 0);
  const now = new Date().toISOString();

  // Update total and condition-specific quantity
  const conditionMap: Record<string, string> = {
    'new': 'qty_new',
    'like_new': 'qty_like_new',
    'good': 'qty_good',
    'fair': 'qty_fair',
    'poor': 'qty_poor',
  };
  const condCol = condition ? conditionMap[condition] : null;
  if (condCol) {
    const currentCondQty = (existing as any)[condCol] || 0;
    const newCondQty = Math.max(0, currentCondQty + (quantityChange || 0));
    db.prepare(`UPDATE parts SET quantity_in_stock = ?, ${condCol} = ?, updated_at = ? WHERE id = ?`).run(
      Math.max(0, newQuantity), newCondQty, now, req.params.id
    );
  } else {
    db.prepare('UPDATE parts SET quantity_in_stock = ?, updated_at = ? WHERE id = ?').run(
      Math.max(0, newQuantity), now, req.params.id
    );
  }

  const part = getPartWithRelations(db, req.params.id);
  res.json(part);
});

export default router;
