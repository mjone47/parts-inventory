import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

export function seedDatabase(db: Database.Database): void {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) {
    return; // Already seeded
  }

  const transaction = db.transaction(() => {
    // ── Users ──
    const insertUser = db.prepare('INSERT INTO users (id, name, email, role, avatar) VALUES (?, ?, ?, ?, ?)');
    insertUser.run('u-001-admin', 'Marcus Chen', 'marcus.chen@remaninc.com', 'admin', null);
    insertUser.run('u-002-manager', 'Sarah Okafor', 'sarah.okafor@remaninc.com', 'manager', null);
    insertUser.run('u-003-tech', 'James Kowalski', 'james.kowalski@remaninc.com', 'technician', null);
    insertUser.run('u-004-viewer', 'Lisa Nguyen', 'lisa.nguyen@remaninc.com', 'viewer', null);
    insertUser.run('u-005-runner', 'Carlos Rivera', 'carlos.rivera@remaninc.com', 'runner', null);

    // ── Vendors ──
    const insertVendor = db.prepare('INSERT INTO vendors (id, name, contact_name, email, phone, website, address, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    insertVendor.run('v-a1b2c3d4-0001', 'Canon OEM Supply', 'David Park', 'dpark@canonoemsupply.com', '(800) 555-0101', 'https://canonoemsupply.example.com', '1200 Industrial Blvd, Irvine, CA 92618', 'Primary OEM supplier for Canon printer and copier parts. Net-30 terms.', '2024-06-15T10:00:00Z');
    insertVendor.run('v-a1b2c3d4-0002', 'HP Genuine Parts Direct', 'Michelle Torres', 'mtorres@hppartsdirect.com', '(800) 555-0202', 'https://hppartsdirect.example.com', '500 Page Mill Road, Palo Alto, CA 94304', 'Authorized HP parts distributor. Minimum order $250.', '2024-07-01T08:30:00Z');
    insertVendor.run('v-a1b2c3d4-0003', 'PrinterParts Aftermarket Co.', 'Bob Jenkins', 'bob@printerpartsam.com', '(888) 555-0303', 'https://printerpartsam.example.com', '78 Commerce Way, Edison, NJ 08817', 'Aftermarket parts at competitive prices. Good quality rollers and fusers.', '2024-08-20T14:15:00Z');
    insertVendor.run('v-a1b2c3d4-0004', 'Global Imaging Components', 'Anita Sharma', 'asharma@globalimaging.com', '(877) 555-0404', 'https://globalimaging.example.com', '3400 Technology Dr, Dallas, TX 75201', 'Specializes in drum units, developer assemblies, and toner cartridges.', '2024-09-10T11:00:00Z');

    // ── Products ──
    const insertProduct = db.prepare('INSERT INTO products (id, name, model, asin, upc, manufacturer, category, description, image, exploded_view_image, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    insertProduct.run('p-11111111-0001', 'Canon imageRUNNER ADVANCE C5560i', 'C5560i', 'B01N5X4YQK', '013803269161', 'Canon', 'Copier', 'High-volume color multifunction copier. 60 ppm, supports up to 13x19 paper. Common in large office environments.', null, null, '2024-06-20T09:00:00Z');
    insertProduct.run('p-11111111-0002', 'HP LaserJet Enterprise M609dn', 'M609dn', 'B06XYZ3H4M', '889894728784', 'HP', 'Printer', 'Monochrome laser printer. 75 ppm, 1200x1200 dpi. Workhorse for high-volume mono printing.', null, null, '2024-07-05T10:30:00Z');
    insertProduct.run('p-11111111-0003', 'Canon imagePRESS C710', 'C710', 'B07PQRST12', '013803290936', 'Canon', 'Production Printer', 'Light-production color press. 70 ppm, advanced color management. Used in print-for-pay and in-plant environments.', null, null, '2024-08-12T14:00:00Z');
    insertProduct.run('p-11111111-0004', 'HP Color LaserJet Pro MFP M479fdw', 'M479fdw', 'B07SCKLM9N', '192545078917', 'HP', 'MFP', 'Color multifunction printer with fax, duplex, wireless. 28 ppm, suitable for small to mid-size offices.', null, null, '2024-09-01T11:15:00Z');
    insertProduct.run('p-11111111-0005', 'Canon imageRUNNER 2530i', '2530i', 'B00VWKJ3AB', '013803251074', 'Canon', 'Copier', 'Compact monochrome copier. 30 ppm, standard network print/scan. Popular in small offices and workgroups.', null, null, '2024-10-10T08:45:00Z');

    // ── Parts ──
    const insertPart = db.prepare('INSERT INTO parts (id, part_number, name, description, category, image, quantity_in_stock, minimum_stock, unit_cost, warehouse_location_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    insertPart.run('pt-00000001', 'FM1-B291-000', 'Fuser Assembly', 'Main fuser unit for the C5560i. Rated for 200,000 pages.', 'Fuser', null, 4, 2, 189.99, 'wl-001', '2024-06-20T09:00:00Z', '2025-12-01T10:00:00Z');
    insertPart.run('pt-00000002', 'FC9-0612-000', 'Pickup Roller (Cassette)', 'Paper pickup roller for cassette trays 1-4.', 'Roller', null, 12, 5, 14.50, 'wl-002', '2024-06-20T09:00:00Z', '2025-11-15T08:30:00Z');
    insertPart.run('pt-00000003', 'FM0-0015-000', 'Drum Unit - Color (CMY)', 'Color drum unit compatible with C5560i and C710. Rated for 150,000 pages.', 'Drum', null, 3, 2, 245.00, 'wl-003', '2024-06-20T09:00:00Z', '2026-01-10T14:00:00Z');
    insertPart.run('pt-00000004', 'FM4-6495-000', 'Transfer Belt Assembly', 'Intermediate transfer belt for color registration. Rated for 200,000 pages.', 'Transfer', null, 1, 1, 320.00, 'wl-004', '2024-06-20T09:00:00Z', '2025-10-20T16:00:00Z');
    insertPart.run('pt-00000005', 'RM2-5796-000', 'Fuser Assembly (110V)', 'Maintenance fuser kit for M609dn. 110V version. Rated for 225,000 pages.', 'Fuser', null, 6, 3, 159.00, 'wl-005', '2024-07-05T10:30:00Z', '2025-12-20T09:00:00Z');
    insertPart.run('pt-00000006', 'RL2-0656-000', 'Tray 2 Pickup Roller', 'Pickup roller for Tray 2 on M609 series.', 'Roller', null, 18, 8, 9.75, 'wl-002', '2024-07-05T10:30:00Z', '2025-11-05T12:00:00Z');
    insertPart.run('pt-00000007', 'CF237A', 'Toner Cartridge 37A', 'Standard yield black toner cartridge. 11,000 page yield.', 'Toner', null, 8, 4, 142.00, 'wl-006', '2024-07-05T10:30:00Z', '2026-02-01T10:00:00Z');
    insertPart.run('pt-00000008', 'RM2-5745-000', 'Separation Pad Assembly', 'Separation pad for Tray 2. Prevents multi-feed jams.', 'Feed', null, 15, 5, 7.25, 'wl-002', '2024-07-05T10:30:00Z', '2025-09-12T15:00:00Z');
    insertPart.run('pt-00000009', 'FM1-R726-000', 'Fuser Unit (Production)', 'Heavy-duty fuser unit for imagePRESS C710. Rated for 300,000 impressions.', 'Fuser', null, 2, 1, 425.00, 'wl-007', '2024-08-12T14:00:00Z', '2025-12-15T11:00:00Z');
    insertPart.run('pt-00000010', 'FM4-9382-000', 'Developer Assembly - Black', 'Black developer unit for imagePRESS C710.', 'Developer', null, 2, 1, 275.00, 'wl-008', '2024-08-12T14:00:00Z', '2025-11-28T09:30:00Z');
    insertPart.run('pt-00000011', 'RM2-2554-000', 'Fuser Assembly (Color)', 'Fuser unit for M479fdw color MFP. Rated for 150,000 pages.', 'Fuser', null, 3, 2, 135.00, 'wl-005', '2024-09-01T11:15:00Z', '2026-01-05T16:00:00Z');
    insertPart.run('pt-00000012', 'W2040A', 'Toner Cartridge 416A Black', 'Standard yield black toner for M479 series. 2,400 page yield.', 'Toner', null, 10, 4, 68.00, 'wl-006', '2024-09-01T11:15:00Z', '2026-02-15T08:00:00Z');
    insertPart.run('pt-00000013', 'RM2-1275-000', 'ADF Pickup Roller Kit', 'Automatic document feeder pickup roller kit for M479fdw.', 'Roller', null, 7, 3, 22.50, 'wl-002', '2024-09-01T11:15:00Z', '2025-10-30T14:00:00Z');
    insertPart.run('pt-00000014', 'FM0-4352-000', 'Drum Unit - Black', 'Black drum unit for imageRUNNER 2530i. Rated for 100,000 pages.', 'Drum', null, 5, 2, 125.00, 'wl-003', '2024-10-10T08:45:00Z', '2025-12-05T10:00:00Z');
    insertPart.run('pt-00000015', 'FC6-7083-000', 'Feed Separation Roller', 'Separation roller for cassette feed on 2530i.', 'Roller', null, 20, 8, 8.00, 'wl-002', '2024-10-10T08:45:00Z', '2025-08-20T12:00:00Z');
    insertPart.run('pt-00000016', 'FM1-G942-000', 'Main Controller PCB', 'Main logic board (controller) for imageRUNNER 2530i.', 'Electronics', null, 1, 1, 395.00, 'wl-009', '2024-10-10T08:45:00Z', '2025-11-01T09:00:00Z');
    insertPart.run('pt-00000017', 'FM4-8035-000', 'Fixing Film Assembly', 'Fuser fixing film sleeve assembly for imageRUNNER 2530i.', 'Fuser', null, 3, 2, 85.00, 'wl-005', '2024-10-10T08:45:00Z', '2025-12-10T13:00:00Z');

    // ── Product Parts ──
    const insertProductPart = db.prepare('INSERT INTO product_parts (id, product_id, part_id, position_label, x, y) VALUES (?, ?, ?, ?, ?, ?)');
    insertProductPart.run('pp-001', 'p-11111111-0001', 'pt-00000001', '1', 15, 20);
    insertProductPart.run('pp-002', 'p-11111111-0001', 'pt-00000002', '2', 35, 45);
    insertProductPart.run('pp-003', 'p-11111111-0001', 'pt-00000003', '3', 60, 30);
    insertProductPart.run('pp-004', 'p-11111111-0001', 'pt-00000004', '4', 80, 55);
    insertProductPart.run('pp-005', 'p-11111111-0002', 'pt-00000005', '1', 20, 25);
    insertProductPart.run('pp-006', 'p-11111111-0002', 'pt-00000006', '2', 50, 40);
    insertProductPart.run('pp-007', 'p-11111111-0002', 'pt-00000007', '3', 70, 60);
    insertProductPart.run('pp-008', 'p-11111111-0002', 'pt-00000008', '4', 40, 75);
    insertProductPart.run('pp-009', 'p-11111111-0003', 'pt-00000009', '1', 25, 35);
    insertProductPart.run('pp-010', 'p-11111111-0003', 'pt-00000010', '2', 55, 50);
    insertProductPart.run('pp-011', 'p-11111111-0003', 'pt-00000003', '3', 75, 20);
    insertProductPart.run('pp-012', 'p-11111111-0004', 'pt-00000011', '1', 30, 20);
    insertProductPart.run('pp-013', 'p-11111111-0004', 'pt-00000012', '2', 60, 45);
    insertProductPart.run('pp-014', 'p-11111111-0004', 'pt-00000013', '3', 45, 70);
    insertProductPart.run('pp-015', 'p-11111111-0005', 'pt-00000014', '1', 20, 30);
    insertProductPart.run('pp-016', 'p-11111111-0005', 'pt-00000015', '2', 50, 55);
    insertProductPart.run('pp-017', 'p-11111111-0005', 'pt-00000016', '3', 70, 40);
    insertProductPart.run('pp-018', 'p-11111111-0005', 'pt-00000017', '4', 35, 65);

    // ── Part Compatible Products ──
    const insertCompat = db.prepare('INSERT INTO part_compatible_products (part_id, product_id) VALUES (?, ?)');
    insertCompat.run('pt-00000001', 'p-11111111-0001');
    insertCompat.run('pt-00000002', 'p-11111111-0001');
    insertCompat.run('pt-00000003', 'p-11111111-0001');
    insertCompat.run('pt-00000003', 'p-11111111-0003');
    insertCompat.run('pt-00000004', 'p-11111111-0001');
    insertCompat.run('pt-00000005', 'p-11111111-0002');
    insertCompat.run('pt-00000006', 'p-11111111-0002');
    insertCompat.run('pt-00000007', 'p-11111111-0002');
    insertCompat.run('pt-00000008', 'p-11111111-0002');
    insertCompat.run('pt-00000009', 'p-11111111-0003');
    insertCompat.run('pt-00000010', 'p-11111111-0003');
    insertCompat.run('pt-00000011', 'p-11111111-0004');
    insertCompat.run('pt-00000012', 'p-11111111-0004');
    insertCompat.run('pt-00000013', 'p-11111111-0004');
    insertCompat.run('pt-00000014', 'p-11111111-0005');
    insertCompat.run('pt-00000015', 'p-11111111-0005');
    insertCompat.run('pt-00000016', 'p-11111111-0005');
    insertCompat.run('pt-00000017', 'p-11111111-0005');

    // ── Part Vendors ──
    const insertPartVendor = db.prepare('INSERT INTO part_vendors (id, part_id, vendor_id, vendor_part_number, cost, url, lead_time_days) VALUES (?, ?, ?, ?, ?, ?, ?)');
    insertPartVendor.run(uuidv4(), 'pt-00000001', 'v-a1b2c3d4-0001', 'FM1-B291-000', 189.99, 'https://canonoemsupply.example.com/fm1-b291', 5);
    insertPartVendor.run(uuidv4(), 'pt-00000001', 'v-a1b2c3d4-0003', 'AF-FM1B291', 139.99, 'https://printerpartsam.example.com/af-fm1b291', 7);
    insertPartVendor.run(uuidv4(), 'pt-00000002', 'v-a1b2c3d4-0001', 'FC9-0612-000', 14.50, 'https://canonoemsupply.example.com/fc9-0612', 3);
    insertPartVendor.run(uuidv4(), 'pt-00000003', 'v-a1b2c3d4-0001', 'FM0-0015-000', 245.00, 'https://canonoemsupply.example.com/fm0-0015', 7);
    insertPartVendor.run(uuidv4(), 'pt-00000003', 'v-a1b2c3d4-0004', 'GIC-FM00015', 210.00, 'https://globalimaging.example.com/gic-fm00015', 5);
    insertPartVendor.run(uuidv4(), 'pt-00000004', 'v-a1b2c3d4-0001', 'FM4-6495-000', 320.00, 'https://canonoemsupply.example.com/fm4-6495', 10);
    insertPartVendor.run(uuidv4(), 'pt-00000005', 'v-a1b2c3d4-0002', 'RM2-5796-000CN', 159.00, 'https://hppartsdirect.example.com/rm2-5796', 4);
    insertPartVendor.run(uuidv4(), 'pt-00000005', 'v-a1b2c3d4-0003', 'AF-RM25796', 119.00, 'https://printerpartsam.example.com/af-rm25796', 6);
    insertPartVendor.run(uuidv4(), 'pt-00000006', 'v-a1b2c3d4-0002', 'RL2-0656-000CN', 9.75, 'https://hppartsdirect.example.com/rl2-0656', 3);
    insertPartVendor.run(uuidv4(), 'pt-00000007', 'v-a1b2c3d4-0002', 'CF237A', 142.00, 'https://hppartsdirect.example.com/cf237a', 2);
    insertPartVendor.run(uuidv4(), 'pt-00000007', 'v-a1b2c3d4-0004', 'GIC-CF237A-R', 98.00, 'https://globalimaging.example.com/gic-cf237a', 4);
    insertPartVendor.run(uuidv4(), 'pt-00000008', 'v-a1b2c3d4-0002', 'RM2-5745-000CN', 7.25, 'https://hppartsdirect.example.com/rm2-5745', 3);
    insertPartVendor.run(uuidv4(), 'pt-00000009', 'v-a1b2c3d4-0001', 'FM1-R726-000', 425.00, 'https://canonoemsupply.example.com/fm1-r726', 10);
    insertPartVendor.run(uuidv4(), 'pt-00000010', 'v-a1b2c3d4-0001', 'FM4-9382-000', 275.00, 'https://canonoemsupply.example.com/fm4-9382', 12);
    insertPartVendor.run(uuidv4(), 'pt-00000010', 'v-a1b2c3d4-0004', 'GIC-FM49382', 235.00, 'https://globalimaging.example.com/gic-fm49382', 8);
    insertPartVendor.run(uuidv4(), 'pt-00000011', 'v-a1b2c3d4-0002', 'RM2-2554-000CN', 135.00, 'https://hppartsdirect.example.com/rm2-2554', 5);
    insertPartVendor.run(uuidv4(), 'pt-00000011', 'v-a1b2c3d4-0003', 'AF-RM22554', 99.00, 'https://printerpartsam.example.com/af-rm22554', 7);
    insertPartVendor.run(uuidv4(), 'pt-00000012', 'v-a1b2c3d4-0002', 'W2040A', 68.00, 'https://hppartsdirect.example.com/w2040a', 2);
    insertPartVendor.run(uuidv4(), 'pt-00000013', 'v-a1b2c3d4-0002', 'RM2-1275-000CN', 22.50, 'https://hppartsdirect.example.com/rm2-1275', 3);
    insertPartVendor.run(uuidv4(), 'pt-00000014', 'v-a1b2c3d4-0001', 'FM0-4352-000', 125.00, 'https://canonoemsupply.example.com/fm0-4352', 5);
    insertPartVendor.run(uuidv4(), 'pt-00000014', 'v-a1b2c3d4-0004', 'GIC-FM04352', 105.00, 'https://globalimaging.example.com/gic-fm04352', 6);
    insertPartVendor.run(uuidv4(), 'pt-00000015', 'v-a1b2c3d4-0001', 'FC6-7083-000', 8.00, 'https://canonoemsupply.example.com/fc6-7083', 3);
    insertPartVendor.run(uuidv4(), 'pt-00000016', 'v-a1b2c3d4-0001', 'FM1-G942-000', 395.00, 'https://canonoemsupply.example.com/fm1-g942', 14);
    insertPartVendor.run(uuidv4(), 'pt-00000017', 'v-a1b2c3d4-0001', 'FM4-8035-000', 85.00, 'https://canonoemsupply.example.com/fm4-8035', 5);
    insertPartVendor.run(uuidv4(), 'pt-00000017', 'v-a1b2c3d4-0003', 'AF-FM48035', 62.00, 'https://printerpartsam.example.com/af-fm48035', 8);

    // ── Warehouse Locations ──
    const insertLocation = db.prepare('INSERT INTO warehouse_locations (id, name, zone, aisle, shelf, bin, description, barcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    insertLocation.run('wl-001', 'A-1-1-01', 'A', '1', '1', '01', 'Zone A - Fusers and high-value assemblies', 'WL-A01-01-01');
    insertLocation.run('wl-002', 'A-1-2-01', 'A', '1', '2', '01', 'Zone A - Rollers and feed components', 'WL-A01-02-01');
    insertLocation.run('wl-003', 'A-2-1-01', 'A', '2', '1', '01', 'Zone A - Drum units', 'WL-A02-01-01');
    insertLocation.run('wl-004', 'A-2-2-01', 'A', '2', '2', '01', 'Zone A - Transfer belts and assemblies', 'WL-A02-02-01');
    insertLocation.run('wl-005', 'B-1-1-01', 'B', '1', '1', '01', 'Zone B - HP fusers and fixing assemblies', 'WL-B01-01-01');
    insertLocation.run('wl-006', 'B-1-2-01', 'B', '1', '2', '01', 'Zone B - Toner cartridges', 'WL-B01-02-01');
    insertLocation.run('wl-007', 'B-2-1-01', 'B', '2', '1', '01', 'Zone B - Production printer components', 'WL-B02-01-01');
    insertLocation.run('wl-008', 'C-1-1-01', 'C', '1', '1', '01', 'Zone C - Developer assemblies', 'WL-C01-01-01');
    insertLocation.run('wl-009', 'C-1-2-01', 'C', '1', '2', '01', 'Zone C - Electronics and PCBs (ESD-safe)', 'WL-C01-02-01');
    insertLocation.run('wl-010', 'C-2-1-01', 'C', '2', '1', '01', 'Zone C - Overflow / staging area', 'WL-C02-01-01');

    // ── Location Parts ──
    const insertLocationPart = db.prepare('INSERT INTO location_parts (location_id, part_id) VALUES (?, ?)');
    insertLocationPart.run('wl-001', 'pt-00000001');
    insertLocationPart.run('wl-002', 'pt-00000002');
    insertLocationPart.run('wl-002', 'pt-00000006');
    insertLocationPart.run('wl-002', 'pt-00000008');
    insertLocationPart.run('wl-002', 'pt-00000013');
    insertLocationPart.run('wl-002', 'pt-00000015');
    insertLocationPart.run('wl-003', 'pt-00000003');
    insertLocationPart.run('wl-003', 'pt-00000014');
    insertLocationPart.run('wl-004', 'pt-00000004');
    insertLocationPart.run('wl-005', 'pt-00000005');
    insertLocationPart.run('wl-005', 'pt-00000011');
    insertLocationPart.run('wl-005', 'pt-00000017');
    insertLocationPart.run('wl-006', 'pt-00000007');
    insertLocationPart.run('wl-006', 'pt-00000012');
    insertLocationPart.run('wl-007', 'pt-00000009');
    insertLocationPart.run('wl-008', 'pt-00000010');
    insertLocationPart.run('wl-009', 'pt-00000016');

    // ── Harvest Sessions ──
    const insertSession = db.prepare('INSERT INTO harvest_sessions (id, product_id, serial_number, condition, notes, harvested_by, date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    insertSession.run('hs-00000001', 'p-11111111-0001', 'CAN-C5560-SN-44821', 'good', 'Unit received from law office lease return. Moderate use, well-maintained.', 'u-003-tech', '2025-11-15T09:00:00Z', 'completed');
    insertSession.run('hs-00000002', 'p-11111111-0002', 'HP-M609-SN-78213', 'fair', 'Unit from school district surplus. Higher page counts but functional.', 'u-003-tech', '2025-12-02T13:30:00Z', 'completed');
    insertSession.run('hs-00000003', 'p-11111111-0005', 'CAN-2530i-SN-33109', 'excellent', 'Low-use unit from home office. Under 20k total pages.', 'u-003-tech', '2026-03-20T10:00:00Z', 'in_progress');

    // ── Harvested Parts ──
    const insertHarvestedPart = db.prepare('INSERT INTO harvested_parts (id, session_id, part_id, quantity, condition, notes, added_to_inventory) VALUES (?, ?, ?, ?, ?, ?, ?)');
    insertHarvestedPart.run('hp-001', 'hs-00000001', 'pt-00000001', 1, 'good', 'Fuser has ~120k pages. Still within spec.', 1);
    insertHarvestedPart.run('hp-002', 'hs-00000001', 'pt-00000002', 2, 'like_new', 'Pickup rollers barely worn.', 1);
    insertHarvestedPart.run('hp-003', 'hs-00000001', 'pt-00000003', 1, 'fair', 'Drum showing slight banding. Usable for secondary market.', 1);
    insertHarvestedPart.run('hp-004', 'hs-00000002', 'pt-00000006', 1, 'good', 'Roller in decent shape.', 1);
    insertHarvestedPart.run('hp-005', 'hs-00000002', 'pt-00000008', 1, 'fair', 'Sep pad worn but usable.', 1);
    insertHarvestedPart.run('hp-006', 'hs-00000003', 'pt-00000014', 1, 'like_new', 'Drum looks almost new.', 0);
    insertHarvestedPart.run('hp-007', 'hs-00000003', 'pt-00000015', 2, 'new', 'Rollers appear unused.', 0);

    // ── Orders ──
    const insertOrder = db.prepare('INSERT INTO orders (id, order_number, vendor_id, status, order_date, expected_delivery, tracking_number, notes, subtotal, tax, shipping, total, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    insertOrder.run('ord-00000001', 'PO-2025-0042', 'v-a1b2c3d4-0001', 'received', '2025-10-10T09:00:00Z', '2025-10-20T09:00:00Z', '1Z999AA10123456784', 'Quarterly restock of Canon fuser and drum units.', 1114.98, 89.20, 25.00, 1229.18, 'u-002-manager', '2025-10-10T09:00:00Z');
    insertOrder.run('ord-00000002', 'PO-2026-0003', 'v-a1b2c3d4-0002', 'shipped', '2026-03-15T11:00:00Z', '2026-03-30T11:00:00Z', '1Z999BB20234567891', 'HP fuser and toner restock. Expedited shipping requested.', 1488.00, 119.04, 35.00, 1642.04, 'u-002-manager', '2026-03-15T11:00:00Z');
    insertOrder.run('ord-00000003', 'PO-2026-0005', 'v-a1b2c3d4-0003', 'ordered', '2026-03-25T14:00:00Z', '2026-04-05T14:00:00Z', '', 'Aftermarket fuser parts for HP and Canon lines.', 384.00, 30.72, 15.00, 429.72, 'u-001-admin', '2026-03-25T14:00:00Z');

    // ── Order Items ──
    const insertOrderItem = db.prepare('INSERT INTO order_items (id, order_id, part_id, quantity, unit_cost, received_quantity) VALUES (?, ?, ?, ?, ?, ?)');
    insertOrderItem.run('oi-001', 'ord-00000001', 'pt-00000001', 2, 189.99, 2);
    insertOrderItem.run('oi-002', 'ord-00000001', 'pt-00000003', 3, 245.00, 3);
    insertOrderItem.run('oi-003', 'ord-00000002', 'pt-00000005', 4, 159.00, 0);
    insertOrderItem.run('oi-004', 'ord-00000002', 'pt-00000007', 6, 142.00, 0);
    insertOrderItem.run('oi-005', 'ord-00000003', 'pt-00000011', 2, 99.00, 0);
    insertOrderItem.run('oi-006', 'ord-00000003', 'pt-00000017', 3, 62.00, 0);

    // ── Inventory Transactions ──
    const insertTxn = db.prepare('INSERT INTO inventory_transactions (id, part_id, type, quantity, reference, notes, performed_by, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    insertTxn.run('txn-00000001', 'pt-00000001', 'harvest_in', 1, 'hs-00000001', 'Harvested fuser from Canon C5560i SN-44821.', 'u-003-tech', '2025-11-15T09:30:00Z');
    insertTxn.run('txn-00000002', 'pt-00000002', 'harvest_in', 2, 'hs-00000001', 'Harvested 2 pickup rollers from Canon C5560i SN-44821.', 'u-003-tech', '2025-11-15T09:45:00Z');
    insertTxn.run('txn-00000003', 'pt-00000003', 'harvest_in', 1, 'hs-00000001', 'Harvested color drum from Canon C5560i SN-44821.', 'u-003-tech', '2025-11-15T10:00:00Z');
    insertTxn.run('txn-00000004', 'pt-00000001', 'order_in', 2, 'ord-00000001', 'Received 2 fuser assemblies from Canon OEM Supply.', 'u-002-manager', '2025-10-20T10:00:00Z');
    insertTxn.run('txn-00000005', 'pt-00000003', 'order_in', 3, 'ord-00000001', 'Received 3 color drum units from Canon OEM Supply.', 'u-002-manager', '2025-10-20T10:15:00Z');
    insertTxn.run('txn-00000006', 'pt-00000007', 'sold', -2, 'SO-2026-0101', 'Sold 2 toner cartridges to customer account #1055.', 'u-002-manager', '2026-02-10T14:00:00Z');
    insertTxn.run('txn-00000007', 'pt-00000006', 'harvest_in', 1, 'hs-00000002', 'Harvested pickup roller from HP M609 SN-78213.', 'u-003-tech', '2025-12-02T14:00:00Z');
    insertTxn.run('txn-00000008', 'pt-00000008', 'harvest_in', 1, 'hs-00000002', 'Harvested separation pad from HP M609 SN-78213.', 'u-003-tech', '2025-12-02T14:15:00Z');
    insertTxn.run('txn-00000009', 'pt-00000004', 'adjustment', -1, '', 'Cycle count adjustment. Physical count showed 1, system had 2.', 'u-001-admin', '2026-01-05T16:00:00Z');
    insertTxn.run('txn-00000010', 'pt-00000016', 'scrapped', -1, '', 'PCB failed bench test. Scrapped for recycling.', 'u-003-tech', '2026-02-28T11:00:00Z');
  });

  transaction();
  console.log('Database seeded successfully.');
}
