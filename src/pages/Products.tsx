import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, Search, ImagePlus, Upload, ChevronLeft, ChevronRight, ScanBarcode, ExternalLink, Loader2 } from 'lucide-react';
import { useApp } from '../data/store';
import Modal from '../components/Modal';
import { lookupLPN, saveLPNRecord } from '../data/odooApi';
import type { OdooLPNLookupResult } from '../types';

export default function Products() {
  const { products, addProduct, searchProducts } = useApp();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('');
  const PAGE_SIZE = 24;

  // LPN lookup state
  const [lpnQuery, setLpnQuery] = useState('');
  const [lpnLoading, setLpnLoading] = useState(false);
  const [lpnResult, setLpnResult] = useState<OdooLPNLookupResult | null>(null);
  const [lpnError, setLpnError] = useState('');

  async function handleLPNSearch() {
    const trimmed = lpnQuery.trim();
    if (!trimmed) return;
    setLpnLoading(true);
    setLpnResult(null);
    setLpnError('');
    try {
      const result = await lookupLPN(trimmed);
      setLpnResult(result);

      // If found locally with a linked product, navigate directly
      if (result.found && result.source === 'local' && result.localProduct) {
        navigate(`/products/${result.localProduct.id}`);
        return;
      }
      // If found in Odoo with a matching local product, navigate to it
      if (result.found && result.source === 'odoo' && result.matchingLocalProduct) {
        // Save the LPN record linked to the local product
        await saveLPNRecord({
          lpn: trimmed,
          productId: result.matchingLocalProduct.id,
          odooLotId: result.odooData?.lotId,
          odooProductId: result.odooData?.productId,
          odooProductName: result.odooData?.productName || '',
          odooProductRef: result.odooData?.productRef || '',
        });
        navigate(`/products/${result.matchingLocalProduct.id}`);
        return;
      }
    } catch {
      setLpnError('Failed to look up LPN. Please try again.');
    } finally {
      setLpnLoading(false);
    }
  }

  async function handleCreateFromOdoo() {
    if (!lpnResult?.odooData) return;
    const od = lpnResult.odooData;
    const product = od.product;

    // Create the product locally
    const newProduct = addProduct({
      name: od.productName,
      model: product?.defaultCode || od.productRef || '',
      asin: od.productRef || '',
      upc: (product?.barcode as string) || '',
      manufacturer: '',
      category: product?.category || '',
      description: product?.description || '',
      image: undefined,
      parts: [],
    });

    // Save the LPN record linked to the new product
    await saveLPNRecord({
      lpn: lpnResult.odooData.lpn,
      productId: newProduct.id,
      odooLotId: od.lotId,
      odooProductId: od.productId,
      odooProductName: od.productName,
      odooProductRef: od.productRef,
    });

    setLpnResult(null);
    setLpnQuery('');
    navigate(`/products/${newProduct.id}`);
  }

  const [formData, setFormData] = useState({
    name: '',
    model: '',
    asin: '',
    upc: '',
    manufacturer: '',
    category: '',
    description: '',
  });

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return Array.from(cats).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = searchQuery.trim() ? searchProducts(searchQuery) : products;
    if (categoryFilter) {
      result = result.filter((p) => p.category === categoryFilter);
    }
    return result;
  }, [products, searchQuery, searchProducts, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const getPartsCount = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    return product?.parts.length ?? 0;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    addProduct({
      ...formData,
      image: imagePreview || undefined,
      parts: [],
    });
    setFormData({ name: '', model: '', asin: '', upc: '', manufacturer: '', category: '', description: '' });
    setImagePreview('');
    setShowAddModal(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      {/* LPN Scan Bar */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
        <label className="block text-sm font-semibold text-indigo-800 mb-2 flex items-center gap-1.5">
          <ScanBarcode size={16} />
          Scan LPN (Odoo Lookup)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={lpnQuery}
            onChange={(e) => { setLpnQuery(e.target.value); setLpnResult(null); setLpnError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLPNSearch(); }}
            placeholder="Scan or type LPN number..."
            className="flex-1 rounded-lg border border-indigo-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
          <button
            onClick={handleLPNSearch}
            disabled={lpnLoading || !lpnQuery.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {lpnLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {lpnLoading ? 'Looking up...' : 'Find'}
          </button>
        </div>

        {/* LPN Error */}
        {lpnError && (
          <p className="mt-2 text-sm text-red-600">{lpnError}</p>
        )}

        {/* LPN Result: Not found */}
        {lpnResult && !lpnResult.found && (
          <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">
              LPN <span className="font-mono font-medium">{lpnQuery}</span> was not found
              {lpnResult.odooAvailable === false ? ' (Odoo connection unavailable)' : ' in Odoo'}.
            </p>
          </div>
        )}

        {/* LPN Result: Found in Odoo, no local product */}
        {lpnResult?.found && lpnResult.source === 'odoo' && !lpnResult.matchingLocalProduct && lpnResult.odooData && (
          <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
            <p className="text-sm text-green-700 font-medium mb-2">Found in Odoo!</p>
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div><span className="text-gray-500">Product:</span> {lpnResult.odooData.productName}</div>
              <div><span className="text-gray-500">ASIN/Ref:</span> {lpnResult.odooData.productRef || '—'}</div>
              {lpnResult.odooData.product?.category && (
                <div><span className="text-gray-500">Category:</span> {lpnResult.odooData.product.category}</div>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-2">This product doesn't exist in your Parts Inventory yet.</p>
            <button
              onClick={handleCreateFromOdoo}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus size={16} />
              Create Product from Odoo Data
            </button>
          </div>
        )}

        {/* LPN Result: Found locally (no linked product) */}
        {lpnResult?.found && lpnResult.source === 'local' && !lpnResult.localProduct && (
          <div className="mt-3 p-3 bg-white rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-700">
              LPN <span className="font-mono font-medium">{lpnQuery}</span> is tracked but not linked to a local product.
              Odoo product: <span className="font-medium">{lpnResult.lpnRecord?.odooProductName}</span>
            </p>
          </div>
        )}
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by title, model, ASIN, UPC, brand, part name, or part number..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white min-w-[180px]"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Results Count */}
      <p className="text-sm text-gray-500 mb-3">
        Showing {paginatedProducts.length} of {filteredProducts.length} products
      </p>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Package size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No products found</p>
          <p className="text-sm mt-1">Try adjusting your search or add a new product.</p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => navigate(`/products/${product.id}`)}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer overflow-hidden"
            >
              {/* Image Placeholder */}
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-48 object-contain bg-white p-2"
                />
              ) : (
                <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                  <Package size={48} className="text-gray-300" />
                </div>
              )}

              {/* Card Content */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 truncate">{product.name}</h3>
                <p className="text-sm text-gray-500 mt-1">Model: {product.model}</p>
                <p className="text-sm text-gray-500">{product.manufacturer}</p>
                <div className="flex gap-3 mt-1">
                  {product.asin && <p className="text-xs text-gray-400">ASIN: {product.asin}</p>}
                  {product.upc && <p className="text-xs text-gray-400">UPC: {product.upc}</p>}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    {product.category}
                  </span>
                  <span className="text-sm text-gray-500">
                    {getPartsCount(product.id)} part{getPartsCount(product.id) !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      page === currentPage
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-white border border-gray-300'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
        </>
      )}

      {/* Add Product Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Product">
        <form onSubmit={handleAddProduct} className="space-y-4">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
            {imagePreview ? (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={imagePreview}
                  alt="Product preview"
                  className="rounded max-h-40 object-contain"
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Upload size={14} />
                  Change Image
                </button>
              </div>
            ) : (
              <div
                onClick={() => imageInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition-colors"
              >
                <ImagePlus size={32} className="text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Click to upload product image</p>
              </div>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <input
              type="text"
              required
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ASIN</label>
              <input
                type="text"
                value={formData.asin}
                onChange={(e) => setFormData({ ...formData, asin: e.target.value })}
                placeholder="e.g. B01N5X4YQK"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">UPC</label>
              <input
                type="text"
                value={formData.upc}
                onChange={(e) => setFormData({ ...formData, upc: e.target.value })}
                placeholder="e.g. 013803269161"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand / Manufacturer</label>
            <input
              type="text"
              required
              value={formData.manufacturer}
              onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input
              type="text"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Product
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
