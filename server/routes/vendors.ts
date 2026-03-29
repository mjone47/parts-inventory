import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';

const router = Router();

interface VendorRow {
  id: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  notes: string;
  created_at: string;
}

function formatVendor(row: VendorRow) {
  return {
    id: row.id,
    name: row.name,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    website: row.website,
    address: row.address,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

router.get('/', (_req, res) => {
  const db = getDb();
  const vendors = db.prepare('SELECT * FROM vendors').all() as VendorRow[];
  res.json(vendors.map(formatVendor));
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id) as VendorRow | undefined;
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
  res.json(formatVendor(vendor));
});

router.post('/', (req, res) => {
  const db = getDb();
  const { name, contactName, email, phone, website, address, notes } = req.body;
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO vendors (id, name, contact_name, email, phone, website, address, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, name, contactName || '', email || '', phone || '', website || '', address || '', notes || '', now);
  const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(id) as VendorRow;
  res.status(201).json(formatVendor(vendor));
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id) as VendorRow | undefined;
  if (!existing) return res.status(404).json({ error: 'Vendor not found' });

  const { name, contactName, email, phone, website, address, notes } = req.body;
  db.prepare(
    'UPDATE vendors SET name = ?, contact_name = ?, email = ?, phone = ?, website = ?, address = ?, notes = ? WHERE id = ?'
  ).run(
    name ?? existing.name,
    contactName ?? existing.contact_name,
    email ?? existing.email,
    phone ?? existing.phone,
    website ?? existing.website,
    address ?? existing.address,
    notes ?? existing.notes,
    req.params.id
  );
  const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id) as VendorRow;
  res.json(formatVendor(vendor));
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM vendors WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Vendor not found' });
  res.json({ success: true });
});

export default router;
