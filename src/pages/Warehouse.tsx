import { useState, useMemo, useCallback } from 'react';
import {
  Warehouse as WarehouseIcon,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Package,
  ChevronDown,
  ChevronRight,
  ArrowRightLeft,
  X,
  Search,
  Printer,
  FolderPlus,
  Grid3X3,
  CheckCircle,
  Layers,
} from 'lucide-react';
import { useApp } from '../data/store';
import Modal from '../components/Modal';
import type { WarehouseLocation } from '../types';

// ── Form data type ─────────────────────────────────────────────────────────────

interface LocationFormData {
  name: string;
  zone: string;
  aisle: string;
  shelf: string;
  bin: string;
  description: string;
  barcode: string;
}

const emptyForm: LocationFormData = {
  name: '',
  zone: '',
  aisle: '',
  shelf: '',
  bin: '',
  description: '',
  barcode: '',
};

// ── Zone colors ────────────────────────────────────────────────────────────────

const ZONE_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  A: { bg: 'bg-blue-50', border: 'border-blue-300', label: 'bg-blue-600' },
  B: { bg: 'bg-amber-50', border: 'border-amber-300', label: 'bg-amber-600' },
  C: { bg: 'bg-purple-50', border: 'border-purple-300', label: 'bg-purple-600' },
  D: { bg: 'bg-emerald-50', border: 'border-emerald-300', label: 'bg-emerald-600' },
  E: { bg: 'bg-rose-50', border: 'border-rose-300', label: 'bg-rose-600' },
  F: { bg: 'bg-cyan-50', border: 'border-cyan-300', label: 'bg-cyan-600' },
  G: { bg: 'bg-orange-50', border: 'border-orange-300', label: 'bg-orange-600' },
  H: { bg: 'bg-indigo-50', border: 'border-indigo-300', label: 'bg-indigo-600' },
};

function getZoneColor(zone: string) {
  return ZONE_COLORS[zone.toUpperCase()] || { bg: 'bg-gray-50', border: 'border-gray-300', label: 'bg-gray-600' };
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Warehouse() {
  const {
    warehouseLocations,
    addWarehouseLocation,
    updateWarehouseLocation,
    deleteWarehouseLocation,
    renameZone,
    assignPartToLocation,
    removePartFromLocation,
    getPartById,
  } = useApp();

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedLocation, setSelectedLocation] = useState<WarehouseLocation | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<WarehouseLocation | null>(null);
  const [formData, setFormData] = useState<LocationFormData>(emptyForm);
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Bulk add state
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkZone, setBulkZone] = useState('');
  const [bulkAisleStart, setBulkAisleStart] = useState(1);
  const [bulkAisleEnd, setBulkAisleEnd] = useState(1);
  const [bulkShelfStart, setBulkShelfStart] = useState(1);
  const [bulkShelfEnd, setBulkShelfEnd] = useState(1);
  const [bulkBinStart, setBulkBinStart] = useState(1);
  const [bulkBinEnd, setBulkBinEnd] = useState(4);
  const [bulkDescription, setBulkDescription] = useState('');
  const [bulkResult, setBulkResult] = useState<{ count: number } | null>(null);

  // Zone management
  const [addZoneModalOpen, setAddZoneModalOpen] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneDescription, setNewZoneDescription] = useState('');

  // Move part state
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [movingPartId, setMovingPartId] = useState<string | null>(null);
  const [moveTargetLocationId, setMoveTargetLocationId] = useState('');

  // Zone rename state
  const [renameZoneModalOpen, setRenameZoneModalOpen] = useState(false);
  const [renameZoneOld, setRenameZoneOld] = useState('');
  const [renameZoneNew, setRenameZoneNew] = useState('');

  // Print state
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printZoneFilter, setPrintZoneFilter] = useState('all');
  const [showToast, setShowToast] = useState('');

  // ── Derived data ───────────────────────────────────────────────────────────
  const zones = useMemo(() => {
    const zoneMap = new Map<string, WarehouseLocation[]>();
    warehouseLocations.forEach((loc) => {
      const list = zoneMap.get(loc.zone) || [];
      list.push(loc);
      zoneMap.set(loc.zone, list);
    });
    // Sort zones alphabetically
    return new Map([...zoneMap.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }, [warehouseLocations]);

  const zoneNames = useMemo(() => Array.from(zones.keys()), [zones]);

  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return warehouseLocations;
    const q = searchQuery.toLowerCase();
    return warehouseLocations.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q) ||
        loc.zone.toLowerCase().includes(q) ||
        loc.barcode.toLowerCase().includes(q) ||
        loc.description.toLowerCase().includes(q) ||
        loc.aisle.toLowerCase().includes(q)
    );
  }, [warehouseLocations, searchQuery]);

  const getPartsForLocation = useCallback(
    (loc: WarehouseLocation) => loc.partIds.map((pid) => getPartById(pid)).filter(Boolean),
    [getPartById]
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const openAddForm = (zone?: string) => {
    setEditingLocation(null);
    const z = zone || zoneNames[0] || 'A';
    setFormData({ ...emptyForm, zone: z });
    setFormModalOpen(true);
  };

  const openEditForm = (loc: WarehouseLocation) => {
    setEditingLocation(loc);
    setFormData({
      name: loc.name,
      zone: loc.zone,
      aisle: loc.aisle,
      shelf: loc.shelf,
      bin: loc.bin,
      description: loc.description,
      barcode: loc.barcode,
    });
    setFormModalOpen(true);
  };

  const autoGenerateName = (zone: string, aisle: string, shelf: string, bin: string) => {
    return `${zone}-${aisle}-${shelf}-${bin.padStart(2, '0')}`;
  };

  const autoGenerateBarcode = (zone: string, aisle: string, shelf: string, bin: string) => {
    return `WL-${zone}${aisle.padStart(2, '0')}-${shelf.padStart(2, '0')}-${bin.padStart(2, '0')}`;
  };

  const handleFormFieldChange = (field: string, value: string) => {
    setFormData((f) => {
      const updated = { ...f, [field]: value };
      // Auto-generate name and barcode when zone/aisle/shelf/bin change
      if (['zone', 'aisle', 'shelf', 'bin'].includes(field)) {
        updated.name = autoGenerateName(updated.zone, updated.aisle, updated.shelf, updated.bin);
        updated.barcode = autoGenerateBarcode(updated.zone, updated.aisle, updated.shelf, updated.bin);
      }
      return updated;
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLocation) {
      updateWarehouseLocation(editingLocation.id, { ...formData });
    } else {
      addWarehouseLocation({ ...formData, partIds: [] });
    }
    setFormModalOpen(false);
    setShowToast(editingLocation ? 'Location updated' : 'Location created');
    setTimeout(() => setShowToast(''), 3000);
  };

  const handleDelete = (id: string) => {
    deleteWarehouseLocation(id);
    setDeleteConfirmId(null);
    if (selectedLocation?.id === id) {
      setDetailModalOpen(false);
      setSelectedLocation(null);
    }
  };

  const openDetail = (loc: WarehouseLocation) => {
    setSelectedLocation(loc);
    setDetailModalOpen(true);
  };

  const toggleZone = (zone: string) => {
    setExpandedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zone)) next.delete(zone);
      else next.add(zone);
      return next;
    });
  };

  const openMoveModal = (partId: string) => {
    setMovingPartId(partId);
    setMoveTargetLocationId('');
    setMoveModalOpen(true);
  };

  const handleMovePart = () => {
    if (!movingPartId || !moveTargetLocationId || !selectedLocation) return;
    removePartFromLocation(selectedLocation.id, movingPartId);
    assignPartToLocation(moveTargetLocationId, movingPartId);
    setMoveModalOpen(false);
    const updated = warehouseLocations.find((l) => l.id === selectedLocation.id);
    if (updated) setSelectedLocation({ ...updated, partIds: updated.partIds.filter((p) => p !== movingPartId) });
  };

  const handleRemovePart = (partId: string) => {
    if (!selectedLocation) return;
    removePartFromLocation(selectedLocation.id, partId);
    setSelectedLocation({
      ...selectedLocation,
      partIds: selectedLocation.partIds.filter((p) => p !== partId),
    });
  };

  // ── Bulk Add ───────────────────────────────────────────────────────────────

  const bulkPreviewCount = useMemo(() => {
    if (!bulkZone) return 0;
    const aisles = Math.max(0, bulkAisleEnd - bulkAisleStart + 1);
    const shelves = Math.max(0, bulkShelfEnd - bulkShelfStart + 1);
    const bins = Math.max(0, bulkBinEnd - bulkBinStart + 1);
    return aisles * shelves * bins;
  }, [bulkZone, bulkAisleStart, bulkAisleEnd, bulkShelfStart, bulkShelfEnd, bulkBinStart, bulkBinEnd]);

  const handleBulkAdd = () => {
    if (!bulkZone || bulkPreviewCount === 0) return;
    let created = 0;
    for (let a = bulkAisleStart; a <= bulkAisleEnd; a++) {
      for (let s = bulkShelfStart; s <= bulkShelfEnd; s++) {
        for (let b = bulkBinStart; b <= bulkBinEnd; b++) {
          const aStr = String(a);
          const sStr = String(s);
          const bStr = String(b).padStart(2, '0');
          const name = autoGenerateName(bulkZone, aStr, sStr, bStr);
          const barcode = autoGenerateBarcode(bulkZone, aStr, sStr, bStr);
          // Skip if location with same name already exists
          if (!warehouseLocations.some((l) => l.name === name)) {
            addWarehouseLocation({
              name,
              zone: bulkZone,
              aisle: aStr,
              shelf: sStr,
              bin: bStr,
              description: bulkDescription,
              barcode,
              partIds: [],
            });
            created++;
          }
        }
      }
    }
    setBulkResult({ count: created });
  };

  const resetBulkForm = () => {
    setBulkZone('');
    setBulkAisleStart(1);
    setBulkAisleEnd(1);
    setBulkShelfStart(1);
    setBulkShelfEnd(1);
    setBulkBinStart(1);
    setBulkBinEnd(4);
    setBulkDescription('');
    setBulkResult(null);
  };

  // ── Add Zone ───────────────────────────────────────────────────────────────

  const handleAddZone = () => {
    const zoneLetter = newZoneName.trim().toUpperCase();
    if (!zoneLetter || zoneNames.includes(zoneLetter)) return;
    // Create one initial location in the zone
    addWarehouseLocation({
      name: autoGenerateName(zoneLetter, '1', '1', '01'),
      zone: zoneLetter,
      aisle: '1',
      shelf: '1',
      bin: '01',
      description: newZoneDescription || `Zone ${zoneLetter}`,
      barcode: autoGenerateBarcode(zoneLetter, '1', '1', '01'),
      partIds: [],
    });
    setAddZoneModalOpen(false);
    setNewZoneName('');
    setNewZoneDescription('');
    setShowToast(`Zone ${zoneLetter} created with initial location`);
    setTimeout(() => setShowToast(''), 3000);
  };

  // ── Rename Zone ────────────────────────────────────────────────────────────

  const openRenameZone = (zoneName: string) => {
    setRenameZoneOld(zoneName);
    setRenameZoneNew(zoneName);
    setRenameZoneModalOpen(true);
  };

  const handleRenameZone = () => {
    const newName = renameZoneNew.trim().toUpperCase();
    if (!newName || newName === renameZoneOld) {
      setRenameZoneModalOpen(false);
      return;
    }
    if (zoneNames.includes(newName)) return; // Already exists
    renameZone(renameZoneOld, newName);
    setRenameZoneModalOpen(false);
    setShowToast(`Zone ${renameZoneOld} renamed to ${newName}`);
    setTimeout(() => setShowToast(''), 3000);
  };

  // ── Print Labels ───────────────────────────────────────────────────────────

  // ── Code 128 Barcode Generator ────────────────────────────────────────────
  const generateCode128SVG = (text: string, width = 280, height = 50): string => {
    // Code 128B encoding table (characters 0-94 map to ASCII 32-126)
    const CODE128B: Record<number, string> = {
      0:'11011001100',1:'11001101100',2:'11001100110',3:'10010011000',4:'10010001100',
      5:'10001001100',6:'10011001000',7:'10011000100',8:'10001100100',9:'11001001000',
      10:'11001000100',11:'11000100100',12:'10110011100',13:'10011011100',14:'10011001110',
      15:'10111001100',16:'10011101100',17:'10011100110',18:'11001110010',19:'11001011100',
      20:'11001001110',21:'11011100100',22:'11001110100',23:'11101101110',24:'11101001100',
      25:'11100101100',26:'11100100110',27:'11101100100',28:'11100110100',29:'11100110010',
      30:'11011011000',31:'11011000110',32:'11000110110',33:'10100011000',34:'10001011000',
      35:'10001000110',36:'10110001000',37:'10001101000',38:'10001100010',39:'11010001000',
      40:'11000101000',41:'11000100010',42:'10110111000',43:'10110001110',44:'10001101110',
      45:'10111011000',46:'10111000110',47:'10001110110',48:'11101110110',49:'11010001110',
      50:'11000101110',51:'11011101000',52:'11011100010',53:'11011101110',54:'11101011000',
      55:'11101000110',56:'11100010110',57:'11101101000',58:'11101100010',59:'11100011010',
      60:'11101111010',61:'11001000010',62:'11110001010',63:'10100110000',64:'10100001100',
      65:'10010110000',66:'10010000110',67:'10000101100',68:'10000100110',69:'10110010000',
      70:'10110000100',71:'10011010000',72:'10011000010',73:'10000110100',74:'10000110010',
      75:'11000010010',76:'11001010000',77:'11110111010',78:'11000010100',79:'10001111010',
      80:'10100111100',81:'10010111100',82:'10010011110',83:'10111100100',84:'10011110100',
      85:'10011110010',86:'11110100100',87:'11110010100',88:'11110010010',89:'11011011110',
      90:'11011110110',91:'11110110110',92:'10101111000',93:'10100011110',94:'10001011110',
      95:'10111101000',96:'10111100010',97:'11110101000',98:'11110100010',99:'10111011110',
      100:'10111101110',101:'11101011110',102:'11110101110',103:'11010000100',104:'11010010000',
      105:'11010011100',106:'1100011101011',
    };

    // Start with Code B start character
    let encoded = CODE128B[104]; // Start Code B
    let checksum = 104;

    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) - 32;
      if (charCode >= 0 && charCode < 95) {
        encoded += CODE128B[charCode];
        checksum += charCode * (i + 1);
      }
    }

    // Append checksum and stop character
    encoded += CODE128B[checksum % 103];
    encoded += CODE128B[106]; // Stop

    // Convert to SVG bars
    const barWidth = width / encoded.length;
    let bars = '';
    for (let i = 0; i < encoded.length; i++) {
      if (encoded[i] === '1') {
        bars += `<rect x="${(i * barWidth).toFixed(2)}" y="0" width="${Math.max(barWidth, 0.8).toFixed(2)}" height="${height}" fill="#000"/>`;
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${bars}</svg>`;
  };

  const generatePrintableLabels = () => {
    const locs = printZoneFilter === 'all'
      ? warehouseLocations
      : warehouseLocations.filter((l) => l.zone === printZoneFilter);

    // Sort by zone, aisle, shelf, bin
    const sorted = [...locs].sort((a, b) => {
      if (a.zone !== b.zone) return a.zone.localeCompare(b.zone);
      if (a.aisle !== b.aisle) return a.aisle.localeCompare(b.aisle);
      if (a.shelf !== b.shelf) return a.shelf.localeCompare(b.shelf);
      return a.bin.localeCompare(b.bin);
    });

    // Generate HTML for print with real Code 128 barcodes
    const labelsHtml = sorted.map((loc) => {
      const barcodeSvg = generateCode128SVG(loc.barcode, 260, 45);
      return `
      <div style="
        display: inline-block;
        width: 3.5in;
        height: 1.8in;
        border: 2px solid #333;
        border-radius: 8px;
        padding: 10px 14px;
        margin: 4px;
        page-break-inside: avoid;
        font-family: system-ui, -apple-system, sans-serif;
        box-sizing: border-box;
        position: relative;
      ">
        <div style="font-size: 10px; color: #666; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 1px;">Warehouse Location</div>
        <div style="font-size: 26px; font-weight: 800; letter-spacing: 2px; color: #111; margin-bottom: 2px;">
          ${loc.name}
        </div>
        <div style="font-size: 11px; color: #444; margin-bottom: 8px;">
          Zone ${loc.zone} &bull; Aisle ${loc.aisle} &bull; Shelf ${loc.shelf} &bull; Bin ${loc.bin}
        </div>
        <div style="text-align: center;">
          ${barcodeSvg}
          <div style="font-family: 'Courier New', monospace; font-size: 11px; font-weight: 600; letter-spacing: 2px; color: #333; margin-top: 2px;">
            ${loc.barcode}
          </div>
        </div>
      </div>
    `;
    }).join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Location Labels - ${printZoneFilter === 'all' ? 'All Zones' : 'Zone ' + printZoneFilter}</title>
        <style>
          @page { margin: 0.5in; }
          body { margin: 0; padding: 0; }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div style="display: flex; flex-wrap: wrap; justify-content: flex-start; align-items: flex-start;">
          ${labelsHtml}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
    setPrintModalOpen(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <WarehouseIcon className="text-indigo-600" size={28} />
            Warehouse Management
          </h1>
          <p className="text-gray-500 mt-1">
            {warehouseLocations.length} locations across {zones.size} zones
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPrintModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Printer size={16} />
            Print Labels
          </button>
          <button
            onClick={() => { resetBulkForm(); setBulkModalOpen(true); }}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Grid3X3 size={16} />
            Bulk Add
          </button>
          <button
            onClick={() => setAddZoneModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <FolderPlus size={16} />
            New Zone
          </button>
          <button
            onClick={() => openAddForm()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={18} />
            Add Location
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search locations by name, zone, barcode, or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
      </div>

      {/* Zone Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from(zones.entries()).map(([zoneName, locs]) => {
          const colors = getZoneColor(zoneName);
          const isExpanded = expandedZones.has(zoneName);
          const totalParts = locs.reduce((sum, l) => sum + l.partIds.length, 0);
          const filteredLocs = searchQuery.trim()
            ? locs.filter((l) => filteredLocations.some((fl) => fl.id === l.id))
            : locs;

          if (searchQuery.trim() && filteredLocs.length === 0) return null;

          return (
            <div
              key={zoneName}
              className={`${colors.bg} ${colors.border} border-2 rounded-xl overflow-hidden`}
            >
              {/* Zone Header */}
              <button
                onClick={() => toggleZone(zoneName)}
                className="w-full flex items-center justify-between p-4 hover:bg-black/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`${colors.label} text-white text-sm font-bold px-3 py-1 rounded-full`}
                  >
                    Zone {zoneName}
                  </span>
                  <span className="text-sm text-gray-600">
                    {locs.length} location{locs.length !== 1 ? 's' : ''} &middot; {totalParts} part{totalParts !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); openRenameZone(zoneName); }}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-white/60 hover:text-blue-600 transition-colors"
                    title={`Rename Zone ${zoneName}`}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openAddForm(zoneName); }}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-white/60 hover:text-indigo-600 transition-colors"
                    title={`Add location to Zone ${zoneName}`}
                  >
                    <Plus size={16} />
                  </button>
                  {isExpanded ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                </div>
              </button>

              {/* Expanded Location Grid */}
              {isExpanded && (
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(searchQuery.trim() ? filteredLocs : locs).map((loc) => {
                      const partsCount = loc.partIds.length;
                      return (
                        <button
                          key={loc.id}
                          onClick={() => openDetail(loc)}
                          className={`rounded-lg p-2.5 text-left text-xs transition-all hover:scale-[1.03] hover:shadow-md ${
                            partsCount > 0
                              ? 'bg-green-100 border border-green-300 text-green-800'
                              : 'bg-white border border-gray-200 text-gray-500'
                          }`}
                        >
                          <div className="font-bold text-sm truncate">{loc.name}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <Package size={10} />
                            {partsCount} part{partsCount !== 1 ? 's' : ''}
                          </div>
                          <div className="font-mono text-[10px] text-gray-400 mt-0.5 truncate">{loc.barcode}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {zones.size === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Layers size={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No warehouse zones configured</p>
          <p className="text-sm mt-1">Click "New Zone" to create your first warehouse zone</p>
        </div>
      )}

      {/* All Locations Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            All Locations ({filteredLocations.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-600">
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Zone</th>
                <th className="px-4 py-3 font-medium">Aisle</th>
                <th className="px-4 py-3 font-medium">Shelf</th>
                <th className="px-4 py-3 font-medium">Bin</th>
                <th className="px-4 py-3 font-medium">Barcode</th>
                <th className="px-4 py-3 font-medium text-center">Parts</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLocations.map((loc) => {
                const colors = getZoneColor(loc.zone);
                return (
                  <tr key={loc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <button
                        onClick={() => openDetail(loc)}
                        className="hover:text-indigo-600 transition-colors flex items-center gap-1.5"
                      >
                        <MapPin size={14} className="text-indigo-500" />
                        {loc.name}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full text-white ${colors.label}`}>
                        {loc.zone}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{loc.aisle}</td>
                    <td className="px-4 py-3 text-gray-600">{loc.shelf}</td>
                    <td className="px-4 py-3 text-gray-600">{loc.bin}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{loc.barcode}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        loc.partIds.length > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {loc.partIds.length}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEditForm(loc)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors" title="Edit">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => setDeleteConfirmId(loc.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-red-600 transition-colors" title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredLocations.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    {searchQuery.trim() ? 'No locations match your search.' : 'No warehouse locations yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Location Detail Modal ─────────────────────────────────────────────── */}
      <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title="Location Details" size="lg">
        {selectedLocation && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Name</label>
                <p className="text-sm font-semibold text-gray-900">{selectedLocation.name}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Zone</label>
                <p className="text-sm text-gray-900">{selectedLocation.zone}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Aisle</label>
                <p className="text-sm text-gray-900">{selectedLocation.aisle}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Shelf</label>
                <p className="text-sm text-gray-900">{selectedLocation.shelf}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Bin</label>
                <p className="text-sm text-gray-900">{selectedLocation.bin}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Barcode</label>
                <p className="text-sm text-gray-900 font-mono">{selectedLocation.barcode}</p>
              </div>
            </div>
            {selectedLocation.description && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Description</label>
                <p className="text-sm text-gray-700">{selectedLocation.description}</p>
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Stored Parts ({selectedLocation.partIds.length})</h3>
              {selectedLocation.partIds.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No parts at this location.</p>
              ) : (
                <div className="space-y-2">
                  {selectedLocation.partIds.map((pid) => {
                    const part = getPartById(pid);
                    if (!part) return null;
                    return (
                      <div key={pid} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{part.name}</p>
                          <p className="text-xs text-gray-500">{part.partNumber} &middot; Qty: {part.quantityInStock}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openMoveModal(pid)} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                            <ArrowRightLeft size={12} /> Move
                          </button>
                          <button onClick={() => handleRemovePart(pid)} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                            <X size={12} /> Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => openEditForm(selectedLocation)} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                <Edit2 size={14} /> Edit Location
              </button>
              <button onClick={() => { setDeleteConfirmId(selectedLocation.id); setDetailModalOpen(false); }} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Move Part Modal ───────────────────────────────────────────────────── */}
      <Modal isOpen={moveModalOpen} onClose={() => setMoveModalOpen(false)} title="Move Part" size="sm">
        {movingPartId && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Moving <span className="font-semibold">{getPartById(movingPartId)?.name}</span> from{' '}
              <span className="font-semibold">{selectedLocation?.name}</span>.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Location</label>
              <select
                value={moveTargetLocationId}
                onChange={(e) => setMoveTargetLocationId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a location...</option>
                {warehouseLocations.filter((l) => l.id !== selectedLocation?.id).map((l) => (
                  <option key={l.id} value={l.id}>{l.name} (Zone {l.zone})</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setMoveModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={handleMovePart} disabled={!moveTargetLocationId} className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">Move Part</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Add/Edit Location Modal ───────────────────────────────────────────── */}
      <Modal isOpen={formModalOpen} onClose={() => setFormModalOpen(false)} title={editingLocation ? 'Edit Location' : 'Add Location'}>
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
              <select
                value={formData.zone}
                onChange={(e) => handleFormFieldChange('zone', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                {zoneNames.map((z) => (
                  <option key={z} value={z}>Zone {z}</option>
                ))}
                <option value="__new__">+ New Zone...</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aisle</label>
              <input
                type="text"
                required
                value={formData.aisle}
                onChange={(e) => handleFormFieldChange('aisle', e.target.value)}
                placeholder="e.g. 1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shelf</label>
              <input
                type="text"
                required
                value={formData.shelf}
                onChange={(e) => handleFormFieldChange('shelf', e.target.value)}
                placeholder="e.g. 1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bin</label>
              <input
                type="text"
                required
                value={formData.bin}
                onChange={(e) => handleFormFieldChange('bin', e.target.value)}
                placeholder="e.g. 01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Auto-generated fields */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Auto-generated Name:</span>
              <span className="text-sm font-bold text-gray-900">{formData.name || '---'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Auto-generated Barcode:</span>
              <span className="text-sm font-mono text-gray-700">{formData.barcode || '---'}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="e.g. Fusers and high-value assemblies"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setFormModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">{editingLocation ? 'Save Changes' : 'Add Location'}</button>
          </div>
        </form>
      </Modal>

      {/* ── Bulk Add Modal ────────────────────────────────────────────────────── */}
      <Modal isOpen={bulkModalOpen} onClose={() => { setBulkModalOpen(false); resetBulkForm(); }} title="Bulk Add Locations" size="lg">
        {!bulkResult ? (
          <div className="space-y-5">
            <p className="text-sm text-gray-600">
              Quickly create multiple locations by specifying ranges for aisle, shelf, and bin numbers.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
              <select
                value={bulkZone}
                onChange={(e) => setBulkZone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select zone...</option>
                {zoneNames.map((z) => (
                  <option key={z} value={z}>Zone {z}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aisle Range</label>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} max={99} value={bulkAisleStart} onChange={(e) => setBulkAisleStart(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                  <span className="text-gray-400">to</span>
                  <input type="number" min={1} max={99} value={bulkAisleEnd} onChange={(e) => setBulkAisleEnd(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shelf Range</label>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} max={99} value={bulkShelfStart} onChange={(e) => setBulkShelfStart(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                  <span className="text-gray-400">to</span>
                  <input type="number" min={1} max={99} value={bulkShelfEnd} onChange={(e) => setBulkShelfEnd(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bin Range</label>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} max={99} value={bulkBinStart} onChange={(e) => setBulkBinStart(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                  <span className="text-gray-400">to</span>
                  <input type="number" min={1} max={99} value={bulkBinEnd} onChange={(e) => setBulkBinEnd(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (applied to all)</label>
              <input type="text" value={bulkDescription} onChange={(e) => setBulkDescription(e.target.value)} placeholder="e.g. Standard shelving unit" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
            </div>

            {/* Preview */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-indigo-800">Preview:</span>
                <span className="text-lg font-bold text-indigo-900">{bulkPreviewCount} locations will be created</span>
              </div>
              {bulkZone && bulkPreviewCount > 0 && bulkPreviewCount <= 20 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {Array.from({ length: Math.min(20, bulkPreviewCount) }).map((_, i) => {
                    const aisleRange = bulkAisleEnd - bulkAisleStart + 1;
                    const shelfRange = bulkShelfEnd - bulkShelfStart + 1;
                    const binRange = bulkBinEnd - bulkBinStart + 1;
                    const a = bulkAisleStart + Math.floor(i / (shelfRange * binRange));
                    const s = bulkShelfStart + Math.floor((i % (shelfRange * binRange)) / binRange);
                    const b = bulkBinStart + (i % binRange);
                    if (a > bulkAisleEnd) return null;
                    return (
                      <span key={i} className="text-xs bg-white border border-indigo-200 rounded px-2 py-0.5 font-mono">
                        {bulkZone}-{a}-{s}-{String(b).padStart(2, '0')}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setBulkModalOpen(false); resetBulkForm(); }} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button
                type="button"
                onClick={handleBulkAdd}
                disabled={!bulkZone || bulkPreviewCount === 0}
                className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Create {bulkPreviewCount} Locations
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-3" />
            <p className="text-xl font-bold text-green-700">{bulkResult.count} locations created!</p>
            <p className="text-sm text-gray-500 mt-1">They are now available in the warehouse map.</p>
            <button
              onClick={() => { setBulkModalOpen(false); resetBulkForm(); }}
              className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Done
            </button>
          </div>
        )}
      </Modal>

      {/* ── New Zone Modal ─────────────────────────────────────────────────────── */}
      <Modal isOpen={addZoneModalOpen} onClose={() => setAddZoneModalOpen(false)} title="Create New Zone" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zone Letter</label>
            <input
              type="text"
              maxLength={2}
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value.toUpperCase())}
              placeholder="e.g. D, E, F"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 font-bold text-lg text-center uppercase"
            />
            {newZoneName && zoneNames.includes(newZoneName.toUpperCase()) && (
              <p className="text-xs text-red-600 mt-1">Zone {newZoneName.toUpperCase()} already exists</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <input
              type="text"
              value={newZoneDescription}
              onChange={(e) => setNewZoneDescription(e.target.value)}
              placeholder="e.g. Overflow storage"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAddZoneModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button
              type="button"
              onClick={handleAddZone}
              disabled={!newZoneName.trim() || zoneNames.includes(newZoneName.trim().toUpperCase())}
              className="px-4 py-2 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              Create Zone
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Rename Zone Modal ──────────────────────────────────────────────────── */}
      <Modal isOpen={renameZoneModalOpen} onClose={() => setRenameZoneModalOpen(false)} title="Rename Zone" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Renaming will update all locations in this zone with the new zone letter.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Zone</label>
            <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-bold text-gray-900">Zone {renameZoneOld}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Zone Letter</label>
            <input
              type="text"
              maxLength={2}
              value={renameZoneNew}
              onChange={(e) => setRenameZoneNew(e.target.value.toUpperCase())}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 font-bold text-lg text-center uppercase"
            />
            {renameZoneNew.trim().toUpperCase() !== renameZoneOld && zoneNames.includes(renameZoneNew.trim().toUpperCase()) && (
              <p className="text-xs text-red-600 mt-1">Zone {renameZoneNew.trim().toUpperCase()} already exists</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setRenameZoneModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button
              type="button"
              onClick={handleRenameZone}
              disabled={!renameZoneNew.trim() || (renameZoneNew.trim().toUpperCase() !== renameZoneOld && zoneNames.includes(renameZoneNew.trim().toUpperCase()))}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Rename Zone
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Print Labels Modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={printModalOpen} onClose={() => setPrintModalOpen(false)} title="Print Location Labels" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Generate printable barcode labels for your warehouse locations. Labels are formatted for standard label sheets.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Zone</label>
            <select
              value={printZoneFilter}
              onChange={(e) => setPrintZoneFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Zones ({warehouseLocations.length} labels)</option>
              {zoneNames.map((z) => (
                <option key={z} value={z}>
                  Zone {z} ({zones.get(z)?.length || 0} labels)
                </option>
              ))}
            </select>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {printZoneFilter === 'all' ? warehouseLocations.length : (zones.get(printZoneFilter)?.length || 0)}
            </p>
            <p className="text-xs text-gray-500">labels to print</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setPrintModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button
              onClick={generatePrintableLabels}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              <Printer size={16} />
              Print Labels
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirmation Modal ─────────────────────────────────────────── */}
      <Modal isOpen={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} title="Delete Location" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">Are you sure? Any parts assigned to this location will become unassigned.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">Delete</button>
          </div>
        </div>
      </Modal>

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg">
          <CheckCircle size={20} />
          <span className="font-medium">{showToast}</span>
        </div>
      )}
    </div>
  );
}
