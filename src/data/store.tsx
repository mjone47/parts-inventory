import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type {
  User,
  UserRole,
  Product,
  Part,
  Vendor,
  HarvestSession,
  HarvestedPart,
  Order,
  WarehouseLocation,
  InventoryTransaction,
  InternalOrder,
  InternalOrderStatus,
} from '../types';

// ── API helper ────────────────────────────────────────────────────────────────

const API = '/api';

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`API ${options?.method || 'GET'} ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

// ── Context value type ─────────────────────────────────────────────────────────

interface AppContextValue {
  // Products
  products: Product[];
  getProductById: (id: string) => Product | undefined;
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Product;
  updateProduct: (id: string, updates: Partial<Omit<Product, 'id'>>) => void;
  deleteProduct: (id: string) => void;
  searchProducts: (query: string) => Product[];

  // Parts
  parts: Part[];
  getPartById: (id: string) => Part | undefined;
  addPart: (part: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>) => Part;
  addPartAsync: (part: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Part>;
  updatePart: (id: string, updates: Partial<Omit<Part, 'id'>>) => void;
  deletePart: (id: string) => void;
  adjustStock: (id: string, quantityChange: number, condition?: string) => void;
  searchParts: (query: string) => Part[];
  generatePrcId: () => Promise<string>;
  checkDuplicatePartNumber: (partNumber: string) => Promise<{ exists: boolean; partId?: string; partName?: string }>;

  // Vendors
  vendors: Vendor[];
  getVendorById: (id: string) => Vendor | undefined;
  addVendor: (vendor: Omit<Vendor, 'id' | 'createdAt'>) => Vendor;
  updateVendor: (id: string, updates: Partial<Omit<Vendor, 'id'>>) => void;
  deleteVendor: (id: string) => void;

  // Harvest Sessions
  harvestSessions: HarvestSession[];
  getHarvestSessionById: (id: string) => HarvestSession | undefined;
  addHarvestSession: (session: Omit<HarvestSession, 'id'>) => HarvestSession;
  updateHarvestSession: (id: string, updates: Partial<Omit<HarvestSession, 'id'>>) => void;
  completeHarvestSession: (id: string) => void;
  addHarvestedPart: (sessionId: string, part: Omit<HarvestedPart, 'id'>) => void;

  // Orders
  orders: Order[];
  getOrderById: (id: string) => Order | undefined;
  addOrder: (order: Omit<Order, 'id' | 'createdAt'>) => Order;
  updateOrder: (id: string, updates: Partial<Omit<Order, 'id'>>) => void;
  updateOrderStatus: (id: string, status: Order['status']) => void;
  receiveOrderItems: (id: string, receivedItems: { itemId: string; quantity: number }[]) => void;

  // Warehouse Locations
  warehouseLocations: WarehouseLocation[];
  getWarehouseLocationById: (id: string) => WarehouseLocation | undefined;
  addWarehouseLocation: (location: Omit<WarehouseLocation, 'id'>) => WarehouseLocation;
  updateWarehouseLocation: (id: string, updates: Partial<Omit<WarehouseLocation, 'id'>>) => void;
  deleteWarehouseLocation: (id: string) => void;
  renameZone: (oldZone: string, newZone: string) => void;
  assignPartToLocation: (locationId: string, partId: string) => void;
  removePartFromLocation: (locationId: string, partId: string) => void;

  // Inventory Transactions
  inventoryTransactions: InventoryTransaction[];
  getTransactionsByPartId: (partId: string) => InventoryTransaction[];
  addInventoryTransaction: (txn: Omit<InventoryTransaction, 'id'>) => InventoryTransaction;

  // Internal Orders
  internalOrders: InternalOrder[];
  getInternalOrderById: (id: string) => InternalOrder | undefined;
  addInternalOrder: (order: Omit<InternalOrder, 'id' | 'requestedAt'>) => InternalOrder;
  updateInternalOrder: (id: string, updates: Partial<Omit<InternalOrder, 'id'>>) => void;
  updateInternalOrderStatus: (id: string, status: InternalOrderStatus, runnerId?: string) => void;

  // Users
  users: User[];
  currentUser: User | undefined;
  setCurrentUser: (userId: string) => void;
  addUser: (user: Omit<User, 'id'>) => User;
  updateUser: (id: string, updates: Partial<Omit<User, 'id'>>) => void;
  deleteUser: (id: string) => void;
  canEditPartNames: () => boolean;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

// ── Provider ───────────────────────────────────────────────────────────────────

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [harvestSessions, setHarvestSessions] = useState<HarvestSession[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [warehouseLocations, setWarehouseLocations] = useState<WarehouseLocation[]>([]);
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>([]);
  const [internalOrders, setInternalOrders] = useState<InternalOrder[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // ── Load all data from API on mount ──────────────────────────────────────
  useEffect(() => {
    async function loadAll() {
      try {
        const [u, p, pt, v, hs, o, wl, it, io] = await Promise.all([
          api<User[]>('/users'),
          api<Product[]>('/products'),
          api<Part[]>('/parts'),
          api<Vendor[]>('/vendors'),
          api<HarvestSession[]>('/harvest-sessions'),
          api<Order[]>('/orders'),
          api<WarehouseLocation[]>('/warehouse-locations'),
          api<InventoryTransaction[]>('/inventory-transactions'),
          api<InternalOrder[]>('/internal-orders'),
        ]);

        setUsers(u);
        setProducts(p);
        setParts(pt);
        setVendors(v);
        setHarvestSessions(hs);
        setOrders(o);
        setWarehouseLocations(wl);
        setInventoryTransactions(it);
        setInternalOrders(io);

        // Restore current user from localStorage (session preference only)
        const savedUserId = localStorage.getItem('pim_currentUserId');
        if (savedUserId && u.some((user) => user.id === savedUserId)) {
          setCurrentUserId(savedUserId);
        } else if (u.length > 0) {
          setCurrentUserId(u[0].id);
        }

        setIsReady(true);
      } catch (err) {
        console.error('Failed to load data from API:', err);
      }
    }
    loadAll();
  }, []);

  // ── Products ───────────────────────────────────────────────────────────────

  const getProductById = useCallback(
    (id: string) => products.find((p) => p.id === id),
    [products],
  );

  const addProduct = useCallback(
    (data: Omit<Product, 'id' | 'createdAt'>): Product => {
      // Optimistic: create a temp ID, then replace with server response
      const tempProduct: Product = { ...data, id: 'temp-' + Date.now(), createdAt: new Date().toISOString() };
      setProducts((prev) => [...prev, tempProduct]);
      api<Product>('/products', { method: 'POST', body: JSON.stringify(data) }).then((saved) => {
        setProducts((prev) => prev.map((p) => (p.id === tempProduct.id ? saved : p)));
      });
      return tempProduct;
    },
    [],
  );

  const updateProduct = useCallback((id: string, updates: Partial<Omit<Product, 'id'>>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    api<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(updates) }).then((saved) => {
      setProducts((prev) => prev.map((p) => (p.id === id ? saved : p)));
    });
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    api(`/products/${id}`, { method: 'DELETE' });
  }, []);

  const searchProducts = useCallback(
    (query: string): Product[] => {
      const q = query.toLowerCase();
      return products.filter((p) => {
        if (
          p.name.toLowerCase().includes(q) ||
          p.model.toLowerCase().includes(q) ||
          p.asin.toLowerCase().includes(q) ||
          p.upc.toLowerCase().includes(q) ||
          p.manufacturer.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
        ) {
          return true;
        }
        return p.parts.some((pp) => {
          const part = parts.find((pt) => pt.id === pp.partId);
          if (!part) return false;
          return (
            part.name.toLowerCase().includes(q) ||
            part.partNumber.toLowerCase().includes(q) ||
            part.id.toLowerCase().includes(q)
          );
        });
      });
    },
    [products, parts],
  );

  // ── Parts ──────────────────────────────────────────────────────────────────

  const getPartById = useCallback(
    (id: string) => parts.find((p) => p.id === id),
    [parts],
  );

  const addPart = useCallback(
    (data: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>): Part => {
      const now = new Date().toISOString();
      const tempPart: Part = { ...data, id: 'temp-' + Date.now(), createdAt: now, updatedAt: now };
      setParts((prev) => [...prev, tempPart]);
      api<Part>('/parts', { method: 'POST', body: JSON.stringify(data) }).then((saved) => {
        setParts((prev) => prev.map((p) => (p.id === tempPart.id ? saved : p)));
      });
      return tempPart;
    },
    [],
  );

  const addPartAsync = useCallback(
    async (data: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>): Promise<Part> => {
      const saved = await api<Part>('/parts', { method: 'POST', body: JSON.stringify(data) });
      setParts((prev) => [...prev, saved]);
      return saved;
    },
    [],
  );

  const updatePart = useCallback((id: string, updates: Partial<Omit<Part, 'id'>>) => {
    setParts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p)),
    );
    api<Part>(`/parts/${id}`, { method: 'PUT', body: JSON.stringify(updates) }).then((saved) => {
      setParts((prev) => prev.map((p) => (p.id === id ? saved : p)));
    });
  }, []);

  const deletePart = useCallback((id: string) => {
    setParts((prev) => prev.filter((p) => p.id !== id));
    api(`/parts/${id}`, { method: 'DELETE' });
  }, []);

  const adjustStock = useCallback((id: string, quantityChange: number, condition?: string) => {
    setParts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, quantityInStock: Math.max(0, p.quantityInStock + quantityChange), updatedAt: new Date().toISOString() };
        // Update condition-specific quantity
        if (condition === 'new') updated.qtyNew = Math.max(0, (p.qtyNew || 0) + quantityChange);
        else if (condition === 'like_new') updated.qtyLikeNew = Math.max(0, (p.qtyLikeNew || 0) + quantityChange);
        else if (condition === 'good') updated.qtyGood = Math.max(0, (p.qtyGood || 0) + quantityChange);
        else if (condition === 'fair') updated.qtyFair = Math.max(0, (p.qtyFair || 0) + quantityChange);
        else if (condition === 'poor') updated.qtyPoor = Math.max(0, (p.qtyPoor || 0) + quantityChange);
        return updated;
      }),
    );
    api(`/parts/${id}/stock`, { method: 'PATCH', body: JSON.stringify({ quantityChange, condition }) });
  }, []);

  const searchParts = useCallback(
    (query: string): Part[] => {
      const q = query.toLowerCase();
      return parts.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.partNumber.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      );
    },
    [parts],
  );

  const generatePrcId = useCallback(async (): Promise<string> => {
    const result = await api<{ partNumber: string }>('/parts/next-prc-id');
    return result.partNumber;
  }, []);

  const checkDuplicatePartNumber = useCallback(async (partNumber: string): Promise<{ exists: boolean; partId?: string; partName?: string }> => {
    return api<{ exists: boolean; partId?: string; partName?: string }>(`/parts/check-duplicate/${encodeURIComponent(partNumber)}`);
  }, []);

  // ── Vendors ────────────────────────────────────────────────────────────────

  const getVendorById = useCallback(
    (id: string) => vendors.find((v) => v.id === id),
    [vendors],
  );

  const addVendor = useCallback(
    (data: Omit<Vendor, 'id' | 'createdAt'>): Vendor => {
      const tempVendor: Vendor = { ...data, id: 'temp-' + Date.now(), createdAt: new Date().toISOString() };
      setVendors((prev) => [...prev, tempVendor]);
      api<Vendor>('/vendors', { method: 'POST', body: JSON.stringify(data) }).then((saved) => {
        setVendors((prev) => prev.map((v) => (v.id === tempVendor.id ? saved : v)));
      });
      return tempVendor;
    },
    [],
  );

  const updateVendor = useCallback((id: string, updates: Partial<Omit<Vendor, 'id'>>) => {
    setVendors((prev) => prev.map((v) => (v.id === id ? { ...v, ...updates } : v)));
    api(`/vendors/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
  }, []);

  const deleteVendor = useCallback((id: string) => {
    setVendors((prev) => prev.filter((v) => v.id !== id));
    api(`/vendors/${id}`, { method: 'DELETE' });
  }, []);

  // ── Harvest Sessions ───────────────────────────────────────────────────────

  const getHarvestSessionById = useCallback(
    (id: string) => harvestSessions.find((s) => s.id === id),
    [harvestSessions],
  );

  const addHarvestSession = useCallback(
    (data: Omit<HarvestSession, 'id'>): HarvestSession => {
      const tempSession: HarvestSession = { ...data, id: 'temp-' + Date.now() };
      setHarvestSessions((prev) => [...prev, tempSession]);
      api<HarvestSession>('/harvest-sessions', { method: 'POST', body: JSON.stringify(data) }).then((saved) => {
        setHarvestSessions((prev) => prev.map((s) => (s.id === tempSession.id ? saved : s)));
      });
      return tempSession;
    },
    [],
  );

  const updateHarvestSession = useCallback(
    (id: string, updates: Partial<Omit<HarvestSession, 'id'>>) => {
      setHarvestSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
      api(`/harvest-sessions/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
    },
    [],
  );

  const completeHarvestSession = useCallback((id: string) => {
    setHarvestSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'completed' as const } : s)),
    );
    api(`/harvest-sessions/${id}/complete`, { method: 'PUT' });
  }, []);

  const addHarvestedPart = useCallback(
    (sessionId: string, partData: Omit<HarvestedPart, 'id'>) => {
      const tempId = 'temp-' + Date.now();
      const tempPart: HarvestedPart = { ...partData, id: tempId };
      setHarvestSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, harvestedParts: [...s.harvestedParts, tempPart] }
            : s,
        ),
      );
      api<HarvestedPart>(`/harvest-sessions/${sessionId}/parts`, {
        method: 'POST',
        body: JSON.stringify(partData),
      }).then((saved) => {
        setHarvestSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? { ...s, harvestedParts: s.harvestedParts.map((hp) => (hp.id === tempId ? saved : hp)) }
              : s,
          ),
        );
      });
    },
    [],
  );

  // ── Orders ─────────────────────────────────────────────────────────────────

  const getOrderById = useCallback(
    (id: string) => orders.find((o) => o.id === id),
    [orders],
  );

  const addOrder = useCallback(
    (data: Omit<Order, 'id' | 'createdAt'>): Order => {
      const tempOrder: Order = { ...data, id: 'temp-' + Date.now(), createdAt: new Date().toISOString() };
      setOrders((prev) => [...prev, tempOrder]);
      api<Order>('/orders', { method: 'POST', body: JSON.stringify(data) }).then((saved) => {
        setOrders((prev) => prev.map((o) => (o.id === tempOrder.id ? saved : o)));
      });
      return tempOrder;
    },
    [],
  );

  const updateOrder = useCallback((id: string, updates: Partial<Omit<Order, 'id'>>) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...updates } : o)));
    api(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
  }, []);

  const updateOrderStatus = useCallback((id: string, status: Order['status']) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    api(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
  }, []);

  const receiveOrderItems = useCallback(
    (id: string, receivedItems: { itemId: string; quantity: number }[]) => {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== id) return o;
          const updatedItems = o.items.map((item) => {
            const received = receivedItems.find((r) => r.itemId === item.id);
            if (!received) return item;
            return { ...item, receivedQuantity: item.receivedQuantity + received.quantity };
          });
          const allReceived = updatedItems.every((item) => item.receivedQuantity >= item.quantity);
          const someReceived = updatedItems.some((item) => item.receivedQuantity > 0);
          let newStatus: Order['status'] = o.status;
          if (allReceived) newStatus = 'received';
          else if (someReceived) newStatus = 'partial';
          return { ...o, items: updatedItems, status: newStatus };
        }),
      );
      api(`/orders/${id}/receive`, { method: 'POST', body: JSON.stringify({ receivedItems }) });
    },
    [],
  );

  // ── Warehouse Locations ────────────────────────────────────────────────────

  const getWarehouseLocationById = useCallback(
    (id: string) => warehouseLocations.find((l) => l.id === id),
    [warehouseLocations],
  );

  const addWarehouseLocation = useCallback(
    (data: Omit<WarehouseLocation, 'id'>): WarehouseLocation => {
      const tempLoc: WarehouseLocation = { ...data, id: 'temp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) };
      setWarehouseLocations((prev) => [...prev, tempLoc]);
      api<WarehouseLocation>('/warehouse-locations', { method: 'POST', body: JSON.stringify(data) }).then((saved) => {
        setWarehouseLocations((prev) => prev.map((l) => (l.id === tempLoc.id ? saved : l)));
      });
      return tempLoc;
    },
    [],
  );

  const updateWarehouseLocation = useCallback(
    (id: string, updates: Partial<Omit<WarehouseLocation, 'id'>>) => {
      setWarehouseLocations((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
      api(`/warehouse-locations/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
    },
    [],
  );

  const deleteWarehouseLocation = useCallback((id: string) => {
    setWarehouseLocations((prev) => prev.filter((l) => l.id !== id));
    api(`/warehouse-locations/${id}`, { method: 'DELETE' });
  }, []);

  const renameZone = useCallback((oldZone: string, newZone: string) => {
    setWarehouseLocations((prev) =>
      prev.map((l) => {
        if (l.zone !== oldZone) return l;
        const updated = { ...l, zone: newZone };
        updated.name = `${newZone}-${l.aisle}-${l.shelf}-${l.bin}`;
        updated.barcode = `WL-${newZone}${l.aisle.padStart(2, '0')}-${l.shelf.padStart(2, '0')}-${l.bin.padStart(2, '0')}`;
        return updated;
      }),
    );
    api('/warehouse-locations/rename-zone', {
      method: 'POST',
      body: JSON.stringify({ oldZone, newZone }),
    });
  }, []);

  const assignPartToLocation = useCallback((locationId: string, partId: string) => {
    setWarehouseLocations((prev) =>
      prev.map((l) =>
        l.id === locationId && !l.partIds.includes(partId)
          ? { ...l, partIds: [...l.partIds, partId] }
          : l,
      ),
    );
    api(`/warehouse-locations/${locationId}/assign-part`, {
      method: 'POST',
      body: JSON.stringify({ partId }),
    });
  }, []);

  const removePartFromLocation = useCallback((locationId: string, partId: string) => {
    setWarehouseLocations((prev) =>
      prev.map((l) =>
        l.id === locationId ? { ...l, partIds: l.partIds.filter((pid) => pid !== partId) } : l,
      ),
    );
    api(`/warehouse-locations/${locationId}/remove-part/${partId}`, { method: 'DELETE' });
  }, []);

  // ── Inventory Transactions ─────────────────────────────────────────────────

  const getTransactionsByPartId = useCallback(
    (partId: string) => inventoryTransactions.filter((t) => t.partId === partId),
    [inventoryTransactions],
  );

  const addInventoryTransaction = useCallback(
    (data: Omit<InventoryTransaction, 'id'>): InventoryTransaction => {
      const tempTxn: InventoryTransaction = { ...data, id: 'temp-' + Date.now() };
      setInventoryTransactions((prev) => [...prev, tempTxn]);
      api<InventoryTransaction>('/inventory-transactions', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then((saved) => {
        setInventoryTransactions((prev) => prev.map((t) => (t.id === tempTxn.id ? saved : t)));
      });
      return tempTxn;
    },
    [],
  );

  // ── Internal Orders ────────────────────────────────────────────────────────

  const getInternalOrderById = useCallback(
    (id: string) => internalOrders.find((o) => o.id === id),
    [internalOrders],
  );

  const addInternalOrder = useCallback(
    (data: Omit<InternalOrder, 'id' | 'requestedAt'>): InternalOrder => {
      const tempOrder: InternalOrder = {
        ...data,
        id: 'temp-' + Date.now(),
        requestedAt: new Date().toISOString(),
      };
      setInternalOrders((prev) => [...prev, tempOrder]);
      api<InternalOrder>('/internal-orders', { method: 'POST', body: JSON.stringify(data) }).then((saved) => {
        setInternalOrders((prev) => prev.map((o) => (o.id === tempOrder.id ? saved : o)));
      });
      return tempOrder;
    },
    [],
  );

  const updateInternalOrder = useCallback(
    (id: string, updates: Partial<Omit<InternalOrder, 'id'>>) => {
      setInternalOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...updates } : o)));
      api(`/internal-orders/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
    },
    [],
  );

  const updateInternalOrderStatus = useCallback(
    (id: string, status: InternalOrderStatus, runnerId?: string) => {
      setInternalOrders((prev) =>
        prev.map((o) => {
          if (o.id !== id) return o;
          const updates: Partial<InternalOrder> = { status };
          if (runnerId) updates.assignedRunner = runnerId;
          if (status === 'pulling') updates.pulledAt = new Date().toISOString();
          if (status === 'delivering' || status === 'completed')
            updates.deliveredAt = new Date().toISOString();
          return { ...o, ...updates };
        }),
      );
      api(`/internal-orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, runnerId }),
      });
    },
    [],
  );

  // ── Users ──────────────────────────────────────────────────────────────────

  const currentUser = users.find((u) => u.id === currentUserId);

  const setCurrentUser = useCallback((userId: string) => {
    setCurrentUserId(userId);
    localStorage.setItem('pim_currentUserId', userId); // session preference only
  }, []);

  const addUser = useCallback(
    (data: Omit<User, 'id'>): User => {
      const tempUser: User = { ...data, id: 'temp-' + Date.now() };
      setUsers((prev) => [...prev, tempUser]);
      api<User>('/users', { method: 'POST', body: JSON.stringify(data) }).then((saved) => {
        setUsers((prev) => prev.map((u) => (u.id === tempUser.id ? saved : u)));
      });
      return tempUser;
    },
    [],
  );

  const updateUser = useCallback(
    (id: string, updates: Partial<Omit<User, 'id'>>) => {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));
      api(`/users/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
    },
    [],
  );

  const deleteUser = useCallback(
    (id: string) => {
      setUsers((prev) => prev.filter((u) => u.id !== id));
      api(`/users/${id}`, { method: 'DELETE' });
    },
    [],
  );

  const canEditPartNames = useCallback((): boolean => {
    if (!currentUser) return false;
    const editRoles: UserRole[] = ['admin', 'manager'];
    return editRoles.includes(currentUser.role);
  }, [currentUser]);

  // ── Context value ──────────────────────────────────────────────────────────

  const value: AppContextValue = {
    products, getProductById, addProduct, updateProduct, deleteProduct, searchProducts,
    parts, getPartById, addPart, addPartAsync, updatePart, deletePart, adjustStock, searchParts, generatePrcId, checkDuplicatePartNumber,
    vendors, getVendorById, addVendor, updateVendor, deleteVendor,
    harvestSessions, getHarvestSessionById, addHarvestSession, updateHarvestSession, completeHarvestSession, addHarvestedPart,
    orders, getOrderById, addOrder, updateOrder, updateOrderStatus, receiveOrderItems,
    warehouseLocations, getWarehouseLocationById, addWarehouseLocation, updateWarehouseLocation, deleteWarehouseLocation, renameZone, assignPartToLocation, removePartFromLocation,
    inventoryTransactions, getTransactionsByPartId, addInventoryTransaction,
    internalOrders, getInternalOrderById, addInternalOrder, updateInternalOrder, updateInternalOrderStatus,
    users, currentUser, setCurrentUser, addUser, updateUser, deleteUser, canEditPartNames,
  };

  if (!isReady) return null;

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ── Custom hook ────────────────────────────────────────────────────────────────

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
