import { useState, useRef, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  Pencil,
  ExternalLink,
  Plus,
  Package,
  MapPin,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  ImagePlus,
  Save,
  Search,
  X,
} from 'lucide-react';
import { useApp } from '../data/store';
import Modal from '../components/Modal';
import type { PartVendor } from '../types';

export default function PartDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getPartById,
    updatePart,
    products,
    getProductById,
    updateProduct,
    getVendorById,
    vendors,
    getWarehouseLocationById,
    getTransactionsByPartId,
    canEditPartNames,
    users,
  } = useApp();

  const part = getPartById(id ?? '');
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    partNumber: '',
    name: '',
    description: '',
    category: '',
    quantityInStock: 0,
    minimumStock: 0,
    unitCost: 0,
  });
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [vendorForm, setVendorForm] = useState<{
    vendorId: string;
    vendorPartNumber: string;
    cost: number;
    url: string;
    leadTimeDays: number;
  }>({
    vendorId: '',
    vendorPartNumber: '',
    cost: 0,
    url: '',
    leadTimeDays: 0,
  });
  const [showLinkProductModal, setShowLinkProductModal] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    if (showSuccessToast) {
      const timer = setTimeout(() => setShowSuccessToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessToast]);

  const transactions = useMemo(() => {
    if (!part) return [];
    return getTransactionsByPartId(part.id).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [part, getTransactionsByPartId]);

  const warehouseLocation = useMemo(() => {
    if (!part?.warehouseLocationId) return null;
    return getWarehouseLocationById(part.warehouseLocationId);
  }, [part, getWarehouseLocationById]);

  const compatibleProducts = useMemo(() => {
    if (!part) return [];
    return part.compatibleProducts.map((pid) => getProductById(pid)).filter(Boolean);
  }, [part, getProductById]);

  if (!part) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <button
          onClick={() => navigate('/parts')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={20} />
          Back to Parts
        </button>
        <div className="text-center py-16 text-gray-500">
          <Package size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">Part not found</p>
        </div>
      </div>
    );
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updatePart(part.id, { image: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleOpenEditModal = () => {
    setEditForm({
      partNumber: part.partNumber,
      name: part.name,
      description: part.description,
      category: part.category,
      quantityInStock: part.quantityInStock,
      minimumStock: part.minimumStock,
      unitCost: part.unitCost,
    });
    setShowEditModal(true);
  };

  const handleEditPart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.partNumber.trim()) return;
    updatePart(part.id, {
      partNumber: editForm.partNumber.trim(),
      name: editForm.name.trim(),
      description: editForm.description.trim(),
      category: editForm.category.trim(),
      quantityInStock: editForm.quantityInStock,
      minimumStock: editForm.minimumStock,
      unitCost: editForm.unitCost,
    });
    setShowEditModal(false);
    setShowSuccessToast(true);
  };

  const handleAddVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorForm.vendorId) return;
    const newVendor: PartVendor = {
      vendorId: vendorForm.vendorId,
      vendorPartNumber: vendorForm.vendorPartNumber,
      cost: vendorForm.cost,
      url: vendorForm.url,
      leadTimeDays: vendorForm.leadTimeDays,
    };
    updatePart(part.id, { vendors: [...part.vendors, newVendor] });
    setVendorForm({ vendorId: '', vendorPartNumber: '', cost: 0, url: '', leadTimeDays: 0 });
    setShowAddVendorModal(false);
  };

  const transactionTypeConfig: Record<string, { label: string; color: string; icon: typeof TrendingUp }> = {
    harvest_in: { label: 'Harvest In', color: 'text-green-600', icon: TrendingUp },
    order_in: { label: 'Order In', color: 'text-green-600', icon: TrendingUp },
    sold: { label: 'Sold', color: 'text-red-600', icon: TrendingDown },
    transferred: { label: 'Transferred', color: 'text-blue-600', icon: RefreshCw },
    adjustment: { label: 'Adjustment', color: 'text-amber-600', icon: RefreshCw },
    scrapped: { label: 'Scrapped', color: 'text-red-600', icon: Minus },
  };

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user?.name ?? 'Unknown';
  };

  // Products not yet linked to this part
  const availableProducts = useMemo(() => {
    if (!part) return [];
    const linked = new Set(part.compatibleProducts);
    let list = products.filter((p) => !linked.has(p.id));
    if (productSearchQuery.trim()) {
      const q = productSearchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.model.toLowerCase().includes(q) ||
          p.manufacturer.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [part, products, productSearchQuery]);

  const handleLinkProduct = () => {
    if (!selectedProductId || !part) return;
    // 1. Add product ID to this part's compatibleProducts
    updatePart(part.id, {
      compatibleProducts: [...part.compatibleProducts, selectedProductId],
    });
    // 2. Add this part to the product's parts array
    const product = getProductById(selectedProductId);
    if (product) {
      const nextLabel = String(product.parts.length + 1);
      updateProduct(product.id, {
        parts: [
          ...product.parts,
          { id: crypto.randomUUID(), partId: part.id, positionLabel: nextLabel, x: 0, y: 0 },
        ],
      });
    }
    setSelectedProductId('');
    setProductSearchQuery('');
    setShowLinkProductModal(false);
    setShowSuccessToast(true);
  };

  const handleUnlinkProduct = (productId: string) => {
    if (!part) return;
    // 1. Remove product from this part's compatibleProducts
    updatePart(part.id, {
      compatibleProducts: part.compatibleProducts.filter((pid) => pid !== productId),
    });
    // 2. Remove this part from the product's parts array
    const product = getProductById(productId);
    if (product) {
      updateProduct(product.id, {
        parts: product.parts.filter((pp) => pp.partId !== part.id),
      });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <Save size={18} />
          Part saved successfully!
        </div>
      )}

      {/* Back Button */}
      <button
        onClick={() => navigate('/parts')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={20} />
        Back to Parts
      </button>

      {/* Top Section: Image + Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Part Image */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center">
          {part.image ? (
            <img src={part.image} alt={part.name} className="w-full max-h-64 object-contain rounded-lg" />
          ) : (
            <div className="w-full h-64 bg-gray-50 rounded-lg flex flex-col items-center justify-center text-gray-400">
              <ImagePlus size={48} className="mb-2" />
              <p className="text-sm">No image uploaded</p>
            </div>
          )}
          <button
            onClick={() => imageInputRef.current?.click()}
            className="mt-4 flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Upload size={16} />
            Upload Image
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        {/* Part Info */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{part.name}</h1>
                {canEditPartNames() && (
                  <button
                    onClick={handleOpenEditModal}
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                    title="Edit Part"
                  >
                    <Pencil size={16} />
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-500 font-mono mt-1">{part.partNumber}</p>
              <span className="inline-block mt-2 text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                {part.category}
              </span>
            </div>
          </div>
          {part.description && (
            <p className="mt-4 text-gray-600">{part.description}</p>
          )}

          {/* Stock Info */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">In Stock</p>
              <p
                className={`text-3xl font-bold mt-1 ${
                  part.quantityInStock < part.minimumStock ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {part.quantityInStock}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Minimum</p>
              <p className="text-3xl font-bold mt-1 text-gray-900">{part.minimumStock}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Unit Cost</p>
              <p className="text-3xl font-bold mt-1 text-gray-900">${part.unitCost.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Vendors + Compatible Products + Location + Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendors Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Vendors</h2>
            <button
              onClick={() => setShowAddVendorModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Plus size={14} />
              Add Vendor
            </button>
          </div>

          {part.vendors.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No vendors linked to this part.</p>
          ) : (
            <div className="space-y-3">
              {part.vendors.map((pv, idx) => {
                const vendor = getVendorById(pv.vendorId);
                return (
                  <div key={idx} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link
                          to={`/vendors/${pv.vendorId}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          {vendor?.name ?? 'Unknown Vendor'}
                        </Link>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Vendor PN: {pv.vendorPartNumber || 'N/A'}
                        </p>
                      </div>
                      {pv.url && (
                        <a
                          href={pv.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <ExternalLink size={12} />
                          Visit Website
                        </a>
                      )}
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-gray-600">
                      <span>
                        <span className="font-medium">Cost:</span> ${pv.cost.toFixed(2)}
                      </span>
                      <span>
                        <span className="font-medium">Lead Time:</span> {pv.leadTimeDays} day{pv.leadTimeDays !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Compatible Products + Warehouse Location */}
        <div className="space-y-6">
          {/* Compatible Products */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Compatible Products</h2>
              <button
                onClick={() => setShowLinkProductModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Plus size={14} />
                Link Product
              </button>
            </div>
            {compatibleProducts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Not linked to any products yet.
              </p>
            ) : (
              <div className="space-y-2">
                {compatibleProducts.map((product) =>
                  product ? (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors group"
                    >
                      <Link
                        to={`/products/${product.id}`}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 shrink-0">
                          <Package size={18} className="text-gray-400 group-hover:text-blue-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {product.model} - {product.manufacturer}
                          </p>
                        </div>
                      </Link>
                      <button
                        onClick={() => handleUnlinkProduct(product.id)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                        title="Unlink product"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : null
                )}
              </div>
            )}
          </div>

          {/* Warehouse Location */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Warehouse Location</h2>
            {warehouseLocation ? (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <MapPin size={18} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{warehouseLocation.name}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {warehouseLocation.zone && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        Zone: {warehouseLocation.zone}
                      </span>
                    )}
                    {warehouseLocation.aisle && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        Aisle: {warehouseLocation.aisle}
                      </span>
                    )}
                    {warehouseLocation.shelf && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        Shelf: {warehouseLocation.shelf}
                      </span>
                    )}
                    {warehouseLocation.bin && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        Bin: {warehouseLocation.bin}
                      </span>
                    )}
                  </div>
                  {warehouseLocation.description && (
                    <p className="text-xs text-gray-500 mt-2">{warehouseLocation.description}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-gray-400">
                <MapPin size={18} />
                <p className="text-sm">No warehouse location assigned.</p>
              </div>
            )}
          </div>
        </div>

        {/* Transaction History - Full Width */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No transactions recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Quantity</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Reference</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Performed By</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 20).map((txn) => {
                    const config = transactionTypeConfig[txn.type] ?? {
                      label: txn.type,
                      color: 'text-gray-600',
                      icon: Clock,
                    };
                    const Icon = config.icon;
                    return (
                      <tr key={txn.id} className="border-b border-gray-100">
                        <td className="py-3 px-4 text-gray-600">
                          {new Date(txn.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`flex items-center gap-1.5 ${config.color} font-medium`}>
                            <Icon size={14} />
                            {config.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-semibold ${
                              txn.quantity > 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {txn.quantity > 0 ? '+' : ''}
                            {txn.quantity}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-500 text-xs font-mono">
                          {txn.reference || '---'}
                        </td>
                        <td className="py-3 px-4 text-gray-600">{getUserName(txn.performedBy)}</td>
                        <td className="py-3 px-4 text-gray-500 text-xs max-w-[200px] truncate">
                          {txn.notes || '---'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {transactions.length > 20 && (
                <p className="text-xs text-gray-400 text-center py-3">
                  Showing 20 of {transactions.length} transactions
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Part Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Part"
      >
        <form onSubmit={handleEditPart} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Part Number</label>
              <input
                type="text"
                required
                value={editForm.partNumber}
                onChange={(e) => setEditForm({ ...editForm, partNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input
              type="text"
              value={editForm.category}
              onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity in Stock</label>
              <input
                type="number"
                min={0}
                required
                value={editForm.quantityInStock}
                onChange={(e) => setEditForm({ ...editForm, quantityInStock: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock</label>
              <input
                type="number"
                min={0}
                required
                value={editForm.minimumStock}
                onChange={(e) => setEditForm({ ...editForm, minimumStock: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost ($)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                required
                value={editForm.unitCost}
                onChange={(e) => setEditForm({ ...editForm, unitCost: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Vendor Modal */}
      <Modal
        isOpen={showAddVendorModal}
        onClose={() => setShowAddVendorModal(false)}
        title="Link Vendor to Part"
      >
        <form onSubmit={handleAddVendor} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
            <select
              required
              value={vendorForm.vendorId}
              onChange={(e) => setVendorForm({ ...vendorForm, vendorId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="">-- Select Vendor --</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Part Number</label>
            <input
              type="text"
              value={vendorForm.vendorPartNumber}
              onChange={(e) => setVendorForm({ ...vendorForm, vendorPartNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost ($)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={vendorForm.cost}
                onChange={(e) => setVendorForm({ ...vendorForm, cost: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lead Time (days)</label>
              <input
                type="number"
                min={0}
                value={vendorForm.leadTimeDays}
                onChange={(e) =>
                  setVendorForm({ ...vendorForm, leadTimeDays: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Part URL (vendor website link)
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={vendorForm.url}
              onChange={(e) => setVendorForm({ ...vendorForm, url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddVendorModal(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Vendor
            </button>
          </div>
        </form>
      </Modal>

      {/* Link Product Modal */}
      <Modal
        isOpen={showLinkProductModal}
        onClose={() => {
          setShowLinkProductModal(false);
          setSelectedProductId('');
          setProductSearchQuery('');
        }}
        title="Link Part to Product"
        size="lg"
      >
        <div className="space-y-4">
          {products.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Package size={40} className="mx-auto mb-2" />
              <p className="text-sm">No products have been created yet.</p>
              <p className="text-xs mt-1">Create a product first, then link this part to it.</p>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {availableProducts.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    {productSearchQuery.trim()
                      ? 'No matching products found'
                      : 'All products are already linked to this part'}
                  </div>
                ) : (
                  availableProducts.map((product) => (
                    <label
                      key={product.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-blue-50 transition-colors ${
                        selectedProductId === product.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="selectedProduct"
                        value={product.id}
                        checked={selectedProductId === product.id}
                        onChange={() => setSelectedProductId(product.id)}
                        className="text-blue-600"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">
                          {product.model} {product.manufacturer ? `- ${product.manufacturer}` : ''} {product.category ? `| ${product.category}` : ''}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkProductModal(false);
                    setSelectedProductId('');
                    setProductSearchQuery('');
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLinkProduct}
                  disabled={!selectedProductId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Link Product
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
