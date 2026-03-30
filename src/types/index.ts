export type UserRole = 'admin' | 'manager' | 'technician' | 'runner' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Product {
  id: string;
  name: string;
  model: string;
  asin: string;
  upc: string;
  manufacturer: string;
  category: string;
  description: string;
  image?: string;
  explodedViewImage?: string;
  parts: ProductPart[];
  createdAt: string;
}

export interface ProductPart {
  id: string;
  partId: string;
  positionLabel: string; // label on the exploded view (e.g., "1", "2A")
  x: number; // percentage position on exploded view image
  y: number; // percentage position on exploded view image
}

export type PartCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';

export interface Part {
  id: string;
  partNumber: string;
  name: string;
  description: string;
  category: string;
  image?: string;
  quantityInStock: number; // total = sum of all condition quantities
  minimumStock: number;
  unitCost: number;
  // Quantity breakdown by condition
  qtyNew: number;
  qtyLikeNew: number;
  qtyGood: number;
  qtyFair: number;
  qtyPoor: number;
  compatibleProducts: string[]; // product IDs
  vendors: PartVendor[];
  warehouseLocationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartVendor {
  vendorId: string;
  vendorPartNumber: string;
  cost: number;
  url: string; // direct link to part on vendor's website
  leadTimeDays: number;
}

export interface Vendor {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  notes: string;
  createdAt: string;
}

export interface HarvestSession {
  id: string;
  productId: string;
  serialNumber: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  notes: string;
  harvestedParts: HarvestedPart[];
  harvestedBy: string; // user ID
  date: string;
  status: 'in_progress' | 'completed';
  lpn?: string; // Odoo LPN for chain of custody tracking
}

// ── Odoo / LPN types ──────────────────────────────────────────────────────────

export interface LPNRecord {
  id: string;
  lpn: string;
  productId?: string;
  odooLotId?: number;
  odooProductId?: number;
  odooProductName: string;
  odooProductRef: string;
  firstSeenAt: string;
  lastSeenAt: string;
  notes: string;
}

export interface OdooLPNLookupResult {
  found: boolean;
  source?: 'local' | 'odoo';
  odooAvailable?: boolean;
  lpnRecord?: LPNRecord;
  odooData?: {
    lotId: number;
    lpn: string;
    productId: number;
    productName: string;
    productRef: string;
    product?: {
      productId: number;
      name: string;
      defaultCode: string;
      barcode: string | false;
      category: string;
      description: string;
      listPrice: number;
    };
  };
  localProduct?: { id: string; name: string; model: string };
  matchingLocalProduct?: { id: string; name: string; model: string };
}

export interface HarvestedPart {
  id: string;
  partId: string;
  quantity: number;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'salvage';
  notes: string;
  addedToInventory: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  vendorId: string;
  items: OrderItem[];
  status: 'draft' | 'ordered' | 'shipped' | 'partial' | 'received' | 'cancelled';
  orderDate: string;
  expectedDelivery: string;
  trackingNumber: string;
  notes: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  createdBy: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  partId: string;
  quantity: number;
  unitCost: number;
  receivedQuantity: number;
}

export interface WarehouseLocation {
  id: string;
  name: string;
  zone: string;
  aisle: string;
  shelf: string;
  bin: string;
  description: string;
  barcode: string;
  partIds: string[];
}

export type InternalOrderStatus = 'new' | 'pulling' | 'delivering' | 'completed' | 'cancelled';
export type InternalOrderPriority = 'normal' | 'urgent' | 'critical';

export interface InternalOrder {
  id: string;
  requestedBy: string; // user ID (technician)
  workstation: string; // bench/station identifier
  items: InternalOrderItem[];
  priority: InternalOrderPriority;
  status: InternalOrderStatus;
  notes: string;
  assignedRunner?: string; // user ID (part runner)
  requestedAt: string;
  pulledAt?: string;
  deliveredAt?: string;
}

export interface InternalOrderItem {
  partId: string;
  partNumber: string;
  partName: string;
  quantityRequested: number;
  quantityPulled: number;
  warehouseLocationId?: string;
  pulled: boolean;
}

export interface InventoryTransaction {
  id: string;
  partId: string;
  type: 'harvest_in' | 'order_in' | 'sold' | 'transferred' | 'adjustment' | 'scrapped';
  quantity: number;
  reference: string; // harvest session ID or order ID
  notes: string;
  performedBy: string;
  date: string;
}
