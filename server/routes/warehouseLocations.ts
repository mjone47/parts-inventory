import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';

const router = Router();

interface LocationRow {
  id: string;
  name: string;
  zone: string;
  aisle: string;
  shelf: string;
  bin: string;
  description: string;
  barcode: string;
}

interface LocationPartRow {
  location_id: string;
  part_id: string;
}

function formatLocation(row: LocationRow, partIds: string[]) {
  return {
    id: row.id,
    name: row.name,
    zone: row.zone,
    aisle: row.aisle,
    shelf: row.shelf,
    bin: row.bin,
    description: row.description,
    barcode: row.barcode,
    partIds,
  };
}

router.get('/', (_req, res) => {
  const db = getDb();
  const locations = db.prepare('SELECT * FROM warehouse_locations').all() as LocationRow[];
  const allParts = db.prepare('SELECT * FROM location_parts').all() as LocationPartRow[];
  const result = locations.map(l => {
    const partIds = allParts.filter(lp => lp.location_id === l.id).map(lp => lp.part_id);
    return formatLocation(l, partIds);
  });
  res.json(result);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const location = db.prepare('SELECT * FROM warehouse_locations WHERE id = ?').get(req.params.id) as LocationRow | undefined;
  if (!location) return res.status(404).json({ error: 'Location not found' });
  const parts = db.prepare('SELECT part_id FROM location_parts WHERE location_id = ?').all(req.params.id) as LocationPartRow[];
  res.json(formatLocation(location, parts.map(p => p.part_id)));
});

router.post('/', (req, res) => {
  const db = getDb();
  const { name, zone, aisle, shelf, bin, description, barcode } = req.body;
  const id = uuidv4();
  db.prepare(
    'INSERT INTO warehouse_locations (id, name, zone, aisle, shelf, bin, description, barcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, name, zone, aisle || '', shelf || '', bin || '', description || '', barcode || '');
  const location = db.prepare('SELECT * FROM warehouse_locations WHERE id = ?').get(id) as LocationRow;
  res.status(201).json(formatLocation(location, []));
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM warehouse_locations WHERE id = ?').get(req.params.id) as LocationRow | undefined;
  if (!existing) return res.status(404).json({ error: 'Location not found' });

  const { name, zone, aisle, shelf, bin, description, barcode } = req.body;
  db.prepare(
    'UPDATE warehouse_locations SET name = ?, zone = ?, aisle = ?, shelf = ?, bin = ?, description = ?, barcode = ? WHERE id = ?'
  ).run(
    name ?? existing.name,
    zone ?? existing.zone,
    aisle ?? existing.aisle,
    shelf ?? existing.shelf,
    bin ?? existing.bin,
    description ?? existing.description,
    barcode ?? existing.barcode,
    req.params.id
  );
  const location = db.prepare('SELECT * FROM warehouse_locations WHERE id = ?').get(req.params.id) as LocationRow;
  const parts = db.prepare('SELECT part_id FROM location_parts WHERE location_id = ?').all(req.params.id) as LocationPartRow[];
  res.json(formatLocation(location, parts.map(p => p.part_id)));
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM warehouse_locations WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Location not found' });
  res.json({ success: true });
});

router.post('/rename-zone', (req, res) => {
  const db = getDb();
  const { oldZone, newZone } = req.body;
  const locations = db.prepare('SELECT * FROM warehouse_locations WHERE zone = ?').all(oldZone) as LocationRow[];
  if (locations.length === 0) return res.status(404).json({ error: 'No locations found in zone' });

  for (const loc of locations) {
    const newName = `${newZone}-${loc.aisle}-${loc.shelf}-${loc.bin}`;
    const paddedAisle = loc.aisle.padStart(2, '0');
    const paddedShelf = loc.shelf.padStart(2, '0');
    const paddedBin = loc.bin.padStart(2, '0');
    const newBarcode = `WL-${newZone}${paddedAisle}-${paddedShelf}-${paddedBin}`;
    db.prepare('UPDATE warehouse_locations SET zone = ?, name = ?, barcode = ? WHERE id = ?').run(newZone, newName, newBarcode, loc.id);
  }

  const updated = db.prepare('SELECT * FROM warehouse_locations WHERE zone = ?').all(newZone) as LocationRow[];
  const allParts = db.prepare('SELECT * FROM location_parts').all() as LocationPartRow[];
  const result = updated.map(l => {
    const partIds = allParts.filter(lp => lp.location_id === l.id).map(lp => lp.part_id);
    return formatLocation(l, partIds);
  });
  res.json(result);
});

router.post('/:id/assign-part', (req, res) => {
  const db = getDb();
  const { partId } = req.body;
  const location = db.prepare('SELECT * FROM warehouse_locations WHERE id = ?').get(req.params.id) as LocationRow | undefined;
  if (!location) return res.status(404).json({ error: 'Location not found' });

  try {
    db.prepare('INSERT INTO location_parts (location_id, part_id) VALUES (?, ?)').run(req.params.id, partId);
  } catch {
    // Already assigned, ignore duplicate
  }

  const parts = db.prepare('SELECT part_id FROM location_parts WHERE location_id = ?').all(req.params.id) as LocationPartRow[];
  res.json(formatLocation(location, parts.map(p => p.part_id)));
});

router.delete('/:id/remove-part/:partId', (req, res) => {
  const db = getDb();
  const location = db.prepare('SELECT * FROM warehouse_locations WHERE id = ?').get(req.params.id) as LocationRow | undefined;
  if (!location) return res.status(404).json({ error: 'Location not found' });

  db.prepare('DELETE FROM location_parts WHERE location_id = ? AND part_id = ?').run(req.params.id, req.params.partId);
  const parts = db.prepare('SELECT part_id FROM location_parts WHERE location_id = ?').all(req.params.id) as LocationPartRow[];
  res.json(formatLocation(location, parts.map(p => p.part_id)));
});

export default router;
