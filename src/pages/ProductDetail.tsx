import { useState, useRef, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  Plus,
  MapPin,
  Eye,
  ShoppingCart,
  Search,
  ImagePlus,
  Package,
  Pencil,
  Trash2,
  Save,
  CheckCircle,
} from 'lucide-react';
import { useApp } from '../data/store';
import Modal from '../components/Modal';
import type { ProductPart } from '../types';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getProductById,
    updateProduct,
    parts,
    getPartById,
    addPartAsync,
    getVendorById,
    adjustStock,
  } = useApp();

  const product = getProductById(id ?? '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const explodedViewRef = useRef<HTMLDivElement>(null);

  const [showPartModal, setShowPartModal] = useState(false);
  const [showHotspotPartModal, setShowHotspotPartModal] = useState(false);
  const [showMarkerModal, setShowMarkerModal] = useState<ProductPart | null>(null);
  const [isPlacingHotspot, setIsPlacingHotspot] = useState(false);
  const [pendingHotspot, setPendingHotspot] = useState<{ x: number; y: number } | null>(null);
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);

  // Add Part to Product modal state
  const [partSearchQuery, setPartSearchQuery] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [showCreatePartForm, setShowCreatePartForm] = useState(false);
  const [newPartForm, setNewPartForm] = useState({
    partNumber: '',
    name: '',
    description: '',
    category: '',
    quantityInStock: 0,
    minimumStock: 0,
    unitCost: 0,
  });

  // Hotspot label
  const [hotspotLabel, setHotspotLabel] = useState('');

  // Edit/Delete hotspot state
  const [showEditHotspotModal, setShowEditHotspotModal] = useState<ProductPart | null>(null);
  const [editHotspotLabel, setEditHotspotLabel] = useState('');
  const [editHotspotPartId, setEditHotspotPartId] = useState('');

  // Edit Product state
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [editProductForm, setEditProductForm] = useState({ name: '', model: '', asin: '', upc: '', manufacturer: '', category: '', description: '' });
  const [editProductImage, setEditProductImage] = useState<string>('');
  const [showToast, setShowToast] = useState(false);
  const editImageInputRef = useRef<HTMLInputElement>(null);

  const productParts = useMemo(() => {
    if (!product) return [];
    return product.parts.map((pp) => ({
      ...pp,
      part: getPartById(pp.partId),
    }));
  }, [product, getPartById]);

  const filteredParts = useMemo(() => {
    if (!partSearchQuery.trim()) return parts;
    const q = partSearchQuery.toLowerCase();
    return parts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.partNumber.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [parts, partSearchQuery]);

  useEffect(() => {
    if (showToast) {
      const t = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(t);
    }
  }, [showToast]);

  if (!product) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <button
          onClick={() => navigate('/products')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={20} />
          Back to Products
        </button>
        <div className="text-center py-16 text-gray-500">
          <Package size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">Product not found</p>
        </div>
      </div>
    );
  }

  const handleOpenEditProduct = () => {
    setEditProductForm({
      name: product.name,
      model: product.model,
      asin: product.asin,
      upc: product.upc,
      manufacturer: product.manufacturer,
      category: product.category,
      description: product.description,
    });
    setEditProductImage(product.image || '');
    setShowEditProductModal(true);
  };

  const handleEditProductImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setEditProductImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = () => {
    updateProduct(product.id, {
      ...editProductForm,
      image: editProductImage || undefined,
    });
    setShowEditProductModal(false);
    setShowToast(true);
  };

  const handleUploadExplodedView = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateProduct(product.id, { explodedViewImage: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleExplodedViewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlacingHotspot || !explodedViewRef.current) return;
    const rect = explodedViewRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingHotspot({ x, y });
    setIsPlacingHotspot(false);
    setShowHotspotPartModal(true);
  };

  const handlePlaceHotspot = () => {
    if (!pendingHotspot || !selectedPartId || !hotspotLabel) return;
    const newPart: ProductPart = {
      id: crypto.randomUUID(),
      partId: selectedPartId,
      positionLabel: hotspotLabel,
      x: pendingHotspot.x,
      y: pendingHotspot.y,
    };
    updateProduct(product.id, { parts: [...product.parts, newPart] });
    setPendingHotspot(null);
    setSelectedPartId('');
    setHotspotLabel('');
    setShowHotspotPartModal(false);
  };

  const handleAddExistingPart = () => {
    if (!selectedPartId) return;
    const nextLabel = String(product.parts.length + 1);
    const newProductPart: ProductPart = {
      id: crypto.randomUUID(),
      partId: selectedPartId,
      positionLabel: nextLabel,
      x: 0,
      y: 0,
    };
    updateProduct(product.id, { parts: [...product.parts, newProductPart] });
    setSelectedPartId('');
    setPartSearchQuery('');
    setShowPartModal(false);
  };

  const [isCreatingPart, setIsCreatingPart] = useState(false);

  const handleCreateAndAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingPart(true);
    try {
      const savedPart = await addPartAsync({
        ...newPartForm,
        compatibleProducts: [product.id],
        vendors: [],
        warehouseLocationId: undefined,
      });
      const nextLabel = String(product.parts.length + 1);
      const newProductPart: ProductPart = {
        id: crypto.randomUUID(),
        partId: savedPart.id,
        positionLabel: nextLabel,
        x: 0,
        y: 0,
      };
      updateProduct(product.id, { parts: [...product.parts, newProductPart] });
      setNewPartForm({
        partNumber: '',
        name: '',
        description: '',
        category: '',
        quantityInStock: 0,
        minimumStock: 0,
        unitCost: 0,
      });
      setShowCreatePartForm(false);
      setShowPartModal(false);
    } catch (err) {
      console.error('Failed to create part:', err);
    } finally {
      setIsCreatingPart(false);
    }
  };

  const handleDeleteHotspot = (hotspotId: string) => {
    const filteredParts = product.parts.filter((pp) => pp.id !== hotspotId);
    updateProduct(product.id, { parts: filteredParts });
  };

  const handleEditHotspot = (hotspotId: string, label: string, partId: string) => {
    const updatedParts = product.parts.map((pp) =>
      pp.id === hotspotId ? { ...pp, positionLabel: label, partId } : pp
    );
    updateProduct(product.id, { parts: updatedParts });
    setShowEditHotspotModal(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate('/products')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={20} />
        Back to Products
      </button>

      {/* Product Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <button
            onClick={handleOpenEditProduct}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <Pencil size={16} />
            Edit Product
          </button>
        </div>
        {product.image && (
          <div className="mb-4">
            <img src={product.image} alt={product.name} className="max-h-48 rounded-lg object-cover" />
          </div>
        )}
        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
          <span>
            <span className="font-medium">Model:</span> {product.model}
          </span>
          <span>
            <span className="font-medium">Brand:</span> {product.manufacturer}
          </span>
          <span>
            <span className="font-medium">Category:</span> {product.category}
          </span>
          {product.asin && (
            <span>
              <span className="font-medium">ASIN:</span> {product.asin}
            </span>
          )}
          {product.upc && (
            <span>
              <span className="font-medium">UPC:</span> {product.upc}
            </span>
          )}
        </div>
        {product.description && (
          <p className="mt-3 text-gray-600">{product.description}</p>
        )}
      </div>

      {/* Exploded View Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Exploded View</h2>
          <div className="flex gap-2">
            {product.explodedViewImage && (
              <button
                onClick={() => setIsPlacingHotspot(!isPlacingHotspot)}
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                  isPlacingHotspot
                    ? 'bg-orange-100 text-orange-700 border border-orange-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <MapPin size={16} />
                {isPlacingHotspot ? 'Click image to place...' : 'Add Part Hotspot'}
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Upload size={16} />
              Upload Image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUploadExplodedView}
            />
          </div>
        </div>

        {/* Exploded View Image Area */}
        <div
          ref={explodedViewRef}
          onClick={handleExplodedViewClick}
          className={`relative w-full min-h-[400px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 overflow-hidden ${
            isPlacingHotspot ? 'cursor-crosshair' : ''
          }`}
        >
          {product.explodedViewImage ? (
            <>
              <img
                src={product.explodedViewImage}
                alt="Exploded View"
                className="w-full h-auto"
                draggable={false}
              />
              {/* Hotspot Markers */}
              {product.parts.map((pp) => {
                if (pp.x === 0 && pp.y === 0) return null;
                const part = getPartById(pp.partId);
                return (
                  <div
                    key={pp.id}
                    className="absolute group"
                    style={{ left: `${pp.x}%`, top: `${pp.y}%`, transform: 'translate(-50%, -50%)' }}
                  >
                    <button
                      onMouseEnter={() => setHoveredMarker(pp.id)}
                      onMouseLeave={() => setHoveredMarker(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isPlacingHotspot) setShowMarkerModal(pp);
                      }}
                      className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-lg border-2 border-white hover:bg-blue-700 hover:scale-110 transition-all"
                    >
                      {pp.positionLabel}
                    </button>
                    {/* Quick-delete button on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this hotspot?')) {
                          handleDeleteHotspot(pp.id);
                        }
                      }}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-20"
                    >
                      &times;
                    </button>
                    {/* Tooltip */}
                    {hoveredMarker === pp.id && part && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap shadow-lg z-10">
                        {part.name}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
              <ImagePlus size={64} className="mb-3" />
              <p className="text-lg font-medium">Upload Exploded View Image</p>
              <p className="text-sm mt-1">Click the upload button above to add an image</p>
            </div>
          )}

          {isPlacingHotspot && product.explodedViewImage && (
            <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />
          )}
        </div>
      </div>

      {/* Parts List Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Parts ({product.parts.length})
          </h2>
          <button
            onClick={() => setShowPartModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Add Part to Product
          </button>
        </div>

        {product.parts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Package size={40} className="mx-auto mb-2" />
            <p>No parts associated with this product yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">#</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Part Number</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">In Stock</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Location</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Condition</th>
                </tr>
              </thead>
              <tbody>
                {productParts.map(({ positionLabel, partId, part }) => (
                  <tr
                    key={partId + positionLabel}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/parts/${partId}`)}
                  >
                    <td className="py-3 px-4 font-medium text-blue-600">{positionLabel}</td>
                    <td className="py-3 px-4 text-gray-700">{part?.partNumber ?? '---'}</td>
                    <td className="py-3 px-4 text-gray-900 font-medium">{part?.name ?? 'Unknown'}</td>
                    <td className="py-3 px-4">
                      {part ? (
                        <span
                          className={
                            part.quantityInStock < part.minimumStock
                              ? 'text-red-600 font-medium'
                              : 'text-green-600 font-medium'
                          }
                        >
                          {part.quantityInStock}
                        </span>
                      ) : (
                        '---'
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {part?.warehouseLocationId ?? 'Unassigned'}
                    </td>
                    <td className="py-3 px-4">
                      {part && part.quantityInStock > 0 ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                          Available
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                          Out of Stock
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Part to Product Modal */}
      <Modal
        isOpen={showPartModal}
        onClose={() => {
          setShowPartModal(false);
          setShowCreatePartForm(false);
          setSelectedPartId('');
          setPartSearchQuery('');
        }}
        title="Add Part to Product"
        size="lg"
      >
        {!showCreatePartForm && parts.length > 0 ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search existing parts..."
                value={partSearchQuery}
                onChange={(e) => setPartSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              {filteredParts.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">No parts match your search</div>
              ) : (
                filteredParts.map((part) => (
                  <label
                    key={part.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-blue-50 transition-colors ${
                      selectedPartId === part.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="selectedPart"
                      value={part.id}
                      checked={selectedPartId === part.id}
                      onChange={() => setSelectedPartId(part.id)}
                      className="text-blue-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{part.name}</p>
                      <p className="text-xs text-gray-500">
                        {part.partNumber} | Stock: {part.quantityInStock}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setShowCreatePartForm(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Create New Part
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPartModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddExistingPart}
                  disabled={!selectedPartId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add Part
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateAndAddPart} className="space-y-4">
            {parts.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCreatePartForm(false)}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <ArrowLeft size={14} /> Back to search
              </button>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Part Number</label>
                <input
                  type="text"
                  required
                  value={newPartForm.partNumber}
                  onChange={(e) => setNewPartForm({ ...newPartForm, partNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={newPartForm.name}
                  onChange={(e) => setNewPartForm({ ...newPartForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                required
                value={newPartForm.category}
                onChange={(e) => setNewPartForm({ ...newPartForm, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newPartForm.description}
                onChange={(e) => setNewPartForm({ ...newPartForm, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min={0}
                  value={newPartForm.quantityInStock}
                  onChange={(e) =>
                    setNewPartForm({ ...newPartForm, quantityInStock: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock</label>
                <input
                  type="number"
                  min={0}
                  value={newPartForm.minimumStock}
                  onChange={(e) =>
                    setNewPartForm({ ...newPartForm, minimumStock: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost ($)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={newPartForm.unitCost}
                  onChange={(e) =>
                    setNewPartForm({ ...newPartForm, unitCost: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreatePartForm(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingPart}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreatingPart ? 'Creating...' : 'Create & Add Part'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Hotspot Part Selection Modal */}
      <Modal
        isOpen={showHotspotPartModal}
        onClose={() => {
          setShowHotspotPartModal(false);
          setPendingHotspot(null);
          setSelectedPartId('');
          setHotspotLabel('');
        }}
        title="Assign Part to Hotspot"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position Label</label>
            <input
              type="text"
              placeholder="e.g., 1, 2A, 3B"
              value={hotspotLabel}
              onChange={(e) => setHotspotLabel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Part</label>
            <select
              value={selectedPartId}
              onChange={(e) => setSelectedPartId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">-- Select a part --</option>
              {parts.map((part) => (
                <option key={part.id} value={part.id}>
                  {part.partNumber} - {part.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowHotspotPartModal(false);
                setPendingHotspot(null);
              }}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePlaceHotspot}
              disabled={!selectedPartId || !hotspotLabel}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Place Hotspot
            </button>
          </div>
        </div>
      </Modal>

      {/* Marker Detail Modal */}
      <Modal
        isOpen={!!showMarkerModal}
        onClose={() => setShowMarkerModal(null)}
        title="Part Details"
      >
        {showMarkerModal && (() => {
          const part = getPartById(showMarkerModal.partId);
          if (!part) return <p className="text-gray-500">Part not found.</p>;
          return (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{part.name}</h3>
                <p className="text-sm text-gray-500">
                  {part.partNumber} | Position: {showMarkerModal.positionLabel}
                </p>
                {part.description && (
                  <p className="text-sm text-gray-600 mt-2">{part.description}</p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">In Stock</p>
                  <p
                    className={`text-lg font-bold ${
                      part.quantityInStock < part.minimumStock ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {part.quantityInStock}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Min Stock</p>
                  <p className="text-lg font-bold text-gray-900">{part.minimumStock}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Unit Cost</p>
                  <p className="text-lg font-bold text-gray-900">${part.unitCost.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => {
                    adjustStock(part.id, 1);
                    setShowMarkerModal(null);
                  }}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <ShoppingCart size={16} />
                  Add to Inventory (+1)
                </button>
                <button
                  onClick={() => {
                    setShowMarkerModal(null);
                    navigate(`/parts/${part.id}`);
                  }}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Eye size={16} />
                  View Part Details
                </button>
                {part.vendors.length > 0 && (
                  <button
                    onClick={() => {
                      const vendor = getVendorById(part.vendors[0].vendorId);
                      if (part.vendors[0].url) {
                        window.open(part.vendors[0].url, '_blank');
                      } else if (vendor?.website) {
                        window.open(vendor.website, '_blank');
                      }
                      setShowMarkerModal(null);
                    }}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Search size={16} />
                    Find Vendors
                  </button>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      setEditHotspotLabel(showMarkerModal.positionLabel);
                      setEditHotspotPartId(showMarkerModal.partId);
                      setShowEditHotspotModal(showMarkerModal);
                      setShowMarkerModal(null);
                    }}
                    className="flex items-center justify-center gap-2 flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    <Pencil size={16} />
                    Edit Hotspot
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this hotspot?')) {
                        handleDeleteHotspot(showMarkerModal.id);
                        setShowMarkerModal(null);
                      }
                    }}
                    className="flex items-center justify-center gap-2 flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 size={16} />
                    Delete Hotspot
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Edit Hotspot Modal */}
      <Modal
        isOpen={!!showEditHotspotModal}
        onClose={() => setShowEditHotspotModal(null)}
        title="Edit Hotspot"
      >
        {showEditHotspotModal && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position Label</label>
              <input
                type="text"
                placeholder="e.g., 1, 2A, 3B"
                value={editHotspotLabel}
                onChange={(e) => setEditHotspotLabel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Part</label>
              <select
                value={editHotspotPartId}
                onChange={(e) => setEditHotspotPartId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">-- Select a part --</option>
                {parts.map((part) => (
                  <option key={part.id} value={part.id}>
                    {part.partNumber} - {part.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEditHotspotModal(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleEditHotspot(showEditHotspotModal.id, editHotspotLabel, editHotspotPartId)
                }
                disabled={!editHotspotLabel || !editHotspotPartId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={showEditProductModal}
        onClose={() => setShowEditProductModal(false)}
        title="Edit Product"
        size="lg"
      >
        <div className="space-y-4">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
            {editProductImage ? (
              <div className="flex flex-col items-center gap-2">
                <img src={editProductImage} alt="Preview" className="rounded max-h-40 object-cover" />
                <button
                  type="button"
                  onClick={() => editImageInputRef.current?.click()}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Upload size={14} />
                  Change Image
                </button>
              </div>
            ) : (
              <div
                onClick={() => editImageInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition-colors"
              >
                <ImagePlus size={32} className="text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Click to upload product image</p>
              </div>
            )}
            <input
              ref={editImageInputRef}
              type="file"
              accept="image/*"
              onChange={handleEditProductImageSelect}
              className="hidden"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={editProductForm.name}
              onChange={(e) => setEditProductForm({ ...editProductForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <input
              type="text"
              value={editProductForm.model}
              onChange={(e) => setEditProductForm({ ...editProductForm, model: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ASIN</label>
              <input
                type="text"
                value={editProductForm.asin}
                onChange={(e) => setEditProductForm({ ...editProductForm, asin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">UPC</label>
              <input
                type="text"
                value={editProductForm.upc}
                onChange={(e) => setEditProductForm({ ...editProductForm, upc: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand / Manufacturer</label>
            <input
              type="text"
              value={editProductForm.manufacturer}
              onChange={(e) => setEditProductForm({ ...editProductForm, manufacturer: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input
              type="text"
              value={editProductForm.category}
              onChange={(e) => setEditProductForm({ ...editProductForm, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={editProductForm.description}
              onChange={(e) => setEditProductForm({ ...editProductForm, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowEditProductModal(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveProduct}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* Success Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg animate-in slide-in-from-bottom-5">
          <CheckCircle size={20} />
          <span className="font-medium">Product saved successfully!</span>
        </div>
      )}
    </div>
  );
}
