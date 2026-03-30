import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { getOdooClient } from '../odoo';

const router = Router();

// ── Health check ──────────────────────────────────────────────────────────────

router.get('/health', async (_req, res) => {
  const odoo = getOdooClient();
  if (!odoo) return res.json({ connected: false, reason: 'not_configured' });

  const connected = await odoo.isConnected();
  res.json({ connected });
});

// ── LPN Lookup (local first, then Odoo) ───────────────────────────────────────

router.get('/lpn/:lpn', async (req, res) => {
  const { lpn } = req.params;
  const db = getDb();

  // Check local lpn_records first
  const localRecord = db.prepare(
    'SELECT * FROM lpn_records WHERE lpn = ?'
  ).get(lpn) as {
    id: string;
    lpn: string;
    product_id: string | null;
    odoo_lot_id: number | null;
    odoo_product_id: number | null;
    odoo_product_name: string;
    odoo_product_ref: string;
    first_seen_at: string;
    last_seen_at: string;
    notes: string;
  } | undefined;

  if (localRecord) {
    // Update last_seen_at
    db.prepare('UPDATE lpn_records SET last_seen_at = ? WHERE id = ?').run(
      new Date().toISOString(),
      localRecord.id,
    );

    // Get linked local product if any
    let localProduct = null;
    if (localRecord.product_id) {
      const p = db.prepare('SELECT id, name, model FROM products WHERE id = ?').get(localRecord.product_id) as { id: string; name: string; model: string } | undefined;
      if (p) localProduct = p;
    }

    return res.json({
      found: true,
      source: 'local',
      lpnRecord: {
        id: localRecord.id,
        lpn: localRecord.lpn,
        productId: localRecord.product_id,
        odooLotId: localRecord.odoo_lot_id,
        odooProductId: localRecord.odoo_product_id,
        odooProductName: localRecord.odoo_product_name,
        odooProductRef: localRecord.odoo_product_ref,
        firstSeenAt: localRecord.first_seen_at,
        lastSeenAt: localRecord.last_seen_at,
        notes: localRecord.notes,
      },
      localProduct,
    });
  }

  // Not found locally — query Odoo
  const odoo = getOdooClient();
  if (!odoo) {
    return res.json({ found: false, odooAvailable: false });
  }

  const lotResult = await odoo.lookupByLPN(lpn);
  if (!lotResult) {
    return res.json({ found: false, odooAvailable: true });
  }

  // Get full product details from Odoo
  const odooProduct = await odoo.getProduct(lotResult.productId);

  // Check if a matching local product already exists (match by ASIN/default_code or name)
  let matchingLocalProduct = null;
  if (lotResult.productRef) {
    const byAsin = db.prepare(
      'SELECT id, name, model FROM products WHERE asin = ?'
    ).get(lotResult.productRef) as { id: string; name: string; model: string } | undefined;
    if (byAsin) matchingLocalProduct = byAsin;
  }
  if (!matchingLocalProduct) {
    const byName = db.prepare(
      'SELECT id, name, model FROM products WHERE name = ?'
    ).get(lotResult.productName) as { id: string; name: string; model: string } | undefined;
    if (byName) matchingLocalProduct = byName;
  }

  res.json({
    found: true,
    source: 'odoo',
    odooData: {
      ...lotResult,
      product: odooProduct,
    },
    matchingLocalProduct,
  });
});

// ── LPN Search (fuzzy search in Odoo) ─────────────────────────────────────────

router.get('/lpn-search', async (req, res) => {
  const q = (req.query.q as string || '').trim();
  if (!q) return res.json({ results: [] });

  const odoo = getOdooClient();
  if (!odoo) return res.json({ results: [], odooAvailable: false });

  const results = await odoo.searchByLPN(q, 10);
  res.json({ results, odooAvailable: true });
});

// ── Save LPN record locally ───────────────────────────────────────────────────

router.post('/lpn', (req, res) => {
  const db = getDb();
  const { lpn, productId, odooLotId, odooProductId, odooProductName, odooProductRef, notes } = req.body;

  if (!lpn) return res.status(400).json({ error: 'LPN is required' });

  // Check if already exists
  const existing = db.prepare('SELECT id FROM lpn_records WHERE lpn = ?').get(lpn) as { id: string } | undefined;
  if (existing) {
    // Update the existing record
    db.prepare(
      'UPDATE lpn_records SET product_id = COALESCE(?, product_id), last_seen_at = ?, notes = COALESCE(?, notes) WHERE id = ?'
    ).run(productId || null, new Date().toISOString(), notes || null, existing.id);
    const updated = db.prepare('SELECT * FROM lpn_records WHERE id = ?').get(existing.id);
    return res.json(formatLpnRecord(updated));
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO lpn_records (id, lpn, product_id, odoo_lot_id, odoo_product_id, odoo_product_name, odoo_product_ref, first_seen_at, last_seen_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, lpn, productId || null, odooLotId || null, odooProductId || null, odooProductName || '', odooProductRef || '', now, now, notes || '');

  const record = db.prepare('SELECT * FROM lpn_records WHERE id = ?').get(id);
  res.status(201).json(formatLpnRecord(record));
});

// ── LPN history (chain of custody) ────────────────────────────────────────────

router.get('/lpn/:lpn/history', (req, res) => {
  const db = getDb();
  const { lpn } = req.params;

  const lpnRecord = db.prepare('SELECT * FROM lpn_records WHERE lpn = ?').get(lpn);
  const sessions = db.prepare(
    'SELECT * FROM harvest_sessions WHERE lpn = ? ORDER BY date DESC'
  ).all(lpn);

  res.json({
    lpnRecord: lpnRecord ? formatLpnRecord(lpnRecord) : null,
    harvestSessions: sessions,
  });
});

// ── Odoo product search ───────────────────────────────────────────────────────

router.get('/products', async (req, res) => {
  const q = (req.query.q as string || '').trim();
  if (!q) return res.json({ results: [] });

  const odoo = getOdooClient();
  if (!odoo) return res.json({ results: [], odooAvailable: false });

  const results = await odoo.searchProducts(q, 10);
  res.json({ results, odooAvailable: true });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatLpnRecord(row: any) {
  return {
    id: row.id,
    lpn: row.lpn,
    productId: row.product_id,
    odooLotId: row.odoo_lot_id,
    odooProductId: row.odoo_product_id,
    odooProductName: row.odoo_product_name,
    odooProductRef: row.odoo_product_ref,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    notes: row.notes,
  };
}

export default router;
