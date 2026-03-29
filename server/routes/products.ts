import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';

const router = Router();

interface ProductRow {
  id: string;
  name: string;
  model: string;
  asin: string;
  upc: string;
  manufacturer: string;
  category: string;
  description: string;
  image: string | null;
  exploded_view_image: string | null;
  created_at: string;
}

interface ProductPartRow {
  id: string;
  product_id: string;
  part_id: string;
  position_label: string;
  x: number;
  y: number;
}

function formatProduct(row: ProductRow, parts: ProductPartRow[]) {
  return {
    id: row.id,
    name: row.name,
    model: row.model,
    asin: row.asin,
    upc: row.upc,
    manufacturer: row.manufacturer,
    category: row.category,
    description: row.description,
    image: row.image,
    explodedViewImage: row.exploded_view_image,
    parts: parts.map(p => ({
      id: p.id,
      partId: p.part_id,
      positionLabel: p.position_label,
      x: p.x,
      y: p.y,
    })),
    createdAt: row.created_at,
  };
}

router.get('/', (_req, res) => {
  const db = getDb();
  const products = db.prepare('SELECT * FROM products').all() as ProductRow[];
  const allParts = db.prepare('SELECT * FROM product_parts').all() as ProductPartRow[];
  const result = products.map(p => {
    const parts = allParts.filter(pp => pp.product_id === p.id);
    return formatProduct(p, parts);
  });
  res.json(result);
});

router.get('/search', (req, res) => {
  const db = getDb();
  const q = `%${req.query.q || ''}%`;
  const products = db.prepare(
    'SELECT * FROM products WHERE name LIKE ? OR model LIKE ? OR asin LIKE ? OR upc LIKE ? OR manufacturer LIKE ?'
  ).all(q, q, q, q, q) as ProductRow[];
  const allParts = db.prepare('SELECT * FROM product_parts').all() as ProductPartRow[];
  const result = products.map(p => {
    const parts = allParts.filter(pp => pp.product_id === p.id);
    return formatProduct(p, parts);
  });
  res.json(result);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as ProductRow | undefined;
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const parts = db.prepare('SELECT * FROM product_parts WHERE product_id = ?').all(req.params.id) as ProductPartRow[];
  res.json(formatProduct(product, parts));
});

router.post('/', (req, res) => {
  const db = getDb();
  const { name, model, asin, upc, manufacturer, category, description, image, explodedViewImage, parts, createdAt } = req.body;
  const id = uuidv4();
  const now = createdAt || new Date().toISOString();
  db.prepare(
    'INSERT INTO products (id, name, model, asin, upc, manufacturer, category, description, image, exploded_view_image, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, name, model || '', asin || '', upc || '', manufacturer || '', category || '', description || '', image || null, explodedViewImage || null, now);

  if (parts && Array.isArray(parts)) {
    const insertPart = db.prepare('INSERT INTO product_parts (id, product_id, part_id, position_label, x, y) VALUES (?, ?, ?, ?, ?, ?)');
    for (const p of parts) {
      insertPart.run(p.id || uuidv4(), id, p.partId, p.positionLabel || '', p.x || 0, p.y || 0);
    }
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as ProductRow;
  const productParts = db.prepare('SELECT * FROM product_parts WHERE product_id = ?').all(id) as ProductPartRow[];
  res.status(201).json(formatProduct(product, productParts));
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as ProductRow | undefined;
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  const { name, model, asin, upc, manufacturer, category, description, image, explodedViewImage, parts } = req.body;
  db.prepare(
    'UPDATE products SET name = ?, model = ?, asin = ?, upc = ?, manufacturer = ?, category = ?, description = ?, image = ?, exploded_view_image = ? WHERE id = ?'
  ).run(
    name ?? existing.name,
    model ?? existing.model,
    asin ?? existing.asin,
    upc ?? existing.upc,
    manufacturer ?? existing.manufacturer,
    category ?? existing.category,
    description ?? existing.description,
    image !== undefined ? image : existing.image,
    explodedViewImage !== undefined ? explodedViewImage : existing.exploded_view_image,
    req.params.id
  );

  if (parts && Array.isArray(parts)) {
    db.prepare('DELETE FROM product_parts WHERE product_id = ?').run(req.params.id);
    const insertPart = db.prepare('INSERT INTO product_parts (id, product_id, part_id, position_label, x, y) VALUES (?, ?, ?, ?, ?, ?)');
    for (const p of parts) {
      insertPart.run(p.id || uuidv4(), req.params.id, p.partId, p.positionLabel || '', p.x || 0, p.y || 0);
    }
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as ProductRow;
  const productParts = db.prepare('SELECT * FROM product_parts WHERE product_id = ?').all(req.params.id) as ProductPartRow[];
  res.json(formatProduct(product, productParts));
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Product not found' });
  res.json({ success: true });
});

export default router;
