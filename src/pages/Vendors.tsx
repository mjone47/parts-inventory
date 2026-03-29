import { useState } from 'react';
import {
  Store,
  Plus,
  Pencil,
  Mail,
  Phone,
  Globe,
  MapPin,
  User,
  FileText,
  Package,
  ShoppingCart,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../data/store';
import Modal from '../components/Modal';
import type { Vendor } from '../types';

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Vendors() {
  const {
    vendors,
    parts,
    orders,
    addVendor,
    updateVendor,
  } = useApp();

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  // ── Form state ────────────────────────────────────────────────────────────

  const [formName, setFormName] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // ── Helpers ───────────────────────────────────────────────────────────────

  function resetForm() {
    setFormName('');
    setFormContact('');
    setFormEmail('');
    setFormPhone('');
    setFormWebsite('');
    setFormAddress('');
    setFormNotes('');
    setEditingVendor(null);
  }

  function openAdd() {
    resetForm();
    setShowFormModal(true);
  }

  function openEdit(vendor: Vendor) {
    setEditingVendor(vendor);
    setFormName(vendor.name);
    setFormContact(vendor.contactName);
    setFormEmail(vendor.email);
    setFormPhone(vendor.phone);
    setFormWebsite(vendor.website);
    setFormAddress(vendor.address);
    setFormNotes(vendor.notes);
    setShowFormModal(true);
  }

  function handleSave() {
    if (!formName.trim()) return;

    const data = {
      name: formName.trim(),
      contactName: formContact.trim(),
      email: formEmail.trim(),
      phone: formPhone.trim(),
      website: formWebsite.trim(),
      address: formAddress.trim(),
      notes: formNotes.trim(),
    };

    if (editingVendor) {
      updateVendor(editingVendor.id, data);
    } else {
      addVendor(data);
    }

    setShowFormModal(false);
    resetForm();
  }

  // ── Parts supplied by a vendor ────────────────────────────────────────────

  function getVendorParts(vendorId: string) {
    return parts.filter((p) => p.vendors.some((pv) => pv.vendorId === vendorId));
  }

  function getVendorOrders(vendorId: string) {
    return orders
      .filter((o) => o.vendorId === vendorId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Store size={28} />
            Vendors
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your parts suppliers
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-indigo-700 transition-colors"
        >
          <Plus size={18} />
          Add Vendor
        </button>
      </div>

      {/* Vendor cards grid */}
      {vendors.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center text-gray-400">
          No vendors yet. Add one above.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedVendorId(vendor.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">{vendor.name}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(vendor);
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  title="Edit vendor"
                >
                  <Pencil size={16} />
                </button>
              </div>

              <div className="space-y-1.5 text-sm">
                {vendor.contactName && (
                  <p className="flex items-center gap-2 text-gray-600">
                    <User size={14} className="text-gray-400 shrink-0" />
                    {vendor.contactName}
                  </p>
                )}
                {vendor.email && (
                  <p className="flex items-center gap-2 text-gray-600">
                    <Mail size={14} className="text-gray-400 shrink-0" />
                    <a
                      href={`mailto:${vendor.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-indigo-600 hover:underline"
                    >
                      {vendor.email}
                    </a>
                  </p>
                )}
                {vendor.phone && (
                  <p className="flex items-center gap-2 text-gray-600">
                    <Phone size={14} className="text-gray-400 shrink-0" />
                    {vendor.phone}
                  </p>
                )}
                {vendor.website && (
                  <p className="flex items-center gap-2 text-gray-600">
                    <Globe size={14} className="text-gray-400 shrink-0" />
                    <a
                      href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      {vendor.website.replace(/^https?:\/\//, '')}
                      <ExternalLink size={12} />
                    </a>
                  </p>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Package size={12} />
                  {getVendorParts(vendor.id).length} part{getVendorParts(vendor.id).length !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1">
                  <ShoppingCart size={12} />
                  {getVendorOrders(vendor.id).length} order{getVendorOrders(vendor.id).length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add/Edit Vendor Modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          resetForm();
        }}
        title={editingVendor ? 'Edit Vendor' : 'Add Vendor'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Vendor name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
            <input
              type="text"
              value={formContact}
              onChange={(e) => setFormContact(e.target.value)}
              placeholder="Primary contact person"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@vendor.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input
              type="text"
              value={formWebsite}
              onChange={(e) => setFormWebsite(e.target.value)}
              placeholder="https://vendor.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              placeholder="Street, City, State, Zip"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              rows={3}
              placeholder="Additional notes"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setShowFormModal(false);
                resetForm();
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!formName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {editingVendor ? 'Save Changes' : 'Add Vendor'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Vendor Detail Modal ────────────────────────────────────────────────── */}
      <Modal
        isOpen={selectedVendor !== undefined}
        onClose={() => setSelectedVendorId(null)}
        title={selectedVendor?.name ?? 'Vendor Detail'}
        size="xl"
      >
        {selectedVendor && (() => {
          const vendorParts = getVendorParts(selectedVendor.id);
          const vendorOrders = getVendorOrders(selectedVendor.id);

          return (
            <div className="space-y-6">
              {/* Vendor info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {selectedVendor.contactName && (
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500 block">Contact</span>
                      <span className="text-gray-800">{selectedVendor.contactName}</span>
                    </div>
                  </div>
                )}
                {selectedVendor.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500 block">Email</span>
                      <a href={`mailto:${selectedVendor.email}`} className="text-indigo-600 hover:underline">
                        {selectedVendor.email}
                      </a>
                    </div>
                  </div>
                )}
                {selectedVendor.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500 block">Phone</span>
                      <span className="text-gray-800">{selectedVendor.phone}</span>
                    </div>
                  </div>
                )}
                {selectedVendor.website && (
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500 block">Website</span>
                      <a
                        href={selectedVendor.website.startsWith('http') ? selectedVendor.website : `https://${selectedVendor.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        {selectedVendor.website.replace(/^https?:\/\//, '')}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                )}
                {selectedVendor.address && (
                  <div className="flex items-center gap-2 col-span-2">
                    <MapPin size={16} className="text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500 block">Address</span>
                      <span className="text-gray-800">{selectedVendor.address}</span>
                    </div>
                  </div>
                )}
                {selectedVendor.notes && (
                  <div className="flex items-start gap-2 col-span-2">
                    <FileText size={16} className="text-gray-400 mt-0.5" />
                    <div>
                      <span className="text-xs text-gray-500 block">Notes</span>
                      <span className="text-gray-600">{selectedVendor.notes}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Parts supplied */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Package size={16} />
                  Parts Supplied ({vendorParts.length})
                </h3>
                {vendorParts.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No parts linked to this vendor.</p>
                ) : (
                  <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 uppercase bg-gray-100">
                          <th className="px-4 py-2">Part Name</th>
                          <th className="px-4 py-2">Part #</th>
                          <th className="px-4 py-2">Vendor Part #</th>
                          <th className="px-4 py-2 text-right">Cost</th>
                          <th className="px-4 py-2 text-right">Lead Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vendorParts.map((part) => {
                          const pv = part.vendors.find((v) => v.vendorId === selectedVendor.id);
                          return (
                            <tr key={part.id} className="border-t border-gray-200">
                              <td className="px-4 py-2 font-medium text-gray-800">{part.name}</td>
                              <td className="px-4 py-2 text-gray-500">{part.partNumber}</td>
                              <td className="px-4 py-2 text-gray-500">{pv?.vendorPartNumber ?? '-'}</td>
                              <td className="px-4 py-2 text-gray-700 text-right">
                                ${(pv?.cost ?? 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-gray-500 text-right">
                                {pv?.leadTimeDays ? `${pv.leadTimeDays} days` : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Recent orders */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <ShoppingCart size={16} />
                  Recent Orders ({vendorOrders.length})
                </h3>
                {vendorOrders.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No orders from this vendor.</p>
                ) : (
                  <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 uppercase bg-gray-100">
                          <th className="px-4 py-2">Order #</th>
                          <th className="px-4 py-2">Date</th>
                          <th className="px-4 py-2">Items</th>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vendorOrders.slice(0, 10).map((order) => {
                          const statusColor: Record<string, string> = {
                            draft: 'bg-gray-100 text-gray-700',
                            ordered: 'bg-blue-100 text-blue-700',
                            shipped: 'bg-purple-100 text-purple-700',
                            partial: 'bg-orange-100 text-orange-700',
                            received: 'bg-green-100 text-green-700',
                            cancelled: 'bg-red-100 text-red-700',
                          };
                          return (
                            <tr key={order.id} className="border-t border-gray-200">
                              <td className="px-4 py-2 font-medium text-gray-800">{order.orderNumber}</td>
                              <td className="px-4 py-2 text-gray-500">
                                {new Date(order.orderDate).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-2 text-gray-500">{order.items.length}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor[order.status] ?? ''}`}>
                                  {order.status}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-gray-700 text-right font-medium">
                                ${order.total.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    setSelectedVendorId(null);
                    openEdit(selectedVendor);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Pencil size={16} />
                  Edit Vendor
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
