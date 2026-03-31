import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './database';
import { seedDatabase } from './seed';

// Import routes
import usersRouter from './routes/users';
import productsRouter from './routes/products';
import partsRouter from './routes/parts';
import vendorsRouter from './routes/vendors';
import harvestSessionsRouter from './routes/harvestSessions';
import ordersRouter from './routes/orders';
import warehouseLocationsRouter from './routes/warehouseLocations';
import inventoryTransactionsRouter from './routes/inventoryTransactions';
import internalOrdersRouter from './routes/internalOrders';
import odooRouter from './routes/odoo';
import amazonRouter from './routes/amazon';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // large for base64 images

// Initialize DB
const db = initializeDatabase();
seedDatabase(db);

// API Routes
app.use('/api/users', usersRouter);
app.use('/api/products', productsRouter);
app.use('/api/parts', partsRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/harvest-sessions', harvestSessionsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/warehouse-locations', warehouseLocationsRouter);
app.use('/api/inventory-transactions', inventoryTransactionsRouter);
app.use('/api/internal-orders', internalOrdersRouter);
app.use('/api/odoo', odooRouter);
app.use('/api/amazon', amazonRouter);

// ── Production: serve built frontend ──────────────────────────────────────────
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// All non-API routes serve index.html (SPA client-side routing)
app.get('/{*path}', (req, res) => {
  // Don't override API routes
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`  API:      http://localhost:${PORT}/api`);
  console.log(`  Frontend: http://localhost:${PORT}`);
});
