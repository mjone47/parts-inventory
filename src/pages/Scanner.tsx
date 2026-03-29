import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ScanLine,
  MapPin,
  Search,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Package,
  Clock,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../data/store';
import type { Part, WarehouseLocation } from '../types';

type ScanMode = 'location' | 'lookup' | 'count';

interface ScanHistoryEntry {
  id: string;
  timestamp: Date;
  barcode: string;
  result: string;
  action: string;
}

export default function Scanner() {
  const {
    parts,
    getPartById,
    warehouseLocations,
    assignPartToLocation,
    removePartFromLocation,
    adjustStock,
    currentUser,
  } = useApp();

  // ── State ──────────────────────────────────────────────────────────────────

  const [scanMode, setScanMode] = useState<ScanMode>('lookup');
  const [inputValue, setInputValue] = useState('');
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);

  // Scan to Location state
  const [scanStep, setScanStep] = useState<'part' | 'location' | 'confirm'>('part');
  const [scannedPart, setScannedPart] = useState<Part | null>(null);
  const [scannedLocation, setScannedLocation] = useState<WarehouseLocation | null>(null);
  const [assignSuccess, setAssignSuccess] = useState(false);

  // Lookup state
  const [lookupResult, setLookupResult] = useState<{
    type: 'part' | 'location';
    part?: Part;
    location?: WarehouseLocation;
  } | null>(null);

  // Inventory Count state
  const [countLocation, setCountLocation] = useState<WarehouseLocation | null>(null);
  const [scannedCounts, setScannedCounts] = useState<Map<string, number>>(new Map());
  const [countComplete, setCountComplete] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, [scanMode, scanStep, assignSuccess]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const addToHistory = useCallback(
    (barcode: string, result: string, action: string) => {
      setScanHistory((prev) => [
        {
          id: crypto.randomUUID?.() || Date.now().toString(),
          timestamp: new Date(),
          barcode,
          result,
          action,
        },
        ...prev.slice(0, 49),
      ]);
    },
    [],
  );

  const findPartByBarcode = (barcode: string): Part | undefined =>
    parts.find((p) => p.partNumber.toLowerCase() === barcode.toLowerCase());

  const findLocationByBarcode = (barcode: string): WarehouseLocation | undefined =>
    warehouseLocations.find((l) => l.barcode.toLowerCase() === barcode.toLowerCase());

  // ── Scan Handlers ──────────────────────────────────────────────────────────

  const handleScan = () => {
    const barcode = inputValue.trim();
    if (!barcode) return;

    switch (scanMode) {
      case 'location':
        handleScanToLocation(barcode);
        break;
      case 'lookup':
        handleLookup(barcode);
        break;
      case 'count':
        handleInventoryCount(barcode);
        break;
    }
    setInputValue('');
  };

  const handleScanToLocation = (barcode: string) => {
    if (scanStep === 'part') {
      const part = findPartByBarcode(barcode);
      if (part) {
        setScannedPart(part);
        setScanStep('location');
        addToHistory(barcode, `Part: ${part.name}`, 'Identified part');
      } else {
        addToHistory(barcode, 'Not found', 'Part lookup failed');
      }
    } else if (scanStep === 'location') {
      const location = findLocationByBarcode(barcode);
      if (location) {
        setScannedLocation(location);
        setScanStep('confirm');
        addToHistory(barcode, `Location: ${location.name}`, 'Identified location');
      } else {
        addToHistory(barcode, 'Not found', 'Location lookup failed');
      }
    }
  };

  const handleConfirmAssign = () => {
    if (!scannedPart || !scannedLocation) return;

    // Remove from old location if any
    const oldLoc = warehouseLocations.find((l) => l.partIds.includes(scannedPart.id));
    if (oldLoc) {
      removePartFromLocation(oldLoc.id, scannedPart.id);
    }

    assignPartToLocation(scannedLocation.id, scannedPart.id);
    addToHistory(
      scannedPart.partNumber,
      `${scannedPart.name} -> ${scannedLocation.name}`,
      'Assigned to location',
    );
    setAssignSuccess(true);
    setTimeout(() => {
      setAssignSuccess(false);
      setScannedPart(null);
      setScannedLocation(null);
      setScanStep('part');
    }, 2000);
  };

  const handleLookup = (barcode: string) => {
    const part = findPartByBarcode(barcode);
    if (part) {
      setLookupResult({ type: 'part', part });
      addToHistory(barcode, `Part: ${part.name}`, 'Lookup - Part found');
      return;
    }
    const location = findLocationByBarcode(barcode);
    if (location) {
      setLookupResult({ type: 'location', location });
      addToHistory(barcode, `Location: ${location.name}`, 'Lookup - Location found');
      return;
    }
    setLookupResult(null);
    addToHistory(barcode, 'Not found', 'Lookup failed');
  };

  const handleInventoryCount = (barcode: string) => {
    if (!countLocation) return;
    const part = findPartByBarcode(barcode);
    if (part) {
      setScannedCounts((prev) => {
        const next = new Map(prev);
        next.set(part.id, (next.get(part.id) || 0) + 1);
        return next;
      });
      addToHistory(barcode, `Part: ${part.name}`, 'Count scan');
    } else {
      addToHistory(barcode, 'Not found', 'Count scan - not found');
    }
  };

  const handleCompleteCount = () => {
    if (!countLocation || !currentUser) return;
    scannedCounts.forEach((counted, partId) => {
      const part = getPartById(partId);
      if (part) {
        const diff = counted - part.quantityInStock;
        if (diff !== 0) {
          adjustStock(partId, diff);
        }
      }
    });
    setCountComplete(true);
    addToHistory('--', `Count completed at ${countLocation.name}`, 'Inventory count submitted');
  };

  const resetMode = () => {
    setScannedPart(null);
    setScannedLocation(null);
    setScanStep('part');
    setAssignSuccess(false);
    setLookupResult(null);
    setCountLocation(null);
    setScannedCounts(new Map());
    setCountComplete(false);
    setInputValue('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleScan();
    }
  };

  // ── Mode instructions ──────────────────────────────────────────────────────

  const modeInstructions: Record<ScanMode, string> = {
    location: scanStep === 'part'
      ? 'Scan a part barcode (part number) to begin.'
      : scanStep === 'location'
      ? 'Now scan a location barcode to assign the part.'
      : 'Confirm the assignment below.',
    lookup: 'Scan any barcode to look up part or location information.',
    count: countLocation
      ? `Scanning parts at ${countLocation.name}. Scan each part to count it.`
      : 'Select a location below to begin counting.',
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
          <ScanLine className="text-indigo-600" size={32} />
          Barcode Scanner
        </h1>
        <p className="text-gray-500 mt-1 text-lg">Scan parts and locations for quick actions</p>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { mode: 'location' as ScanMode, label: 'Scan to Location', icon: MapPin },
          { mode: 'lookup' as ScanMode, label: 'Lookup', icon: Search },
          { mode: 'count' as ScanMode, label: 'Inventory Count', icon: ClipboardCheck },
        ]).map(({ mode, label, icon: Icon }) => (
          <button
            key={mode}
            onClick={() => {
              setScanMode(mode);
              resetMode();
            }}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-lg font-medium ${
              scanMode === mode
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <Icon size={28} />
            {label}
          </button>
        ))}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
        <p className="text-blue-800 text-lg">{modeInstructions[scanMode]}</p>
      </div>

      {/* Scan Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Scan or type barcode here..."
          className="scan-active w-full text-2xl text-center font-mono py-5 px-6 border-2 border-indigo-300 rounded-2xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all"
          autoFocus
        />
        <button
          onClick={handleScan}
          className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-3 bg-indigo-600 text-white text-lg font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Scan
        </button>
      </div>

      {/* Reset button */}
      <div className="text-center">
        <button
          onClick={resetMode}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <RotateCcw size={16} />
          Reset
        </button>
      </div>

      {/* ── Mode-specific Content ─────────────────────────────────────────────── */}

      {/* Scan to Location flow */}
      {scanMode === 'location' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          {/* Progress */}
          <div className="flex items-center justify-center gap-4 text-lg">
            <span
              className={`flex items-center gap-2 ${
                scanStep === 'part' ? 'text-indigo-700 font-bold' : 'text-green-600'
              }`}
            >
              {scannedPart ? <CheckCircle2 size={20} /> : <Package size={20} />}
              1. Scan Part
            </span>
            <ArrowRight size={20} className="text-gray-300" />
            <span
              className={`flex items-center gap-2 ${
                scanStep === 'location'
                  ? 'text-indigo-700 font-bold'
                  : scanStep === 'confirm'
                  ? 'text-green-600'
                  : 'text-gray-400'
              }`}
            >
              {scannedLocation ? <CheckCircle2 size={20} /> : <MapPin size={20} />}
              2. Scan Location
            </span>
            <ArrowRight size={20} className="text-gray-300" />
            <span
              className={`flex items-center gap-2 ${
                scanStep === 'confirm' ? 'text-indigo-700 font-bold' : 'text-gray-400'
              }`}
            >
              <CheckCircle2 size={20} />
              3. Confirm
            </span>
          </div>

          {scannedPart && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-lg">
                <span className="font-bold">Part:</span> {scannedPart.name} ({scannedPart.partNumber})
              </p>
            </div>
          )}

          {scannedLocation && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-lg">
                <span className="font-bold">Location:</span> {scannedLocation.name} (Zone{' '}
                {scannedLocation.zone})
              </p>
            </div>
          )}

          {scanStep === 'confirm' && scannedPart && scannedLocation && !assignSuccess && (
            <div className="text-center space-y-3">
              <p className="text-xl font-semibold text-gray-900">
                Assign <span className="text-indigo-600">{scannedPart.name}</span> to{' '}
                <span className="text-indigo-600">{scannedLocation.name}</span>?
              </p>
              <button
                onClick={handleConfirmAssign}
                className="px-8 py-4 text-xl font-bold bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
              >
                Confirm Assignment
              </button>
            </div>
          )}

          {assignSuccess && (
            <div className="text-center py-4">
              <CheckCircle2 size={48} className="text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-700">Assignment Successful!</p>
              <p className="text-gray-500">Ready for next scan...</p>
            </div>
          )}
        </div>
      )}

      {/* Lookup result */}
      {scanMode === 'lookup' && lookupResult && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {lookupResult.type === 'part' && lookupResult.part && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <Package className="text-indigo-600" size={24} />
                Part Found
              </div>
              <div className="grid grid-cols-2 gap-4 text-lg">
                <div>
                  <span className="text-gray-500">Name:</span>{' '}
                  <span className="font-semibold">{lookupResult.part.name}</span>
                </div>
                <div>
                  <span className="text-gray-500">Part #:</span>{' '}
                  <span className="font-mono">{lookupResult.part.partNumber}</span>
                </div>
                <div>
                  <span className="text-gray-500">Category:</span> {lookupResult.part.category}
                </div>
                <div>
                  <span className="text-gray-500">In Stock:</span>{' '}
                  <span className="font-bold">{lookupResult.part.quantityInStock}</span>
                </div>
                <div>
                  <span className="text-gray-500">Unit Cost:</span> $
                  {lookupResult.part.unitCost.toFixed(2)}
                </div>
                <div>
                  <span className="text-gray-500">Min Stock:</span>{' '}
                  {lookupResult.part.minimumStock}
                </div>
              </div>
              {lookupResult.part.description && (
                <p className="text-gray-600">{lookupResult.part.description}</p>
              )}
            </div>
          )}
          {lookupResult.type === 'location' && lookupResult.location && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <MapPin className="text-indigo-600" size={24} />
                Location Found
              </div>
              <div className="grid grid-cols-2 gap-4 text-lg">
                <div>
                  <span className="text-gray-500">Name:</span>{' '}
                  <span className="font-semibold">{lookupResult.location.name}</span>
                </div>
                <div>
                  <span className="text-gray-500">Zone:</span> {lookupResult.location.zone}
                </div>
                <div>
                  <span className="text-gray-500">Aisle:</span> {lookupResult.location.aisle}
                </div>
                <div>
                  <span className="text-gray-500">Shelf:</span> {lookupResult.location.shelf}
                </div>
                <div>
                  <span className="text-gray-500">Bin:</span> {lookupResult.location.bin}
                </div>
                <div>
                  <span className="text-gray-500">Parts stored:</span>{' '}
                  <span className="font-bold">{lookupResult.location.partIds.length}</span>
                </div>
              </div>
              {lookupResult.location.partIds.length > 0 && (
                <div>
                  <p className="text-gray-500 font-medium mb-1">Parts at this location:</p>
                  <ul className="space-y-1">
                    {lookupResult.location.partIds.map((pid) => {
                      const p = getPartById(pid);
                      return p ? (
                        <li key={pid} className="text-gray-700 flex items-center gap-2">
                          <Package size={14} className="text-green-500" />
                          {p.name} ({p.partNumber}) - Qty: {p.quantityInStock}
                        </li>
                      ) : null;
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Inventory Count */}
      {scanMode === 'count' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          {!countLocation && !countComplete && (
            <div>
              <label className="block text-lg font-medium text-gray-700 mb-2">
                Select a location to count
              </label>
              <select
                onChange={(e) => {
                  const loc = warehouseLocations.find((l) => l.id === e.target.value);
                  if (loc) {
                    setCountLocation(loc);
                    setScannedCounts(new Map());
                  }
                }}
                className="w-full text-lg border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Choose location...</option>
                {warehouseLocations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} (Zone {l.zone}) - {l.partIds.length} parts expected
                  </option>
                ))}
              </select>
            </div>
          )}

          {countLocation && !countComplete && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  Counting at: {countLocation.name}
                </h3>
                <span className="text-lg text-gray-500">
                  {scannedCounts.size} unique parts scanned
                </span>
              </div>

              {/* Tally table */}
              <div className="overflow-x-auto">
                <table className="w-full text-lg">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-4 py-3 font-medium text-gray-600">Part</th>
                      <th className="px-4 py-3 font-medium text-gray-600 text-center">Expected</th>
                      <th className="px-4 py-3 font-medium text-gray-600 text-center">Counted</th>
                      <th className="px-4 py-3 font-medium text-gray-600 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {countLocation.partIds.map((pid) => {
                      const part = getPartById(pid);
                      if (!part) return null;
                      const counted = scannedCounts.get(pid) || 0;
                      const expected = part.quantityInStock;
                      const match = counted === expected;
                      return (
                        <tr key={pid}>
                          <td className="px-4 py-3 font-medium">
                            {part.name}
                            <span className="text-gray-400 text-sm ml-2">({part.partNumber})</span>
                          </td>
                          <td className="px-4 py-3 text-center">{expected}</td>
                          <td className="px-4 py-3 text-center font-bold">{counted}</td>
                          <td className="px-4 py-3 text-center">
                            {counted === 0 ? (
                              <span className="text-gray-400">Not scanned</span>
                            ) : match ? (
                              <CheckCircle2 className="text-green-500 mx-auto" size={20} />
                            ) : (
                              <XCircle className="text-orange-500 mx-auto" size={20} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Show any extra parts scanned that aren't expected */}
                    {Array.from(scannedCounts.entries())
                      .filter(([pid]) => !countLocation.partIds.includes(pid))
                      .map(([pid, count]) => {
                        const part = getPartById(pid);
                        return (
                          <tr key={pid} className="bg-yellow-50">
                            <td className="px-4 py-3 font-medium">
                              {part?.name || 'Unknown'}
                              <span className="text-yellow-600 text-sm ml-2">(unexpected)</span>
                            </td>
                            <td className="px-4 py-3 text-center">0</td>
                            <td className="px-4 py-3 text-center font-bold">{count}</td>
                            <td className="px-4 py-3 text-center">
                              <XCircle className="text-yellow-500 mx-auto" size={20} />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <div className="text-center pt-2">
                <button
                  onClick={handleCompleteCount}
                  className="px-8 py-4 text-xl font-bold bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                >
                  Complete Count
                </button>
              </div>
            </>
          )}

          {countComplete && (
            <div className="text-center py-6">
              <CheckCircle2 size={48} className="text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-700">Count Submitted!</p>
              <p className="text-gray-500 mb-4">Inventory has been adjusted based on your count.</p>
              <button
                onClick={resetMode}
                className="px-6 py-3 text-lg bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Start New Count
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Scan History ──────────────────────────────────────────────────────── */}
      {scanHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock size={20} className="text-gray-500" />
              Scan History
            </h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {scanHistory.map((entry) => (
              <div key={entry.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <span className="font-mono text-sm text-indigo-600 mr-3">{entry.barcode}</span>
                  <span className="text-sm text-gray-700">{entry.result}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400 block">
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                  <span className="text-xs text-gray-500">{entry.action}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
