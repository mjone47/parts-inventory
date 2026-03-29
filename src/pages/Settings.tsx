import { useState } from 'react';
import {
  Settings as SettingsIcon,
  Users,
  Shield,
  Edit2,
  Plus,
  Check,
  X,
  RefreshCw,
  Database,
  Package,
  MapPin,
  Store,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../data/store';
import Modal from '../components/Modal';
import type { UserRole } from '../types';

const roleBadgeColors: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-700 border-red-200',
  manager: 'bg-blue-100 text-blue-700 border-blue-200',
  technician: 'bg-green-100 text-green-700 border-green-200',
  runner: 'bg-purple-100 text-purple-700 border-purple-200',
  viewer: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function Settings() {
  const {
    users,
    currentUser,
    setCurrentUser,
    addUser,
    updateUser,
    deleteUser,
    parts,
    products,
    vendors,
    warehouseLocations,
    canEditPartNames,
    updatePart,
  } = useApp();

  // ── User Management State ──────────────────────────────────────────────────

  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('viewer');
  const [editingRoleUserId, setEditingRoleUserId] = useState<string | null>(null);
  const [editRoleValue, setEditRoleValue] = useState<UserRole>('viewer');

  // ── Part Name Editing State ────────────────────────────────────────────────

  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [editPartName, setEditPartName] = useState('');

  // ── Reset Data State ───────────────────────────────────────────────────────

  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // ── User Handlers ─────────────────────────────────────────────────────────

  const isAdmin = currentUser?.role === 'admin';

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleStartEditRole = (userId: string, currentRole: UserRole) => {
    setEditingRoleUserId(userId);
    setEditRoleValue(currentRole);
  };

  const handleSaveRole = () => {
    if (editingRoleUserId) {
      updateUser(editingRoleUserId, { role: editRoleValue });
    }
    setEditingRoleUserId(null);
  };

  const handleStartEditPartName = (partId: string, currentName: string) => {
    setEditingPartId(partId);
    setEditPartName(currentName);
  };

  const handleSavePartName = () => {
    if (!editingPartId || !editPartName.trim()) return;
    updatePart(editingPartId, { name: editPartName.trim() });
    setEditingPartId(null);
    setEditPartName('');
  };

  const handleResetData = () => {
    // Clear all localStorage and reload
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('pim_')) {
        localStorage.removeItem(key);
      }
    });
    window.location.reload();
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="text-indigo-600" size={28} />
          Settings
        </h1>
        <p className="text-gray-500 mt-1">Manage users, part names, and system configuration</p>
      </div>

      {/* ── Switch User (Demo) ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserCheck className="text-indigo-600" size={20} />
          <h2 className="text-lg font-semibold text-gray-900">Switch User (Demo)</h2>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          Switch the current user to test role-based features. This is for demonstration purposes.
        </p>
        <div className="flex items-center gap-4">
          <select
            value={currentUser?.id || ''}
            onChange={(e) => setCurrentUser(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} - {u.role}
              </option>
            ))}
          </select>
          {currentUser && (
            <span
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border ${
                roleBadgeColors[currentUser.role]
              }`}
            >
              <Shield size={14} />
              {currentUser.role}
            </span>
          )}
        </div>
      </div>

      {/* ── User Management ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="text-indigo-600" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
          </div>
          <button
            onClick={() => {
              setNewUserName('');
              setNewUserEmail('');
              setNewUserRole('viewer');
              setAddUserModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            Add User
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-600">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    user.id === currentUser?.id ? 'bg-indigo-50/50' : ''
                  }`}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{user.name}</span>
                      {user.id === currentUser?.id && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                          You
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-gray-600">{user.email}</td>
                  <td className="px-6 py-3">
                    {editingRoleUserId === user.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={editRoleValue}
                          onChange={(e) => setEditRoleValue(e.target.value as UserRole)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="admin">admin</option>
                          <option value="manager">manager</option>
                          <option value="technician">technician</option>
                          <option value="runner">runner</option>
                          <option value="viewer">viewer</option>
                        </select>
                        <button
                          onClick={handleSaveRole}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingRoleUserId(null)}
                          className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          roleBadgeColors[user.role]
                        }`}
                      >
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {isAdmin && editingRoleUserId !== user.id && (
                      <button
                        onClick={() => handleStartEditRole(user.id, user.role)}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                        title="Edit role"
                      >
                        <Edit2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add User Modal ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={addUserModalOpen}
        onClose={() => setAddUserModalOpen(false)}
        title="Add User"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newUserName.trim() || !newUserEmail.trim()) return;
            addUser({
              name: newUserName.trim(),
              email: newUserEmail.trim(),
              role: newUserRole,
            });
            setNewUserName('');
            setNewUserEmail('');
            setNewUserRole('viewer');
            setAddUserModalOpen(false);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              required
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Full name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="user@company.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as UserRole)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="technician">Technician</option>
              <option value="runner">Runner</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddUserModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Add User
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Part Name Management ───────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Package className="text-indigo-600" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">Part Name Management</h2>
          </div>
          <p className="text-sm text-gray-500">
            Only Admin and Manager roles can edit part names to maintain consistency.
          </p>
        </div>
        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {parts.map((part) => (
            <div
              key={part.id}
              className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                {editingPartId === part.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editPartName}
                      onChange={(e) => setEditPartName(e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSavePartName();
                        if (e.key === 'Escape') setEditingPartId(null);
                      }}
                    />
                    <button
                      onClick={handleSavePartName}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => setEditingPartId(null)}
                      className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate">{part.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{part.partNumber}</p>
                  </div>
                )}
              </div>
              {editingPartId !== part.id && canEditPartNames() && (
                <button
                  onClick={() => handleStartEditPartName(part.id, part.name)}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors ml-3"
                  title="Edit name"
                >
                  <Edit2 size={15} />
                </button>
              )}
              {editingPartId !== part.id && !canEditPartNames() && (
                <span className="text-xs text-gray-400 italic ml-3">No permission</span>
              )}
            </div>
          ))}
          {parts.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-400">No parts in the system.</div>
          )}
        </div>
      </div>

      {/* ── System Info ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="text-indigo-600" size={20} />
          <h2 className="text-lg font-semibold text-gray-900">System Information</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <Package className="mx-auto text-indigo-500 mb-1" size={24} />
            <p className="text-2xl font-bold text-gray-900">{products.length}</p>
            <p className="text-xs text-gray-500">Products</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <Package className="mx-auto text-green-500 mb-1" size={24} />
            <p className="text-2xl font-bold text-gray-900">{parts.length}</p>
            <p className="text-xs text-gray-500">Parts</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <Store className="mx-auto text-amber-500 mb-1" size={24} />
            <p className="text-2xl font-bold text-gray-900">{vendors.length}</p>
            <p className="text-xs text-gray-500">Vendors</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <MapPin className="mx-auto text-purple-500 mb-1" size={24} />
            <p className="text-2xl font-bold text-gray-900">{warehouseLocations.length}</p>
            <p className="text-xs text-gray-500">Locations</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <button
            onClick={() => setResetConfirmOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            <RefreshCw size={16} />
            Reset Data
          </button>
        </div>
      </div>

      {/* ── Reset Confirmation Modal ───────────────────────────────────────── */}
      <Modal
        isOpen={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        title="Reset All Data"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
            <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-medium text-red-800">This action cannot be undone.</p>
              <p className="text-sm text-red-700 mt-1">
                All data will be cleared from localStorage and the application will reload with the
                original seed data.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setResetConfirmOpen(false)}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleResetData}
              className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Reset Data
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
