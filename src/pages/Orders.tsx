import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  ShoppingCart,
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
  PackageCheck,
  Truck,
  Calendar,
  Hash,
  FileText,
  DollarSign,
} from 'lucide-react';
import { useApp } from '../data/store';
import Modal from '../components/Modal';
import type { Order, OrderItem } from '../types';

// ── Status badge ──────────────────────────────────────────────────────────────

const statusStyles: Record<Order['status'], string> = {
  draft: 'bg-gray-100 text-gray-700',
  ordered: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700',
  partial: 'bg-orange-100 text-orange-700',
  received: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

function OrderStatusBadge({ status }: { status: Order['status'] }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[status]}`}>
      {status}
    </span>
  );
}

// ── Currency formatter ────────────────────────────────────────────────────────

function fmt(n: number) {
  return '$' + n.toFixed(2);
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Orders() {
  const {
    orders,
    vendors,
    parts,
    currentUser,
    getVendorById,
    getPartById,
    addOrder,
    updateOrderStatus,
    receiveOrderItems,
    adjustStock,
    addInventoryTransaction,
  } = useApp();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [receivingOrderId, setReceivingOrderId] = useState<string | null>(null);

  // ── Create order form state ───────────────────────────────────────────────

  const [formVendorId, setFormVendorId] = useState('');
  const [formOrderDate, setFormOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [formExpectedDelivery, setFormExpectedDelivery] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formTracking, setFormTracking] = useState('');
  const [formItems, setFormItems] = useState<
    { id: string; partId: string; quantity: number; unitCost: number }[]
  >([]);

  // ── Receive items state ───────────────────────────────────────────────────

  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});

  // ── Helpers ───────────────────────────────────────────────────────────────

  function resetCreateForm() {
    setFormVendorId('');
    setFormOrderDate(new Date().toISOString().slice(0, 10));
    setFormExpectedDelivery('');
    setFormNotes('');
    setFormTracking('');
    setFormItems([]);
  }

  function addLineItem() {
    setFormItems((prev) => [
      ...prev,
      { id: uuidv4(), partId: '', quantity: 1, unitCost: 0 },
    ]);
  }

  function updateLineItem(id: string, field: string, value: unknown) {
    setFormItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  function removeLineItem(id: string) {
    setFormItems((prev) => prev.filter((item) => item.id !== id));
  }

  const subtotal = formItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

  function handleCreateOrder() {
    if (!formVendorId || formItems.length === 0) return;

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

    const orderItems: Omit<OrderItem, never>[] = formItems.map((fi) => ({
      id: fi.id,
      partId: fi.partId,
      quantity: fi.quantity,
      unitCost: fi.unitCost,
      receivedQuantity: 0,
    }));

    addOrder({
      orderNumber,
      vendorId: formVendorId,
      items: orderItems,
      status: 'draft',
      orderDate: formOrderDate,
      expectedDelivery: formExpectedDelivery,
      trackingNumber: formTracking,
      notes: formNotes,
      subtotal,
      tax: 0,
      shipping: 0,
      total: subtotal,
      createdBy: currentUser?.id ?? '',
    });

    setShowCreateModal(false);
    resetCreateForm();
  }

  function openReceive(orderId: string) {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const qtys: Record<string, number> = {};
    order.items.forEach((item) => {
      qtys[item.id] = 0;
    });
    setReceiveQtys(qtys);
    setReceivingOrderId(orderId);
  }

  function handleReceiveItems() {
    if (!receivingOrderId) return;
    const order = orders.find((o) => o.id === receivingOrderId);
    if (!order) return;

    const receivedItems: { itemId: string; quantity: number }[] = [];

    order.items.forEach((item) => {
      const qty = receiveQtys[item.id] ?? 0;
      if (qty > 0) {
        receivedItems.push({ itemId: item.id, quantity: qty });

        // Adjust stock
        adjustStock(item.partId, qty);

        // Create inventory transaction
        addInventoryTransaction({
          partId: item.partId,
          type: 'order_in',
          quantity: qty,
          reference: receivingOrderId,
          notes: `Received from order ${order.orderNumber}`,
          performedBy: currentUser?.id ?? '',
          date: new Date().toISOString(),
        });
      }
    });

    if (receivedItems.length > 0) {
      receiveOrderItems(receivingOrderId, receivedItems);
    }

    setReceivingOrderId(null);
    setReceiveQtys({});
  }

  // ── Sort newest first ─────────────────────────────────────────────────────

  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart size={28} />
            Orders
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage purchase orders from vendors
          </p>
        </div>
        <button
          onClick={() => {
            resetCreateForm();
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-indigo-700 transition-colors"
        >
          <Plus size={18} />
          Create Order
        </button>
      </div>

      {/* Orders table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Delivery</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedOrders.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                  No orders yet. Create one above.
                </td>
              </tr>
            )}
            {sortedOrders.map((order) => {
              const vendor = getVendorById(order.vendorId);
              const isExpanded = expandedId === order.id;

              return (
                <tr key={order.id}>
                  <td colSpan={8} className="p-0">
                    {/* Main row */}
                    <div
                      className="grid grid-cols-[1fr_1fr_80px_1fr_1fr_auto_100px_40px] items-center px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    >
                      <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                        <Hash size={14} className="text-gray-400" />
                        {order.orderNumber}
                      </span>
                      <span className="text-sm text-gray-700">{vendor?.name ?? 'Unknown'}</span>
                      <span className="text-sm text-gray-500">{order.items.length}</span>
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(order.orderDate).toLocaleDateString()}
                      </span>
                      <span className="text-sm text-gray-500">
                        {order.expectedDelivery
                          ? new Date(order.expectedDelivery).toLocaleDateString()
                          : '-'}
                      </span>
                      <OrderStatusBadge status={order.status} />
                      <span className="text-sm font-medium text-gray-900 text-right">{fmt(order.total)}</span>
                      <span className="text-gray-400 text-right">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 space-y-4">
                        {/* Order info */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 block text-xs uppercase">Tracking</span>
                            <span className="text-gray-800 flex items-center gap-1">
                              <Truck size={14} />
                              {order.trackingNumber || '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 block text-xs uppercase">Subtotal</span>
                            <span className="text-gray-800">{fmt(order.subtotal)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block text-xs uppercase">Tax / Shipping</span>
                            <span className="text-gray-800">{fmt(order.tax)} / {fmt(order.shipping)}</span>
                          </div>
                          {order.notes && (
                            <div>
                              <span className="text-gray-500 block text-xs uppercase">Notes</span>
                              <span className="text-gray-600 flex items-start gap-1">
                                <FileText size={14} className="mt-0.5" />
                                {order.notes}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Status change */}
                        <div className="flex items-center gap-3">
                          <label className="text-xs font-medium text-gray-500 uppercase">Update Status:</label>
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value as Order['status'])}
                            className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="draft">Draft</option>
                            <option value="ordered">Ordered</option>
                            <option value="shipped">Shipped</option>
                            <option value="partial">Partial</option>
                            <option value="received">Received</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>

                        {/* Items table */}
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-200">
                              <th className="pb-2">Part</th>
                              <th className="pb-2">Part #</th>
                              <th className="pb-2 text-right">Ordered</th>
                              <th className="pb-2 text-right">Unit Cost</th>
                              <th className="pb-2 text-right">Line Total</th>
                              <th className="pb-2 text-right">Received</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items.map((item) => {
                              const part = getPartById(item.partId);
                              return (
                                <tr key={item.id} className="border-b border-gray-100">
                                  <td className="py-1.5 font-medium text-gray-800">{part?.name ?? 'Unknown'}</td>
                                  <td className="py-1.5 text-gray-500">{part?.partNumber ?? '-'}</td>
                                  <td className="py-1.5 text-gray-600 text-right">{item.quantity}</td>
                                  <td className="py-1.5 text-gray-600 text-right">{fmt(item.unitCost)}</td>
                                  <td className="py-1.5 text-gray-800 text-right font-medium">{fmt(item.quantity * item.unitCost)}</td>
                                  <td className="py-1.5 text-right">
                                    <span className={item.receivedQuantity >= item.quantity ? 'text-green-600 font-medium' : 'text-gray-600'}>
                                      {item.receivedQuantity}
                                    </span>
                                    <span className="text-gray-400"> / {item.quantity}</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        {/* Receive items button */}
                        {order.status !== 'received' && order.status !== 'cancelled' && (
                          <div className="flex justify-end">
                            <button
                              onClick={() => openReceive(order.id)}
                              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <PackageCheck size={16} />
                              Receive Items
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Create Order Modal ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetCreateForm();
        }}
        title="Create Order"
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
              <select
                value={formVendorId}
                onChange={(e) => setFormVendorId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select vendor...</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
              <input
                type="date"
                value={formOrderDate}
                onChange={(e) => setFormOrderDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery</label>
              <input
                type="date"
                value={formExpectedDelivery}
                onChange={(e) => setFormExpectedDelivery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number</label>
              <input
                type="text"
                value={formTracking}
                onChange={(e) => setFormTracking(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Line Items</label>
              <button
                onClick={addLineItem}
                className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                <Plus size={16} /> Add Item
              </button>
            </div>

            {formItems.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No items added yet. Click "Add Item" above.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-200">
                    <th className="pb-2">Part</th>
                    <th className="pb-2 w-20">Qty</th>
                    <th className="pb-2 w-28">Unit Cost</th>
                    <th className="pb-2 w-24 text-right">Line Total</th>
                    <th className="pb-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {formItems.map((item) => {
                    return (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="py-2">
                          <select
                            value={item.partId}
                            onChange={(e) => {
                              const part = parts.find((p) => p.id === e.target.value);
                              updateLineItem(item.id, 'partId', e.target.value);
                              if (part) {
                                updateLineItem(item.id, 'unitCost', part.unitCost);
                              }
                            }}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Select part...</option>
                            {parts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.partNumber})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2">
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateLineItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-1">
                            <DollarSign size={14} className="text-gray-400" />
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              value={item.unitCost}
                              onChange={(e) => updateLineItem(item.id, 'unitCost', Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-20 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </td>
                        <td className="py-2 text-right font-medium text-gray-800">
                          {fmt(item.quantity * item.unitCost)}
                        </td>
                        <td className="py-2 text-right">
                          <button
                            onClick={() => removeLineItem(item.id)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* Totals */}
            {formItems.length > 0 && (
              <div className="flex justify-end pt-2">
                <div className="text-sm space-y-1 w-48">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal:</span>
                    <span className="font-medium">{fmt(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tax:</span>
                    <span className="font-medium">{fmt(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Shipping:</span>
                    <span className="font-medium">{fmt(0)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-300 pt-1">
                    <span className="text-gray-700 font-semibold">Total:</span>
                    <span className="font-bold">{fmt(subtotal)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setShowCreateModal(false);
                resetCreateForm();
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateOrder}
              disabled={!formVendorId || formItems.length === 0 || formItems.some((i) => !i.partId)}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Create Order
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Receive Items Modal ────────────────────────────────────────────────── */}
      <Modal
        isOpen={receivingOrderId !== null}
        onClose={() => {
          setReceivingOrderId(null);
          setReceiveQtys({});
        }}
        title="Receive Items"
        size="lg"
      >
        {receivingOrderId && (() => {
          const order = orders.find((o) => o.id === receivingOrderId);
          if (!order) return null;
          return (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Enter the quantity received for each item in order <span className="font-semibold">{order.orderNumber}</span>.
              </p>

              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-200">
                    <th className="pb-2">Part</th>
                    <th className="pb-2 text-right">Ordered</th>
                    <th className="pb-2 text-right">Already Received</th>
                    <th className="pb-2 text-right">Remaining</th>
                    <th className="pb-2 w-24 text-right">Receiving Now</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => {
                    const part = getPartById(item.partId);
                    const remaining = item.quantity - item.receivedQuantity;
                    return (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="py-2 font-medium text-gray-800">{part?.name ?? 'Unknown'}</td>
                        <td className="py-2 text-gray-600 text-right">{item.quantity}</td>
                        <td className="py-2 text-gray-600 text-right">{item.receivedQuantity}</td>
                        <td className="py-2 text-right">
                          <span className={remaining > 0 ? 'text-orange-600 font-medium' : 'text-green-600 font-medium'}>
                            {remaining}
                          </span>
                        </td>
                        <td className="py-2 text-right">
                          <input
                            type="number"
                            min={0}
                            max={remaining}
                            value={receiveQtys[item.id] ?? 0}
                            onChange={(e) =>
                              setReceiveQtys((prev) => ({
                                ...prev,
                                [item.id]: Math.min(remaining, Math.max(0, parseInt(e.target.value) || 0)),
                              }))
                            }
                            className="w-20 rounded border border-gray-300 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setReceivingOrderId(null);
                    setReceiveQtys({});
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReceiveItems}
                  disabled={Object.values(receiveQtys).every((q) => q === 0)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <PackageCheck size={16} />
                  Confirm Receipt
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
