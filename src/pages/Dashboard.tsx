import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  AlertTriangle,
  Scissors,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Trash2,
  MoveRight,
} from 'lucide-react';
import { useApp } from '../data/store';
import type { InventoryTransaction, HarvestSession, Order } from '../types';

// ---------------------------------------------------------------------------
// Status badge helpers
// ---------------------------------------------------------------------------

const harvestStatusStyles: Record<HarvestSession['status'], string> = {
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
};

const harvestStatusLabels: Record<HarvestSession['status'], string> = {
  in_progress: 'In Progress',
  completed: 'Completed',
};

const orderStatusStyles: Record<Order['status'], string> = {
  draft: 'bg-gray-100 text-gray-800',
  ordered: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  partial: 'bg-orange-100 text-orange-800',
  received: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const orderStatusLabels: Record<Order['status'], string> = {
  draft: 'Draft',
  ordered: 'Ordered',
  shipped: 'Shipped',
  partial: 'Partial',
  received: 'Received',
  cancelled: 'Cancelled',
};

const txnTypeLabels: Record<InventoryTransaction['type'], string> = {
  harvest_in: 'Harvest In',
  order_in: 'Order In',
  sold: 'Sold',
  transferred: 'Transferred',
  adjustment: 'Adjustment',
  scrapped: 'Scrapped',
};

const txnTypeIcons: Record<InventoryTransaction['type'], React.ReactNode> = {
  harvest_in: <ArrowDownRight className="h-4 w-4 text-green-500" />,
  order_in: <ArrowDownRight className="h-4 w-4 text-blue-500" />,
  sold: <ArrowUpRight className="h-4 w-4 text-red-500" />,
  transferred: <MoveRight className="h-4 w-4 text-purple-500" />,
  adjustment: <RefreshCw className="h-4 w-4 text-orange-500" />,
  scrapped: <Trash2 className="h-4 w-4 text-gray-500" />,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

const Dashboard: React.FC = () => {
  const {
    parts,
    harvestSessions,
    orders,
    inventoryTransactions,
    getProductById,
    getPartById,
    getVendorById,
  } = useApp();

  // ── Top stats ───────────────────────────────────────────────────────────────

  const totalPartsInInventory = useMemo(
    () => parts.reduce((sum, p) => sum + p.quantityInStock, 0),
    [parts],
  );

  const lowStockParts = useMemo(
    () => parts.filter((p) => p.quantityInStock < p.minimumStock),
    [parts],
  );

  const activeHarvestCount = useMemo(
    () => harvestSessions.filter((s) => s.status === 'in_progress').length,
    [harvestSessions],
  );

  const pendingOrderCount = useMemo(
    () => orders.filter((o) => o.status !== 'received' && o.status !== 'cancelled').length,
    [orders],
  );

  // ── Recent data ─────────────────────────────────────────────────────────────

  const recentHarvests = useMemo(
    () =>
      [...harvestSessions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
    [harvestSessions],
  );

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [orders],
  );

  const recentTransactions = useMemo(
    () =>
      [...inventoryTransactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8),
    [inventoryTransactions],
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your parts inventory, harvesting, and orders.
        </p>
      </div>

      {/* ── Row 1: Stats Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Parts */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">
                {totalPartsInInventory.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">Total Parts in Inventory</p>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{lowStockParts.length}</p>
              <p className="text-sm text-gray-500">Low Stock Alerts</p>
            </div>
          </div>
        </div>

        {/* Active Harvest Sessions */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Scissors className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{activeHarvestCount}</p>
              <p className="text-sm text-gray-500">Active Harvest Sessions</p>
            </div>
          </div>
        </div>

        {/* Pending Orders */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
              <ShoppingCart className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{pendingOrderCount}</p>
              <p className="text-sm text-gray-500">Pending Orders</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 2: Recent Harvests & Recent Orders ─────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Harvest Sessions */}
        <div className="rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Harvest Sessions</h2>
            <Link
              to="/harvesting"
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-gray-500">
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium text-center">Parts</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentHarvests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                      No harvest sessions yet.
                    </td>
                  </tr>
                ) : (
                  recentHarvests.map((session) => {
                    const product = getProductById(session.productId);
                    return (
                      <tr key={session.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-900">
                          {product?.name ?? 'Unknown Product'}
                        </td>
                        <td className="px-5 py-3 text-gray-500">{formatDate(session.date)}</td>
                        <td className="px-5 py-3 text-center text-gray-700">
                          {session.harvestedParts.length}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${harvestStatusStyles[session.status]}`}
                          >
                            {harvestStatusLabels[session.status]}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            <Link to="/orders" className="text-sm font-medium text-blue-600 hover:text-blue-800">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-gray-500">
                  <th className="px-5 py-3 font-medium">Order #</th>
                  <th className="px-5 py-3 font-medium">Vendor</th>
                  <th className="px-5 py-3 font-medium text-right">Total</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                      No orders yet.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => {
                    const vendor = getVendorById(order.vendorId);
                    return (
                      <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-900">
                          {order.orderNumber}
                        </td>
                        <td className="px-5 py-3 text-gray-500">
                          {vendor?.name ?? 'Unknown Vendor'}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-700">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${orderStatusStyles[order.status]}`}
                          >
                            {orderStatusLabels[order.status]}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Row 3: Low Stock & Recent Activity ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Low Stock Parts */}
        <div className="rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Low Stock Parts</h2>
            <Link to="/parts" className="text-sm font-medium text-blue-600 hover:text-blue-800">
              View all parts
            </Link>
          </div>
          <div className="divide-y">
            {lowStockParts.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400">
                All parts are sufficiently stocked.
              </div>
            ) : (
              lowStockParts.slice(0, 8).map((part) => (
                <div key={part.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">{part.name}</p>
                    <p className="text-xs text-gray-500">
                      Current:{' '}
                      <span className="font-semibold text-red-600">{part.quantityInStock}</span>
                      {' / '}
                      Min: <span className="font-semibold">{part.minimumStock}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ml-4 shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                  >
                    Reorder
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Inventory Activity */}
        <div className="rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Inventory Activity</h2>
          </div>
          <div className="divide-y">
            {recentTransactions.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400">
                No inventory activity recorded.
              </div>
            ) : (
              recentTransactions.map((txn) => {
                const part = getPartById(txn.partId);
                const isPositive = ['harvest_in', 'order_in'].includes(txn.type);
                return (
                  <div key={txn.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
                      {txnTypeIcons[txn.type]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {part?.name ?? 'Unknown Part'}
                      </p>
                      <p className="text-xs text-gray-500">{txnTypeLabels[txn.type]}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {isPositive ? '+' : '-'}
                        {Math.abs(txn.quantity)}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(txn.date)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
