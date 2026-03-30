import { useState } from 'react';
import {
  Scissors,
  Plus,
  ChevronDown,
  ChevronUp,
  PackagePlus,
  CheckCircle2,
  Clock,
  Hash,
  Calendar,
  User,
  FileText,
  ScanBarcode,
  Search,
  Camera,
  Zap,
} from 'lucide-react';
import { useApp } from '../data/store';
import Modal from '../components/Modal';
import type { HarvestedPart } from '../types';

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'in_progress' | 'completed' }) {
  const styles =
    status === 'completed'
      ? 'bg-green-100 text-green-700'
      : 'bg-blue-100 text-blue-700';
  const label = status === 'completed' ? 'Completed' : 'In Progress';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles}`}>
      {status === 'completed' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
      {label}
    </span>
  );
}

// ── Condition badge ───────────────────────────────────────────────────────────

function ConditionBadge({ condition }: { condition: string }) {
  const map: Record<string, string> = {
    new: 'bg-emerald-100 text-emerald-700',
    like_new: 'bg-green-100 text-green-700',
    excellent: 'bg-green-100 text-green-700',
    good: 'bg-blue-100 text-blue-700',
    fair: 'bg-yellow-100 text-yellow-700',
    poor: 'bg-red-100 text-red-700',
    salvage: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[condition] ?? 'bg-gray-100 text-gray-600'}`}>
      {condition.replace('_', ' ')}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Harvesting() {
  const {
    harvestSessions,
    products,
    users,
    currentUser,
    getProductById,
    getPartById,
    addHarvestSessionAsync,
    addHarvestedPart,
    completeHarvestSession,
    adjustStock,
    addInventoryTransaction,
  } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── New session form state ────────────────────────────────────────────────

  const [formProductId, setFormProductId] = useState('');
  const [formSerial, setFormSerial] = useState('');
  const [formCondition, setFormCondition] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [formNotes, setFormNotes] = useState('');

  // ── Active harvest session (after creation) ───────────────────────────────

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [harvestRows, setHarvestRows] = useState<
    {
      partId: string;
      checked: boolean;
      quantity: number;
      condition: HarvestedPart['condition'];
      notes: string;
      added: boolean;
    }[]
  >([]);

  const [productSearch, setProductSearch] = useState('');
  const [scanInput, setScanInput] = useState('');

  // ── Helpers ───────────────────────────────────────────────────────────────

  function resetForm() {
    setFormProductId('');
    setFormSerial('');
    setFormCondition('good');
    setFormNotes('');
    setActiveSessionId(null);
    setHarvestRows([]);
  }

  function handleScan() {
    const trimmed = scanInput.trim();
    if (!trimmed) return;
    // Try matching by ASIN, UPC, model, or name
    const match = products.find(
      (p) =>
        p.asin.toLowerCase() === trimmed.toLowerCase() ||
        p.upc.toLowerCase() === trimmed.toLowerCase() ||
        p.model.toLowerCase() === trimmed.toLowerCase() ||
        p.name.toLowerCase().includes(trimmed.toLowerCase())
    );
    if (match) {
      setFormProductId(match.id);
      setScanInput('');
    }
  }

  function handleAddAllToInventory() {
    harvestRows.forEach((row, idx) => {
      if (row.checked && !row.added) {
        handleAddToInventory(idx);
      }
    });
  }

  function handleSelectAllRows() {
    setHarvestRows((prev) =>
      prev.map((r) => (r.added ? r : { ...r, checked: true }))
    );
  }

  const filteredProducts = productSearch.trim()
    ? products.filter((p) =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.model.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.asin.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.upc.toLowerCase().includes(productSearch.toLowerCase())
      )
    : products;

  async function handleCreateSession() {
    if (!formProductId || !formSerial) return;

    const session = await addHarvestSessionAsync({
      productId: formProductId,
      serialNumber: formSerial,
      condition: formCondition,
      notes: formNotes,
      harvestedParts: [],
      harvestedBy: currentUser?.id ?? '',
      date: new Date().toISOString(),
      status: 'in_progress',
    });

    // Build harvest rows from the product's parts list
    const product = getProductById(formProductId);
    if (product) {
      setHarvestRows(
        product.parts.map((pp) => ({
          partId: pp.partId,
          checked: false,
          quantity: 1,
          condition: 'good' as HarvestedPart['condition'],
          notes: '',
          added: false,
        })),
      );
    }

    setActiveSessionId(session.id);
  }

  function handleAddToInventory(index: number) {
    if (!activeSessionId) return;
    const row = harvestRows[index];
    if (!row.checked || row.added) return;

    // Adjust stock with condition tracking
    adjustStock(row.partId, row.quantity, row.condition);

    // Create inventory transaction
    addInventoryTransaction({
      partId: row.partId,
      type: 'harvest_in',
      quantity: row.quantity,
      reference: activeSessionId,
      notes: row.notes,
      performedBy: currentUser?.id ?? '',
      date: new Date().toISOString(),
    });

    // Save the harvested part to the database
    addHarvestedPart(activeSessionId, {
      partId: row.partId,
      quantity: row.quantity,
      condition: row.condition,
      notes: row.notes,
      addedToInventory: true,
    });

    // Mark row as added
    setHarvestRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, added: true } : r)),
    );
  }

  function handleCompleteSession() {
    if (!activeSessionId) return;
    completeHarvestSession(activeSessionId);
    setShowModal(false);
    resetForm();
  }

  function updateRow(index: number, field: string, value: unknown) {
    setHarvestRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
  }

  // ── Sort sessions newest first ────────────────────────────────────────────

  const sortedSessions = [...harvestSessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Scissors size={28} />
            Harvesting
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Track parts being harvested from products
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-indigo-700 transition-colors"
        >
          <Plus size={18} />
          Start New Harvest Session
        </button>
      </div>

      {/* Sessions list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto_auto_28px] items-center gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Product</span>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Serial #</span>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Date</span>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Harvested By</span>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">Status</span>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[70px]">Parts</span>
          <span />
        </div>

        {/* Rows */}
        {sortedSessions.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-400">
            No harvest sessions yet. Start one above.
          </div>
        )}
        {sortedSessions.map((session) => {
          const product = getProductById(session.productId);
          const userName = users.find((u) => u.id === session.harvestedBy)?.name ?? 'Unknown';
          const isExpanded = expandedId === session.id;

          return (
            <div key={session.id} className="border-b border-gray-200 last:border-b-0">
              {/* Main row */}
              <div
                className="grid grid-cols-[2fr_1fr_1fr_1fr_auto_auto_28px] items-center gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : session.id)}
              >
                <span className="text-sm font-medium text-gray-900">
                  {product?.name ?? 'Unknown Product'}
                </span>
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <Hash size={14} className="shrink-0" />
                  {session.serialNumber}
                </span>
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <Calendar size={14} className="shrink-0" />
                  {new Date(session.date).toLocaleDateString()}
                </span>
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <User size={14} className="shrink-0" />
                  {userName}
                </span>
                <span className="min-w-[100px]">
                  <StatusBadge status={session.status} />
                </span>
                <span className="text-sm text-gray-500 min-w-[70px]">
                  {session.harvestedParts.length} part{session.harvestedParts.length !== 1 ? 's' : ''}
                </span>
                <span className="text-gray-400">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 space-y-3">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Unit Condition:</span>{' '}
                      <ConditionBadge condition={session.condition} />
                    </div>
                    {session.notes && (
                      <div className="col-span-2 flex items-start gap-1">
                        <FileText size={14} className="text-gray-400 mt-0.5" />
                        <span className="text-gray-600">{session.notes}</span>
                      </div>
                    )}
                  </div>

                  {session.harvestedParts.length > 0 && (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 uppercase">
                          <th className="pb-2">Part</th>
                          <th className="pb-2">Qty</th>
                          <th className="pb-2">Condition</th>
                          <th className="pb-2">Notes</th>
                          <th className="pb-2">Added</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.harvestedParts.map((hp) => {
                          const part = getPartById(hp.partId);
                          return (
                            <tr key={hp.id} className="border-t border-gray-200">
                              <td className="py-1.5 font-medium text-gray-800">
                                {part?.name ?? 'Unknown Part'}
                              </td>
                              <td className="py-1.5 text-gray-600">{hp.quantity}</td>
                              <td className="py-1.5">
                                <ConditionBadge condition={hp.condition} />
                              </td>
                              <td className="py-1.5 text-gray-500">{hp.notes || '-'}</td>
                              <td className="py-1.5">
                                {hp.addedToInventory ? (
                                  <CheckCircle2 size={16} className="text-green-500" />
                                ) : (
                                  <span className="text-gray-400">No</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}

                  {session.harvestedParts.length === 0 && (
                    <p className="text-sm text-gray-400 italic">No parts harvested in this session.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── New Harvest Session Modal ──────────────────────────────────────────── */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={activeSessionId ? 'Harvest Parts' : 'Start New Harvest Session'}
        size="xl"
      >
        {!activeSessionId ? (
          /* Step 1: Create session */
          <div className="space-y-4">
            {/* Quick Scan */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <label className="block text-sm font-semibold text-indigo-800 mb-2 flex items-center gap-1.5">
                <ScanBarcode size={16} />
                Quick Scan (UPC / ASIN / Model)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleScan(); }}
                  placeholder="Scan barcode or type UPC/ASIN/model..."
                  className="flex-1 rounded-lg border border-indigo-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleScan}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium flex items-center gap-1.5"
                >
                  <Search size={16} />
                  Find
                </button>
              </div>
            </div>

            {/* Product selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Or Select Product</label>
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Filter products..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {filteredProducts.length === 0 ? (
                  <div className="p-3 text-center text-gray-400 text-sm">No products found</div>
                ) : (
                  filteredProducts.map((p) => (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-indigo-50 transition-colors ${
                        formProductId === p.id ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="harvestProduct"
                        value={p.id}
                        checked={formProductId === p.id}
                        onChange={() => setFormProductId(p.id)}
                        className="text-indigo-600"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-500">
                          {p.model} {p.asin ? `[${p.asin}]` : ''} {p.manufacturer ? `- ${p.manufacturer}` : ''}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
              {formProductId && (
                <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  Selected: {products.find(p => p.id === formProductId)?.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
              <input
                type="text"
                value={formSerial}
                onChange={(e) => setFormSerial(e.target.value)}
                placeholder="Enter serial number of the unit"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Condition</label>
              <select
                value={formCondition}
                onChange={(e) => setFormCondition(e.target.value as typeof formCondition)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={3}
                placeholder="Optional notes about this harvest session"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSession}
                disabled={!formProductId || !formSerial}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Create Session
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Harvest parts */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Check parts to harvest, then add to inventory.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllRows}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleAddAllToInventory}
                  disabled={!harvestRows.some(r => r.checked && !r.added)}
                  className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  <Zap size={12} />
                  Add All Checked
                </button>
              </div>
            </div>

            {harvestRows.length === 0 ? (
              <p className="text-sm text-gray-400 italic">This product has no parts defined.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-200">
                    <th className="pb-2 w-8" />
                    <th className="pb-2">Part</th>
                    <th className="pb-2 w-20">Qty</th>
                    <th className="pb-2 w-32">Condition</th>
                    <th className="pb-2">Notes</th>
                    <th className="pb-2 w-32" />
                  </tr>
                </thead>
                <tbody>
                  {harvestRows.map((row, idx) => {
                    const part = getPartById(row.partId);
                    return (
                      <tr key={row.partId} className="border-b border-gray-100">
                        <td className="py-2">
                          <input
                            type="checkbox"
                            checked={row.checked}
                            disabled={row.added}
                            onChange={(e) => updateRow(idx, 'checked', e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-2 font-medium text-gray-800">
                          {part?.name ?? 'Unknown'}
                          <span className="ml-2 text-gray-400 text-xs">{part?.partNumber}</span>
                        </td>
                        <td className="py-2">
                          <input
                            type="number"
                            min={1}
                            value={row.quantity}
                            disabled={row.added}
                            onChange={(e) => updateRow(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-2">
                          <select
                            value={row.condition}
                            disabled={row.added}
                            onChange={(e) => updateRow(idx, 'condition', e.target.value)}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="new">New</option>
                            <option value="like_new">Like New</option>
                            <option value="good">Good</option>
                            <option value="fair">Fair</option>
                            <option value="salvage">Salvage</option>
                          </select>
                        </td>
                        <td className="py-2">
                          <input
                            type="text"
                            value={row.notes}
                            disabled={row.added}
                            onChange={(e) => updateRow(idx, 'notes', e.target.value)}
                            placeholder="Notes..."
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-2 text-right">
                          {row.added ? (
                            <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                              <CheckCircle2 size={14} /> Added
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAddToInventory(idx)}
                              disabled={!row.checked}
                              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              <PackagePlus size={14} /> Add to Inventory
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleCompleteSession}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircle2 size={16} />
                Complete Session
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
