import { useState, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Boxes,
  Scissors,
  ShoppingCart,
  Building2,
  MapPin,
  ScanBarcode,
  Settings,
  Menu,
  X,
  Cog,
  ClipboardList,
  Truck,
} from 'lucide-react';
import type { User, UserRole } from '../types';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const allNavSections: NavSection[] = [
  {
    title: 'MAIN',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} />, roles: ['admin', 'manager', 'technician', 'runner', 'viewer'] },
      { label: 'Products', path: '/products', icon: <Package size={20} />, roles: ['admin', 'manager', 'technician', 'runner', 'viewer'] },
      { label: 'Parts Inventory', path: '/parts', icon: <Boxes size={20} />, roles: ['admin', 'manager', 'technician', 'runner', 'viewer'] },
      { label: 'Orders', path: '/orders', icon: <ShoppingCart size={20} />, roles: ['admin', 'manager'] },
      { label: 'Vendors', path: '/vendors', icon: <Building2 size={20} />, roles: ['admin', 'manager'] },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { label: 'Harvesting', path: '/harvesting', icon: <Scissors size={20} />, roles: ['admin', 'manager', 'technician'] },
      { label: 'Request Parts', path: '/request-parts', icon: <ClipboardList size={20} />, roles: ['admin', 'manager', 'technician'] },
      { label: 'Runner Queue', path: '/runner-queue', icon: <Truck size={20} />, roles: ['admin', 'manager', 'runner'] },
    ],
  },
  {
    title: 'WAREHOUSE',
    items: [
      { label: 'Locations', path: '/warehouse', icon: <MapPin size={20} />, roles: ['admin', 'manager', 'runner'] },
      { label: 'Scanner', path: '/warehouse/scanner', icon: <ScanBarcode size={20} />, roles: ['admin', 'manager', 'runner'] },
    ],
  },
  {
    title: 'ADMIN',
    items: [
      { label: 'Settings', path: '/settings', icon: <Settings size={20} />, roles: ['admin'] },
    ],
  },
];

const roleBadgeColors: Record<string, string> = {
  admin: 'bg-red-500/20 text-red-300',
  manager: 'bg-blue-500/20 text-blue-300',
  technician: 'bg-green-500/20 text-green-300',
  runner: 'bg-purple-500/20 text-purple-300',
  viewer: 'bg-gray-500/20 text-gray-300',
};

interface SidebarProps {
  currentUser: User;
}

export default function Sidebar({ currentUser }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navSections = useMemo(() => {
    const role = currentUser.role;
    return allNavSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.roles.includes(role)),
      }))
      .filter((section) => section.items.length > 0);
  }, [currentUser.role]);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo area */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/50">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600">
          <Cog size={20} className="text-white" />
        </div>
        <span className="text-lg font-semibold text-white tracking-tight">
          Parts Inventory
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {section.title}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'));

                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`
                        group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                        transition-all duration-150 ease-in-out relative
                        ${
                          isActive
                            ? 'bg-blue-600/15 text-blue-400'
                            : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                        }
                      `}
                    >
                      {/* Active left border accent */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-blue-500 rounded-r-full" />
                      )}
                      <span
                        className={`flex-shrink-0 transition-colors duration-150 ${
                          isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-white'
                        }`}
                      >
                        {item.icon}
                      </span>
                      {item.label}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Current user info */}
      <div className="border-t border-slate-700/50 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-600 text-white text-sm font-semibold flex-shrink-0">
            {currentUser.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              currentUser.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
            <span
              className={`inline-block mt-0.5 px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full ${
                roleBadgeColors[currentUser.role] ?? roleBadgeColors.viewer
              }`}
            >
              {currentUser.role}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-800 text-white lg:hidden"
        onClick={() => setMobileOpen((prev) => !prev)}
        aria-label="Toggle sidebar"
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — mobile (slide-in) */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-[260px] bg-[#1e293b] flex-col
          transform transition-transform duration-200 ease-in-out
          lg:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {sidebarContent}
      </aside>

      {/* Sidebar — desktop (always visible) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[260px] bg-[#1e293b] flex-col">
        {sidebarContent}
      </aside>
    </>
  );
}
