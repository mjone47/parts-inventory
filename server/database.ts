import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = initializeDatabase();
  }
  return db;
}

export function initializeDatabase(): Database.Database {
  const dataDir = path.join(import.meta.dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'inventory.db');
  const database = new Database(dbPath);

  // Enable WAL mode and foreign keys
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');

  // Create tables
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      avatar TEXT
    );

    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact_name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      website TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT '',
      asin TEXT NOT NULL DEFAULT '',
      upc TEXT NOT NULL DEFAULT '',
      manufacturer TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      image TEXT,
      exploded_view_image TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS parts (
      id TEXT PRIMARY KEY,
      part_number TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      image TEXT,
      quantity_in_stock INTEGER NOT NULL DEFAULT 0,
      minimum_stock INTEGER NOT NULL DEFAULT 0,
      unit_cost REAL NOT NULL DEFAULT 0,
      qty_new INTEGER NOT NULL DEFAULT 0,
      qty_like_new INTEGER NOT NULL DEFAULT 0,
      qty_good INTEGER NOT NULL DEFAULT 0,
      qty_fair INTEGER NOT NULL DEFAULT 0,
      qty_poor INTEGER NOT NULL DEFAULT 0,
      warehouse_location_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product_parts (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      part_id TEXT NOT NULL,
      position_label TEXT NOT NULL DEFAULT '',
      x REAL NOT NULL DEFAULT 0,
      y REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS part_compatible_products (
      part_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      PRIMARY KEY (part_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS part_vendors (
      id TEXT PRIMARY KEY,
      part_id TEXT NOT NULL,
      vendor_id TEXT NOT NULL,
      vendor_part_number TEXT NOT NULL DEFAULT '',
      cost REAL NOT NULL DEFAULT 0,
      url TEXT NOT NULL DEFAULT '',
      lead_time_days INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS warehouse_locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      zone TEXT NOT NULL,
      aisle TEXT NOT NULL DEFAULT '',
      shelf TEXT NOT NULL DEFAULT '',
      bin TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      barcode TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS location_parts (
      location_id TEXT NOT NULL,
      part_id TEXT NOT NULL,
      PRIMARY KEY (location_id, part_id),
      FOREIGN KEY (location_id) REFERENCES warehouse_locations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS harvest_sessions (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      serial_number TEXT NOT NULL DEFAULT '',
      condition TEXT NOT NULL DEFAULT 'good',
      notes TEXT NOT NULL DEFAULT '',
      harvested_by TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'in_progress'
    );

    CREATE TABLE IF NOT EXISTS harvested_parts (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      part_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      condition TEXT NOT NULL DEFAULT 'good',
      notes TEXT NOT NULL DEFAULT '',
      added_to_inventory INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES harvest_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL,
      vendor_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      order_date TEXT NOT NULL DEFAULT '',
      expected_delivery TEXT NOT NULL DEFAULT '',
      tracking_number TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      subtotal REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      shipping REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      part_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      unit_cost REAL NOT NULL DEFAULT 0,
      received_quantity INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id TEXT PRIMARY KEY,
      part_id TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      reference TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      performed_by TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS internal_orders (
      id TEXT PRIMARY KEY,
      requested_by TEXT NOT NULL,
      workstation TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'new',
      notes TEXT NOT NULL DEFAULT '',
      assigned_runner TEXT,
      requested_at TEXT NOT NULL,
      pulled_at TEXT,
      delivered_at TEXT
    );

    CREATE TABLE IF NOT EXISTS internal_order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      part_id TEXT NOT NULL,
      part_number TEXT NOT NULL DEFAULT '',
      part_name TEXT NOT NULL DEFAULT '',
      quantity_requested INTEGER NOT NULL DEFAULT 1,
      quantity_pulled INTEGER NOT NULL DEFAULT 0,
      warehouse_location_id TEXT,
      pulled INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (order_id) REFERENCES internal_orders(id) ON DELETE CASCADE
    );
  `);

  // ── Migrations for existing databases ────────────────────────────────────
  const migrate = (sql: string) => {
    try { database.exec(sql); } catch { /* column already exists */ }
  };
  migrate('ALTER TABLE parts ADD COLUMN qty_new INTEGER NOT NULL DEFAULT 0');
  migrate('ALTER TABLE parts ADD COLUMN qty_like_new INTEGER NOT NULL DEFAULT 0');
  migrate('ALTER TABLE parts ADD COLUMN qty_good INTEGER NOT NULL DEFAULT 0');
  migrate('ALTER TABLE parts ADD COLUMN qty_fair INTEGER NOT NULL DEFAULT 0');
  migrate('ALTER TABLE parts ADD COLUMN qty_poor INTEGER NOT NULL DEFAULT 0');

  // Unique index on part_number (for existing DBs that didn't have UNIQUE)
  migrate('CREATE UNIQUE INDEX IF NOT EXISTS idx_parts_part_number ON parts(part_number)');

  db = database;
  return database;
}
