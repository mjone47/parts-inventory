import { useState, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  Minus,
  X,
  ShoppingCart,
  Send,
  CheckCircle,
  AlertTriangle,
  ScanBarcode,
  MapPin,
  Package,
  User,
  Wrench,
  Layers,
  ChevronRight,
  Loader2,
  Image as ImageIcon,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../data/store';
import type { InternalOrderItem, Part, Product } from '../types';
import { lookupLPN, saveLPNRecord, lookupAmazonProduct, type AmazonProductData } from '../data/odooApi';

interface CartItem {
  part: Part;
  quantity: number;
}

// ── Hotspot tooltip for the exploded view ────────────────────────────────────

function HotspotButton({
  label,
  part,
  isInCart,
  onAdd,
}: {
  label: string;
  part: Part | null;
  isInCart: boolean;
  onAdd: () => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="absolute group"
      style={{ zIndex: 10 }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (part) onAdd();
        }}
        className={`w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center shadow-lg border-2 transition-all ${
          isInCart
            ? 'bg-green-500 border-green-200 scale-110'
            : 'bg-blue-600 border-white hover:bg-blue-700 hover:scale-110'
        }`}
      >
        {isInCart ? <CheckCircle2 size={14} /> : label}
      </button>

      {/* Tooltip */}
      {showTooltip && part && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap z-50 pointer-events-none">
          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl">
            <p className="font-semibold">{part.name}</p>
            <p className="text-gray-300 text-[11px]">{part.partNumber}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`font-medium ${
                part.quantityInStock === 0 ? 'text-red-400' :
                part.quantityInStock <= part.minimumStock ? 'text-amber-400' :
                'text-green-400'
              }`}>
                {part.quantityInStock} in stock
              </span>
              {isInCart && <span className="text-green-400">In cart</span>}
            </div>
            {!isInCart && <p className="text-blue-300 mt-0.5">Click to add</p>}
          </div>
          <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function PartRequest() {
  const {
    parts,
    searchParts,
    products,
    searchProducts,
    getProductById,
    currentUser,
    internalOrders,
    addInternalOrder,
    getWarehouseLocationById,
    getPartById,
    users,
    addProduct,
  } = useApp();

  // Form state
  const [workstation, setWorkstation] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  // LPN scan state
  const [scanInput, setScanInput] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<{
    type: 'found' | 'odoo' | 'not_found';
    message: string;
    productId?: string;
    productName?: string;
    odooData?: any;
  } | null>(null);

  // Amazon enrichment state
  const [amazonData, setAmazonData] = useState<AmazonProductData | null>(null);
  const [amazonLoading, setAmazonLoading] = useState(false);

  // Exploded view state
  const [showExplodedView, setShowExplodedView] = useState(true);
  const [highlightedPartId, setHighlightedPartId] = useState<string | null>(null);

  // UI state
  const [submitted, setSubmitted] = useState(false);
  const [lastOrder, setLastOrder] = useState<{ id: string; itemCount: number } | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  // ── Derived data ──────────────────────────────────────────────────────────

  const selectedProduct = selectedProductId ? getProductById(selectedProductId) : null;

  const productSearchResults = useMemo(() => {
    if (!productSearchQuery.trim()) return [];
    return searchProducts(productSearchQuery).slice(0, 10);
  }, [productSearchQuery, searchProducts]);

  // Parts from selected product (with ProductPart mapping for hotspot data)
  const selectedProductParts = useMemo(() => {
    if (!selectedProduct) return [];
    return selectedProduct.parts
      .map((pp) => {
        const part = getPartById(pp.partId);
        if (!part) return null;
        return { ...part, positionLabel: pp.positionLabel, hotspotX: pp.x, hotspotY: pp.y };
      })
      .filter((p): p is NonNullable<typeof p> => !!p);
  }, [selectedProduct, getPartById]);

  // Does this product have an exploded view with hotspots?
  const hasExplodedView = selectedProduct?.explodedViewImage && selectedProduct.parts.some(pp => pp.x > 0 || pp.y > 0);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchParts(searchQuery).slice(0, 20);
  }, [searchQuery, searchParts]);

  const myRequests = useMemo(() => {
    if (!currentUser) return [];
    return [...internalOrders]
      .filter((o) => o.requestedBy === currentUser.id)
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }, [internalOrders, currentUser]);

  const getUserName = (userId: string) => {
    const u = users.find((u) => u.id === userId);
    return u ? u.name : userId;
  };

  const getLocationName = (locationId?: string) => {
    if (!locationId) return '--';
    const loc = getWarehouseLocationById(locationId);
    return loc ? loc.name : locationId;
  };

  const isInCart = (partId: string) => cart.some(c => c.part.id === partId);

  // ── LPN / Identifier Scan ─────────────────────────────────────────────────

  // Trigger Amazon enrichment in background for a given ASIN
  async function enrichWithAmazon(asin: string) {
    if (!asin) return;
    setAmazonLoading(true);
    try {
      const result = await lookupAmazonProduct(asin);
      if (result.found && result.data) {
        setAmazonData(result.data);
      }
    } catch {
      // Silently fail — Amazon enrichment is best-effort
    } finally {
      setAmazonLoading(false);
    }
  }

  async function handleScan() {
    const trimmed = scanInput.trim();
    if (!trimmed) return;
    setScanLoading(true);
    setScanResult(null);
    setAmazonData(null);

    const localMatch = products.find(
      (p) =>
        p.asin.toLowerCase() === trimmed.toLowerCase() ||
        p.upc.toLowerCase() === trimmed.toLowerCase() ||
        p.model.toLowerCase() === trimmed.toLowerCase()
    );

    if (localMatch) {
      setSelectedProductId(localMatch.id);
      setProductSearchQuery(localMatch.name);
      setScanResult({ type: 'found', message: `Found: ${localMatch.name}`, productId: localMatch.id });
      setScanInput('');
      setScanLoading(false);
      // Trigger Amazon enrichment if product has an ASIN
      if (localMatch.asin) enrichWithAmazon(localMatch.asin);
      return;
    }

    try {
      const result = await lookupLPN(trimmed);
      if (result.found) {
        const localProd = result.localProduct || result.matchingLocalProduct;
        if (localProd) {
          setSelectedProductId(localProd.id);
          setProductSearchQuery(localProd.name);
          setScanResult({ type: 'found', message: `Found: ${localProd.name}`, productId: localProd.id });
          setScanInput('');
          saveLPNRecord({ lpn: trimmed, productId: localProd.id }).catch(() => {});
          // Find the full product to get ASIN for Amazon enrichment
          const fullProduct = products.find(p => p.id === localProd.id);
          if (fullProduct?.asin) enrichWithAmazon(fullProduct.asin);
        } else if (result.odooData) {
          // Odoo has the product but we don't — trigger Amazon enrichment with ASIN from Odoo
          const odooAsin = result.odooData.productRef || result.odooData.product?.defaultCode || '';
          if (odooAsin) enrichWithAmazon(odooAsin);
          setScanResult({
            type: 'odoo',
            message: `Found "${result.odooData.productName}" in Odoo, but it doesn't exist in Parts Inventory yet.`,
            productName: result.odooData.productName,
            odooData: result.odooData,
          });
        }
      } else {
        // Not found locally or in Odoo — try Amazon directly if it looks like an ASIN
        const looksLikeAsin = /^B0[A-Z0-9]{8}$/i.test(trimmed);
        if (looksLikeAsin) {
          setScanResult({ type: 'not_found', message: `No local or Odoo product found. Checking Amazon for ASIN "${trimmed}"...` });
          try {
            const amazonResult = await lookupAmazonProduct(trimmed);
            if (amazonResult.found && amazonResult.data) {
              setAmazonData(amazonResult.data);
              setScanResult({
                type: 'odoo',
                message: `Found "${amazonResult.data.title}" on Amazon. Create it as a new product?`,
                productName: amazonResult.data.title,
                odooData: {
                  productName: amazonResult.data.title,
                  productRef: trimmed,
                  product: {
                    name: amazonResult.data.title,
                    defaultCode: trimmed,
                    category: amazonResult.data.categories?.[0] || '',
                    description: amazonResult.data.description || amazonResult.data.features?.join('\n') || '',
                  },
                },
              });
            } else {
              setScanResult({ type: 'not_found', message: `No product found for "${trimmed}" in any source.` });
            }
          } catch {
            setScanResult({ type: 'not_found', message: `No product found for "${trimmed}".` });
          }
        } else {
          setScanResult({ type: 'not_found', message: `No product found for "${trimmed}".` });
        }
      }
    } catch {
      setScanResult({ type: 'not_found', message: `Could not look up "${trimmed}". Odoo may be unavailable.` });
    } finally {
      setScanLoading(false);
    }
  }

  function handleCreateFromOdoo() {
    if (!scanResult?.odooData) return;
    const od = scanResult.odooData;
    const az = amazonData; // Amazon enrichment data (if available)

    // Prefer Amazon data over Odoo data for richer fields
    const productName = az?.title || od.productName || od.product?.name || 'Unknown Product';
    const newProduct = addProduct({
      name: productName,
      model: '',
      asin: od.productRef || od.product?.defaultCode || az?.asin || '',
      upc: '',
      manufacturer: az?.brand || '',
      category: az?.categories?.[0] || od.product?.category || '',
      description: az?.description || az?.features?.join('\n') || od.product?.description || '',
      image: az?.mainImage || '',
      parts: [],
    });
    if (scanInput.trim()) {
      saveLPNRecord({ lpn: scanInput.trim(), productId: newProduct.id }).catch(() => {});
    }
    setSelectedProductId(newProduct.id);
    setProductSearchQuery(newProduct.name);
    setScanResult({ type: 'found', message: `Created & selected: ${newProduct.name}`, productId: newProduct.id });
    setScanInput('');
    setAmazonData(null);
  }

  // ── Cart helpers ──────────────────────────────────────────────────────────

  const addToCart = (part: Part) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.part.id === part.id);
      if (existing) {
        return prev.map((c) =>
          c.part.id === part.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { part, quantity: 1 }];
    });
  };

  const updateQuantity = (partId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.part.id === partId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (partId: string) => {
    setCart((prev) => prev.filter((c) => c.part.id !== partId));
  };

  const addAllPartsToCart = () => {
    selectedProductParts.forEach((part) => {
      if (!isInCart(part.id)) {
        addToCart(part);
      }
    });
  };

  const totalItems = cart.reduce((sum, c) => sum + c.quantity, 0);

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!currentUser || cart.length === 0 || !workstation.trim()) return;

    const items: InternalOrderItem[] = cart.map((c) => ({
      partId: c.part.id,
      partNumber: c.part.partNumber,
      partName: c.part.name,
      quantityRequested: c.quantity,
      quantityPulled: 0,
      warehouseLocationId: c.part.warehouseLocationId,
      pulled: false,
    }));

    const order = addInternalOrder({
      requestedBy: currentUser.id,
      workstation: workstation.trim(),
      items,
      priority: 'urgent',
      status: 'new',
      notes: notes.trim(),
    });

    setLastOrder({ id: order.id, itemCount: totalItems });
    setSubmitted(true);

    setTimeout(() => {
      setCart([]);
      setNotes('');
      setSearchQuery('');
      setScanInput('');
      setScanResult(null);
      setSelectedProductId(null);
      setProductSearchQuery('');
      setSubmitted(false);
      setLastOrder(null);
    }, 3000);
  };

  const statusColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-800',
    pulling: 'bg-amber-100 text-amber-800',
    delivering: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-600',
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="h-7 w-7 text-blue-600" />
            Request Parts
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Scan an LPN, ASIN, or UPC to find products and request parts
          </p>
        </div>
        {currentUser && (
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2 border">
            <User className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">
              Requester: {currentUser.name}
            </span>
          </div>
        )}
      </div>

      {/* Success confirmation */}
      {submitted && lastOrder && (
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6 flex items-center gap-4 animate-pulse">
          <CheckCircle className="h-10 w-10 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-lg font-bold text-green-800">Request Submitted!</p>
            <p className="text-sm text-green-700">
              Order {lastOrder.id.slice(0, 8)} -- {lastOrder.itemCount} item(s) requested.
              A runner will be assigned shortly.
            </p>
          </div>
        </div>
      )}

      {/* Workstation + Notes */}
      <div className="bg-white rounded-xl border p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Workstation / Bench</label>
            <input
              type="text"
              value={workstation}
              onChange={(e) => setWorkstation(e.target.value)}
              placeholder='e.g. "Bench 3", "Station A-12"'
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions..."
              rows={1}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
            />
          </div>
        </div>
      </div>

      {/* Part Selection + Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Part Selection (left 2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* LPN / Identifier Scan */}
          <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-4">
            <label className="block text-sm font-semibold text-indigo-800 mb-2 flex items-center gap-1.5">
              <ScanBarcode className="h-4 w-4" />
              Scan LPN / ASIN / UPC
            </label>
            <div className="flex gap-2">
              <input
                ref={scanRef}
                type="text"
                value={scanInput}
                onChange={(e) => { setScanInput(e.target.value); setScanResult(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleScan(); }}
                placeholder="Scan LPN barcode, or type ASIN / UPC / model..."
                className="flex-1 px-3 py-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono bg-white"
                autoFocus
              />
              <button
                onClick={handleScan}
                disabled={scanLoading || !scanInput.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium flex items-center gap-1.5 disabled:opacity-40 transition-colors"
              >
                {scanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Find
              </button>
            </div>

            {scanResult && (
              <div className={`mt-3 rounded-lg border p-3 ${
                scanResult.type === 'found' ? 'bg-green-50 border-green-200' :
                scanResult.type === 'odoo' ? 'bg-amber-50 border-amber-200' :
                'bg-red-50 border-red-200'
              }`}>
                <p className={`text-sm font-medium ${
                  scanResult.type === 'found' ? 'text-green-700' :
                  scanResult.type === 'odoo' ? 'text-amber-700' :
                  'text-red-700'
                }`}>
                  {scanResult.message}
                </p>
                {scanResult.type === 'odoo' && (
                  <button
                    onClick={handleCreateFromOdoo}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Create Product {amazonData ? 'with Amazon Data' : 'from Odoo Data'}
                  </button>
                )}
              </div>
            )}

            {/* Amazon enrichment preview */}
            {amazonLoading && (
              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-700">Fetching Amazon product data...</span>
              </div>
            )}
            {amazonData && !amazonLoading && (
              <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50 p-3">
                <div className="flex gap-3">
                  {amazonData.mainImage && (
                    <img
                      src={amazonData.mainImage}
                      alt={amazonData.title}
                      className="w-16 h-16 object-contain rounded bg-white border flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-purple-700 mb-0.5">Amazon Product Data</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{amazonData.title}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {amazonData.brand && (
                        <span className="text-xs text-gray-600">Brand: <strong>{amazonData.brand}</strong></span>
                      )}
                      {amazonData.price && (
                        <span className="text-xs font-semibold text-green-700">{amazonData.price}</span>
                      )}
                      {amazonData.rating > 0 && (
                        <span className="text-xs text-amber-600">
                          {'★'.repeat(Math.round(amazonData.rating))} {amazonData.rating} ({amazonData.reviewsCount})
                        </span>
                      )}
                      {amazonData.isPrime && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white">PRIME</span>
                      )}
                    </div>
                    {amazonData.features && amazonData.features.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {amazonData.features[0]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Product -> Parts Drill-Down */}
          <div className="bg-white rounded-xl border p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-gray-400" />
              Find Parts by Product
            </label>
            <input
              type="text"
              value={productSearchQuery}
              onChange={(e) => {
                setProductSearchQuery(e.target.value);
                setSelectedProductId(null);
              }}
              placeholder="Search by product name, model, ASIN, or UPC..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />

            {/* Product Results */}
            {productSearchResults.length > 0 && !selectedProductId && (
              <div className="mt-2 border rounded-lg divide-y max-h-48 overflow-y-auto">
                {productSearchResults.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProductId(product.id)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-blue-50 text-left transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-500">
                        {product.model} {product.asin ? `| ASIN: ${product.asin}` : ''}
                        {product.parts.length > 0 ? ` | ${product.parts.length} parts` : ''}
                        {product.explodedViewImage ? ' | Has diagram' : ''}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* Selected Product — Exploded View + Parts */}
            {selectedProductId && selectedProduct && (
              <div className="mt-3 space-y-3">
                {/* Product header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded">
                      {selectedProduct.name}
                    </p>
                    <span className="text-xs text-gray-400">
                      {selectedProductParts.length} part{selectedProductParts.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasExplodedView && (
                      <button
                        onClick={() => setShowExplodedView(!showExplodedView)}
                        className={`text-xs font-medium px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                          showExplodedView
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {showExplodedView ? 'Hide' : 'Show'} Diagram
                      </button>
                    )}
                    {selectedProductParts.length > 0 && (
                      <button
                        onClick={addAllPartsToCart}
                        className="text-xs font-medium px-2.5 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 flex items-center gap-1 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add All to Cart
                      </button>
                    )}
                    <button
                      onClick={() => { setSelectedProductId(null); setProductSearchQuery(''); setHighlightedPartId(null); }}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Exploded View Diagram with clickable hotspots */}
                {hasExplodedView && showExplodedView && (
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                      <ImageIcon className="h-3.5 w-3.5" />
                      Click a hotspot to add that part to your cart
                    </p>
                    <div className="relative inline-block w-full">
                      <img
                        src={selectedProduct.explodedViewImage}
                        alt={`${selectedProduct.name} Exploded View`}
                        className="w-full h-auto rounded-lg"
                        draggable={false}
                      />
                      {/* Hotspot markers */}
                      {selectedProduct.parts.map((pp) => {
                        if (pp.x === 0 && pp.y === 0) return null;
                        const part = getPartById(pp.partId);
                        if (!part) return null;
                        const inCart = isInCart(part.id);

                        return (
                          <div
                            key={pp.id}
                            style={{
                              position: 'absolute',
                              left: `${pp.x}%`,
                              top: `${pp.y}%`,
                              transform: 'translate(-50%, -50%)',
                            }}
                          >
                            <HotspotButton
                              label={pp.positionLabel}
                              part={part}
                              isInCart={inCart}
                              onAdd={() => addToCart(part)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Parts list */}
                <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                  {selectedProductParts.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-400">No parts linked to this product yet.</p>
                      <p className="text-xs text-gray-400 mt-1">Parts need to be added to this product in the Products page.</p>
                    </div>
                  ) : (
                    selectedProductParts.map((part) => {
                      const inCart = isInCart(part.id);
                      const isHighlighted = highlightedPartId === part.id;

                      return (
                        <div
                          key={part.id}
                          className={`flex items-center justify-between px-3 py-2 transition-colors ${
                            inCart ? 'bg-green-50' : isHighlighted ? 'bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                          onMouseEnter={() => setHighlightedPartId(part.id)}
                          onMouseLeave={() => setHighlightedPartId(null)}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {/* Hotspot label badge */}
                              {part.positionLabel && (part.hotspotX > 0 || part.hotspotY > 0) && (
                                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                  {part.positionLabel}
                                </span>
                              )}
                              <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                {part.partNumber}
                              </span>
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {part.name}
                              </span>
                              {inCart && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                                  IN CART
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span
                                className={`text-xs font-medium ${
                                  part.quantityInStock === 0
                                    ? 'text-red-600'
                                    : part.quantityInStock <= part.minimumStock
                                    ? 'text-amber-600'
                                    : 'text-green-600'
                                }`}
                              >
                                <Package className="h-3 w-3 inline mr-0.5" />
                                {part.quantityInStock} in stock
                              </span>
                              {part.warehouseLocationId && (
                                <span className="text-xs text-gray-500">
                                  <MapPin className="h-3 w-3 inline mr-0.5" />
                                  {getLocationName(part.warehouseLocationId)}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => addToCart(part)}
                            className={`ml-2 p-1.5 rounded-lg flex-shrink-0 transition-colors ${
                              inCart
                                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                            }`}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Search Parts (fuzzy) */}
          <div className="bg-white rounded-xl border p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
              <Search className="h-4 w-4 text-gray-400" />
              Search Parts
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by part name or number..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />

            {searchResults.length > 0 && (
              <div className="mt-3 border rounded-lg divide-y max-h-80 overflow-y-auto">
                {searchResults.map((part) => (
                  <div
                    key={part.id}
                    className={`flex items-center justify-between px-3 py-2 transition-colors ${
                      isInCart(part.id) ? 'bg-green-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {part.partNumber}
                        </span>
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {part.name}
                        </span>
                        {isInCart(part.id) && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                            IN CART
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span
                          className={`text-xs font-medium ${
                            part.quantityInStock === 0
                              ? 'text-red-600'
                              : part.quantityInStock <= part.minimumStock
                              ? 'text-amber-600'
                              : 'text-green-600'
                          }`}
                        >
                          <Package className="h-3 w-3 inline mr-0.5" />
                          {part.quantityInStock} in stock
                        </span>
                        {part.warehouseLocationId && (
                          <span className="text-xs text-gray-500">
                            <MapPin className="h-3 w-3 inline mr-0.5" />
                            {getLocationName(part.warehouseLocationId)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => addToCart(part)}
                      className={`ml-2 p-1.5 rounded-lg flex-shrink-0 transition-colors ${
                        isInCart(part.id)
                          ? 'bg-green-100 text-green-600 hover:bg-green-200'
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.trim() && searchResults.length === 0 && (
              <p className="mt-3 text-sm text-gray-500 text-center py-4">
                No parts found for "{searchQuery}"
              </p>
            )}
          </div>
        </div>

        {/* Cart (right col) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border p-4 sticky top-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-1.5">
                <ShoppingCart className="h-4 w-4" />
                Request Cart
              </h3>
              {cart.length > 0 && (
                <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {totalItems} item{totalItems !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No parts added yet</p>
                <p className="text-xs mt-1">Scan an identifier, click a hotspot, or search to add parts</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.part.id}
                    className="border rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.part.name}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                          {item.part.partNumber}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.part.id)}
                        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {item.part.quantityInStock === 0 && (
                      <div className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                        <AlertTriangle className="h-3 w-3" />
                        Out of Stock
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Stock: {item.part.quantityInStock}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.part.id, -1)}
                          className="p-1 rounded border hover:bg-gray-50"
                        >
                          <Minus className="h-3.5 w-3.5 text-gray-600" />
                        </button>
                        <span className="text-sm font-semibold w-8 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.part.id, 1)}
                          className="p-1 rounded border hover:bg-gray-50"
                        >
                          <Plus className="h-3.5 w-3.5 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleSubmit}
                  disabled={cart.length === 0 || !workstation.trim() || submitted}
                  className="w-full mt-4 py-3 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                >
                  <Send className="h-4 w-4" />
                  Submit Request ({totalItems} item{totalItems !== 1 ? 's' : ''})
                </button>

                {!workstation.trim() && cart.length > 0 && (
                  <p className="text-xs text-amber-600 text-center">
                    Enter your workstation above to submit
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* My Requests */}
      <div className="bg-white rounded-xl border">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-900">My Requests</h2>
        </div>

        {myRequests.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No requests yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium text-gray-500">Request #</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Time</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Workstation</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Items</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Runner</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {myRequests.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {order.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(order.requestedAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {order.workstation}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {order.items.reduce((s, i) => s + i.quantityRequested, 0)} part
                      {order.items.reduce((s, i) => s + i.quantityRequested, 0) !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          statusColors[order.status] || ''
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {order.assignedRunner
                        ? getUserName(order.assignedRunner)
                        : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
