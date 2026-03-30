import { useState, useMemo } from 'react';
import {
  ClipboardList,
  Package,
  Truck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  User,
  MapPin,
  Clock,
  AlertTriangle,
  Flame,
  Filter,
  SquareCheck,
  Square,
  CircleDot,
  Archive,
} from 'lucide-react';
import { useApp } from '../data/store';
import type { InternalOrder, InternalOrderStatus } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function truncateId(id: string): string {
  return id.length > 8 ? id.slice(0, 8).toUpperCase() : id.toUpperCase();
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

// ── Status styles ────────────────────────────────────────────────────────────

const statusConfig: Record<InternalOrderStatus, { label: string; bg: string; text: string }> = {
  new: { label: 'New', bg: 'bg-sky-100', text: 'text-sky-800' },
  pulling: { label: 'Pulling', bg: 'bg-amber-100', text: 'text-amber-800' },
  delivering: { label: 'Delivering', bg: 'bg-purple-100', text: 'text-purple-800' },
  completed: { label: 'Completed', bg: 'bg-green-100', text: 'text-green-800' },
  cancelled: { label: 'Cancelled', bg: 'bg-gray-100', text: 'text-gray-600' },
};

type StatusFilter = 'active' | 'all' | InternalOrderStatus;

// ── Component ────────────────────────────────────────────────────────────────

export default function RunnerQueue() {
  const {
    internalOrders,
    updateInternalOrder,
    updateInternalOrderStatus,
    getPartById,
    getWarehouseLocationById,
    currentUser,
    users,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [myAssignmentsOnly, setMyAssignmentsOnly] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [, setPulledItems] = useState<Record<string, Set<number>>>({});

  // ── Derived data ─────────────────────────────────────────────────────────

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user?.name ?? 'Unknown';
  };

  // Active orders = not completed, not cancelled
  const activeOrders = useMemo(() => {
    return internalOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
  }, [internalOrders]);

  // Completed today (for "today's completed" count)
  const completedToday = useMemo(() => {
    return internalOrders.filter(o => o.status === 'completed' && o.deliveredAt && isToday(o.deliveredAt));
  }, [internalOrders]);

  // Archived = completed more than today (auto-archived)
  const archivedOrders = useMemo(() => {
    return internalOrders.filter(o =>
      o.status === 'completed' && (!o.deliveredAt || !isToday(o.deliveredAt))
    );
  }, [internalOrders]);

  const counts = useMemo(() => {
    const c = { new: 0, pulling: 0, delivering: 0, completed: 0, cancelled: 0 };
    for (const o of internalOrders) {
      c[o.status]++;
    }
    return c;
  }, [internalOrders]);

  const activeCounts = useMemo(() => {
    const c = { new: 0, pulling: 0, delivering: 0 };
    for (const o of activeOrders) {
      if (o.status in c) c[o.status as keyof typeof c]++;
    }
    return c;
  }, [activeOrders]);

  const filteredOrders = useMemo(() => {
    let list: InternalOrder[];

    if (statusFilter === 'active') {
      // Show active orders + today's completed
      list = [...activeOrders, ...completedToday];
    } else if (statusFilter === 'all') {
      list = [...internalOrders];
    } else {
      list = internalOrders.filter(o => o.status === statusFilter);
    }

    // My assignments
    if (myAssignmentsOnly && currentUser) {
      list = list.filter((o) => o.assignedRunner === currentUser.id);
    }

    // Sort: newest first (all are urgent now)
    list.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

    return list;
  }, [internalOrders, activeOrders, completedToday, statusFilter, myAssignmentsOnly, currentUser]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleClaimOrder = (order: InternalOrder) => {
    if (!currentUser) return;
    updateInternalOrderStatus(order.id, 'pulling', currentUser.id);
  };

  const handleToggleItemPulled = (orderId: string, itemIndex: number, order: InternalOrder) => {
    setPulledItems((prev) => {
      const set = new Set(prev[orderId] ?? []);
      if (set.has(itemIndex)) {
        set.delete(itemIndex);
      } else {
        set.add(itemIndex);
      }
      return { ...prev, [orderId]: set };
    });

    const updatedItems = order.items.map((item, idx) => {
      if (idx === itemIndex) {
        const nowPulled = !item.pulled;
        return {
          ...item,
          pulled: nowPulled,
          quantityPulled: nowPulled ? item.quantityRequested : 0,
        };
      }
      return item;
    });
    updateInternalOrder(order.id, { items: updatedItems });
  };

  const handleMarkAllPulled = (order: InternalOrder) => {
    const updatedItems = order.items.map((item) => ({
      ...item,
      pulled: true,
      quantityPulled: item.quantityRequested,
    }));
    updateInternalOrder(order.id, { items: updatedItems });
    const allIndices = new Set(order.items.map((_, i) => i));
    setPulledItems((prev) => ({ ...prev, [order.id]: allIndices }));
  };

  const handleReadyForDelivery = (orderId: string) => {
    updateInternalOrderStatus(orderId, 'delivering');
  };

  const handleMarkDelivered = (orderId: string) => {
    updateInternalOrderStatus(orderId, 'completed');
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  // ── Location display helper ──────────────────────────────────────────────

  const renderLocation = (locationId?: string) => {
    if (!locationId) return <span className="text-gray-400 italic text-sm">No location</span>;
    const loc = getWarehouseLocationById(locationId);
    if (!loc) return <span className="text-gray-400 italic text-sm">Unknown</span>;
    return (
      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 font-mono font-bold text-sm px-2 py-0.5 rounded">
        <MapPin className="w-3.5 h-3.5" />
        {loc.zone}-{loc.aisle}-{loc.shelf}-{loc.bin}
      </span>
    );
  };

  const renderLocationLarge = (locationId?: string) => {
    if (!locationId) return <span className="text-gray-400 italic">No location assigned</span>;
    const loc = getWarehouseLocationById(locationId);
    if (!loc) return <span className="text-gray-400 italic">Unknown location</span>;
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="w-5 h-5 text-emerald-700" />
          <span className="text-sm font-medium text-emerald-800">{loc.name}</span>
        </div>
        <div className="font-mono text-2xl font-bold text-emerald-900 tracking-wider">
          {loc.zone} &middot; {loc.aisle} &middot; {loc.shelf} &middot; {loc.bin}
        </div>
        <div className="text-xs text-emerald-600 mt-1">
          Zone {loc.zone} / Aisle {loc.aisle} / Shelf {loc.shelf} / Bin {loc.bin}
        </div>
      </div>
    );
  };

  // ── Stock status helper ──────────────────────────────────────────────────

  const renderStockStatus = (partId: string, qtyRequested: number) => {
    const part = getPartById(partId);
    if (!part) return <span className="text-gray-400 text-xs">N/A</span>;
    const inStock = part.quantityInStock;
    const enough = inStock >= qtyRequested;
    return (
      <span
        className={`text-xs font-medium px-1.5 py-0.5 rounded ${
          enough ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}
      >
        {inStock} in stock
      </span>
    );
  };

  // ── Filter bar button helper ─────────────────────────────────────────────

  const FilterButton = ({
    active,
    onClick,
    children,
    count,
    countColor,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    count?: number;
    countColor?: string;
  }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
        active ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
      }`}
    >
      {children}
      {count !== undefined && (
        <span
          className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
            active ? 'bg-white/20 text-white' : countColor ?? 'bg-gray-100 text-gray-600'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );

  // ── Render action buttons ────────────────────────────────────────────────

  const renderActions = (order: InternalOrder) => {
    const isMyOrder = currentUser && order.assignedRunner === currentUser.id;

    switch (order.status) {
      case 'new':
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClaimOrder(order);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            Claim & Start Pulling
          </button>
        );

      case 'pulling':
        if (!isMyOrder) return null;
        return (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => handleMarkAllPulled(order)}
              className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-sm font-medium transition-colors"
            >
              Mark All Pulled
            </button>
            <button
              onClick={() => handleReadyForDelivery(order.id)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
            >
              Ready for Delivery
            </button>
          </div>
        );

      case 'delivering':
        if (!isMyOrder) return null;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMarkDelivered(order.id);
            }}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            Mark Delivered
          </button>
        );

      case 'completed':
        return order.deliveredAt ? (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            Delivered {timeAgo(order.deliveredAt)}
          </span>
        ) : null;

      default:
        return null;
    }
  };

  // ── Render order card ────────────────────────────────────────────────────

  const renderOrderCard = (order: InternalOrder) => {
    const stat = statusConfig[order.status];
    const isExpanded = expandedOrderId === order.id;
    const isCompleted = order.status === 'completed' || order.status === 'cancelled';
    const isNew = order.status === 'new';
    const isMyOrder = currentUser && order.assignedRunner === currentUser.id;

    return (
      <div
        key={order.id}
        className={`
          border-l-4 border-l-amber-500 rounded-lg border border-gray-200 shadow-sm transition-all
          ${isCompleted ? 'opacity-60' : ''}
          ${isNew && !isCompleted ? 'ring-1 ring-sky-300 animate-pulse-subtle' : ''}
        `}
      >
        {/* Card header -- clickable to expand */}
        <div
          className="p-4 cursor-pointer hover:bg-black/[0.02] transition-colors"
          onClick={() => toggleExpand(order.id)}
        >
          <div className="flex items-start justify-between gap-4">
            {/* Left: info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {/* Urgent badge (all orders are urgent) */}
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Urgent
                </span>
                {/* Status badge */}
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stat.bg} ${stat.text}`}>
                  {stat.label}
                </span>
                {/* Request # */}
                <span className="text-xs text-gray-400 font-mono">#{truncateId(order.id)}</span>
                {/* Time */}
                <span className="text-xs text-gray-400 flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />
                  {timeAgo(order.requestedAt)}
                </span>
              </div>

              {/* Workstation */}
              <div className="text-lg font-bold text-gray-900 mb-0.5">{order.workstation}</div>

              {/* Requester */}
              <div className="text-sm text-gray-500 flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {getUserName(order.requestedBy)}
              </div>

              {/* Items summary (collapsed) */}
              {!isExpanded && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 text-xs bg-white/80 border border-gray-200 rounded px-2 py-1"
                    >
                      <span className="font-medium text-gray-800">{item.partName}</span>
                      <span className="text-gray-400">({item.partNumber})</span>
                      <span className="text-gray-600">x{item.quantityRequested}</span>
                      {renderLocation(item.warehouseLocationId)}
                      {renderStockStatus(item.partId, item.quantityRequested)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Runner + actions */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              {/* Assigned runner */}
              <div className="text-xs text-gray-500">
                {order.assignedRunner ? (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {getUserName(order.assignedRunner)}
                    {isMyOrder && <span className="text-blue-600 font-medium">(You)</span>}
                  </span>
                ) : (
                  <span className="italic text-gray-400">Unassigned</span>
                )}
              </div>

              {/* Actions */}
              {renderActions(order)}

              {/* Expand indicator */}
              <button className="text-gray-400 hover:text-gray-600">
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="border-t border-gray-200 p-4 bg-white/60">
            {order.notes && (
              <div className="mb-4 text-sm text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                <span className="font-medium text-gray-700">Notes:</span> {order.notes}
              </div>
            )}

            <div className="space-y-3">
              {order.items.map((item, idx) => {
                const isPulled = item.pulled;
                const isPullingStatus = order.status === 'pulling' && isMyOrder;

                return (
                  <div
                    key={idx}
                    className={`border rounded-lg p-3 transition-colors ${
                      isPulled ? 'bg-green-50/50 border-green-200' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {isPullingStatus && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleItemPulled(order.id, idx, order);
                              }}
                              className="text-gray-500 hover:text-green-600 transition-colors"
                            >
                              {isPulled ? (
                                <SquareCheck className="w-5 h-5 text-green-600" />
                              ) : (
                                <Square className="w-5 h-5" />
                              )}
                            </button>
                          )}
                          {!isPullingStatus && isPulled && (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          )}

                          <span className={`font-semibold text-gray-900 ${isPulled ? 'line-through opacity-60' : ''}`}>
                            {item.partName}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">{item.partNumber}</span>
                        </div>

                        <div className="flex items-center gap-4 text-sm mb-2">
                          <span className="text-gray-600">
                            Qty requested: <span className="font-bold">{item.quantityRequested}</span>
                          </span>
                          <span className="text-gray-600">
                            Qty pulled: <span className="font-bold">{item.quantityPulled}</span>
                          </span>
                          {renderStockStatus(item.partId, item.quantityRequested)}
                        </div>

                        {renderLocationLarge(item.warehouseLocationId)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Timestamps */}
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-400">
              <span>Requested: {new Date(order.requestedAt).toLocaleString()}</span>
              {order.pulledAt && <span>Pulled: {new Date(order.pulledAt).toLocaleString()}</span>}
              {order.deliveredAt && <span>Delivered: {new Date(order.deliveredAt).toLocaleString()}</span>}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Page render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardList className="w-7 h-7 text-blue-600" />
          Part Runner Queue
        </h1>
        <p className="text-gray-500 mt-1">Pull and deliver parts to workstations. All orders are urgent.</p>

        {/* Stats bar */}
        <div className="flex items-center gap-3 mt-4">
          <div className="flex items-center gap-1.5 bg-sky-100 text-sky-800 px-3 py-1.5 rounded-lg text-sm font-semibold">
            <CircleDot className="w-4 h-4" />
            {activeCounts.new} New
          </div>
          <div className="flex items-center gap-1.5 bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg text-sm font-semibold">
            <Package className="w-4 h-4" />
            {activeCounts.pulling} Pulling
          </div>
          <div className="flex items-center gap-1.5 bg-purple-100 text-purple-800 px-3 py-1.5 rounded-lg text-sm font-semibold">
            <Truck className="w-4 h-4" />
            {activeCounts.delivering} Delivering
          </div>
          {completedToday.length > 0 && (
            <div className="flex items-center gap-1.5 bg-green-100 text-green-800 px-3 py-1.5 rounded-lg text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              {completedToday.length} Completed Today
            </div>
          )}
          {archivedOrders.length > 0 && (
            <div className="flex items-center gap-1.5 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-sm font-semibold">
              <Archive className="w-4 h-4" />
              {archivedOrders.length} Archived
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3">
        {/* Status filters */}
        <div className="flex items-center gap-1.5">
          <FilterButton active={statusFilter === 'active'} onClick={() => setStatusFilter('active')} count={activeOrders.length + completedToday.length}>
            Active
          </FilterButton>
          <FilterButton active={statusFilter === 'new'} onClick={() => setStatusFilter('new')} count={activeCounts.new} countColor="bg-sky-100 text-sky-700">
            New
          </FilterButton>
          <FilterButton active={statusFilter === 'pulling'} onClick={() => setStatusFilter('pulling')} count={activeCounts.pulling} countColor="bg-amber-100 text-amber-700">
            Pulling
          </FilterButton>
          <FilterButton active={statusFilter === 'delivering'} onClick={() => setStatusFilter('delivering')} count={activeCounts.delivering} countColor="bg-purple-100 text-purple-700">
            Delivering
          </FilterButton>
          <FilterButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} count={internalOrders.length}>
            All (incl. archived)
          </FilterButton>
        </div>

        {/* Separator */}
        <div className="w-px h-6 bg-gray-300" />

        {/* My Assignments toggle */}
        <button
          onClick={() => setMyAssignmentsOnly(!myAssignmentsOnly)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
            myAssignmentsOnly
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          My Assignments
        </button>
      </div>

      {/* Order queue */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">No orders match your filters</p>
            <p className="text-sm mt-1">Try adjusting your filter settings</p>
          </div>
        ) : (
          filteredOrders.map((order) => renderOrderCard(order))
        )}
      </div>

      {/* Tailwind animation for subtle pulse on new orders */}
      <style>{`
        @keyframes pulse-subtle {
          0%, 100% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.3); }
          50% { box-shadow: 0 0 0 4px rgba(56, 189, 248, 0); }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
