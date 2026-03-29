import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Eye,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Package,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
} from 'lucide-react';
import { useApp } from '../data/store';
import Modal from '../components/Modal';

type SortField = 'partNumber' | 'name' | 'category' | 'quantityInStock' | 'minimumStock' | 'unitCost';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 15;

export default function PartsInventory() {
  const { parts, addPart, deletePart, canEditPartNames, searchParts, generatePrcId } = useApp();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    partNumber: '',
    name: '',
    description: '',
    category: '',
    quantityInStock: 0,
    minimumStock: 0,
    unitCost: 0,
  });

  const categories = useMemo(() => {
    const cats = new Set(parts.map((p) => p.category));
    return Array.from(cats).sort();
  }, [parts]);

  const filteredAndSorted = useMemo(() => {
    let result = searchQuery.trim() ? searchParts(searchQuery) : [...parts];

    if (categoryFilter) {
      result = result.filter((p) => p.category === categoryFilter);
    }

    result.sort((a, b) => {
      let aVal: string | number = a[sortField];
      let bVal: string | number = b[sortField];
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [parts, searchQuery, categoryFilter, sortField, sortDir, searchParts]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PAGE_SIZE));
  const paginatedParts = filteredAndSorted.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-gray-300" />;
    return sortDir === 'asc' ? (
      <ArrowUp size={14} className="text-blue-600" />
    ) : (
      <ArrowDown size={14} className="text-blue-600" />
    );
  };

  const handleAddPart = (e: React.FormEvent) => {
    e.preventDefault();
    addPart({
      ...formData,
      compatibleProducts: [],
      vendors: [],
      warehouseLocationId: undefined,
    });
    setFormData({
      partNumber: '',
      name: '',
      description: '',
      category: '',
      quantityInStock: 0,
      minimumStock: 0,
      unitCost: 0,
    });
    setShowAddModal(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Parts Inventory</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          Add Part
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search parts by name, part number, or description..."
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
        Showing {paginatedParts.length} of {filteredAndSorted.length} parts
      </p>

      {/* Table */}
      {filteredAndSorted.length === 0 ? (
        <div className="text-center py-16 text-gray-500 bg-white rounded-xl border border-gray-200">
          <Package size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No parts found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500 w-16">Image</th>
                  <th
                    className="text-left py-3 px-4 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700"
                    onClick={() => handleSort('partNumber')}
                  >
                    <span className="flex items-center gap-1">
                      Part Number <SortIcon field="partNumber" />
                    </span>
                  </th>
                  <th
                    className="text-left py-3 px-4 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700"
                    onClick={() => handleSort('name')}
                  >
                    <span className="flex items-center gap-1">
                      Name <SortIcon field="name" />
                    </span>
                  </th>
                  <th
                    className="text-left py-3 px-4 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700"
                    onClick={() => handleSort('category')}
                  >
                    <span className="flex items-center gap-1">
                      Category <SortIcon field="category" />
                    </span>
                  </th>
                  <th
                    className="text-left py-3 px-4 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700"
                    onClick={() => handleSort('quantityInStock')}
                  >
                    <span className="flex items-center gap-1">
                      In Stock <SortIcon field="quantityInStock" />
                    </span>
                  </th>
                  <th
                    className="text-left py-3 px-4 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700"
                    onClick={() => handleSort('minimumStock')}
                  >
                    <span className="flex items-center gap-1">
                      Min Stock <SortIcon field="minimumStock" />
                    </span>
                  </th>
                  <th
                    className="text-left py-3 px-4 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700"
                    onClick={() => handleSort('unitCost')}
                  >
                    <span className="flex items-center gap-1">
                      Unit Cost <SortIcon field="unitCost" />
                    </span>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Location</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedParts.map((part) => {
                  const isLowStock = part.quantityInStock < part.minimumStock;
                  return (
                    <tr
                      key={part.id}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/parts/${part.id}`)}
                    >
                      <td className="py-3 px-4">
                        {part.image ? (
                          <img
                            src={part.image}
                            alt={part.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                            <Package size={16} className="text-gray-300" />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-700 font-mono text-xs">{part.partNumber}</td>
                      <td className="py-3 px-4 text-gray-900 font-medium">{part.name}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          {part.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                          {part.quantityInStock}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500">{part.minimumStock}</td>
                      <td className="py-3 px-4 text-gray-700">${part.unitCost.toFixed(2)}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {part.warehouseLocationId ?? 'Unassigned'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => navigate(`/parts/${part.id}`)}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          {canEditPartNames() && (
                            <>
                              <button
                                onClick={() => navigate(`/parts/${part.id}`)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                                title="Edit"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Delete "${part.name}"? This cannot be undone.`)) {
                                    deletePart(part.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
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
        </div>
      )}

      {/* Add Part Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Part">
        <form onSubmit={handleAddPart} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Part Number</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={formData.partNumber}
                  onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter or generate"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const prcId = await generatePrcId();
                    setFormData({ ...formData, partNumber: prcId });
                  }}
                  className="px-3 py-2 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                  title="Generate a unique PRC Part ID"
                >
                  Generate ID
                </button>
              </div>
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
                value={formData.quantityInStock}
                onChange={(e) => setFormData({ ...formData, quantityInStock: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock</label>
              <input
                type="number"
                min={0}
                value={formData.minimumStock}
                onChange={(e) => setFormData({ ...formData, minimumStock: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost ($)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={formData.unitCost}
                onChange={(e) => setFormData({ ...formData, unitCost: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
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
              Add Part
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
