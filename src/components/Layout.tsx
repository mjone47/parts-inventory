import { Outlet, useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import Sidebar from './Sidebar';
import { useApp } from '../data/store';

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/products': 'Products',
  '/parts': 'Parts Inventory',
  '/harvesting': 'Harvesting',
  '/orders': 'Orders',
  '/vendors': 'Vendors',
  '/warehouse': 'Warehouse Locations',
  '/warehouse/scanner': 'Barcode Scanner',
  '/request-parts': 'Request Parts',
  '/runner-queue': 'Runner Queue',
  '/settings': 'Settings',
};

function resolvePageTitle(pathname: string): string {
  // Exact match first
  if (routeTitles[pathname]) return routeTitles[pathname];

  // Try matching parent paths (e.g. /products/123 -> "Products")
  const segments = pathname.split('/').filter(Boolean);
  while (segments.length > 0) {
    const candidate = '/' + segments.join('/');
    if (routeTitles[candidate]) return routeTitles[candidate];
    segments.pop();
  }

  return 'Parts Inventory';
}

export default function Layout() {
  const { currentUser } = useApp();
  const location = useLocation();

  if (!currentUser) {
    return null;
  }
  const pageTitle = resolvePageTitle(location.pathname);

  const initials = currentUser.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentUser={currentUser} />

      {/* Main content area — offset by sidebar width on desktop */}
      <div className="lg:ml-[260px] flex flex-col min-h-screen">
        {/* Top header bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200">
          {/* Page title (with left padding on mobile for hamburger button) */}
          <h1 className="text-xl font-semibold text-gray-900 pl-12 lg:pl-0">
            {pageTitle}
          </h1>

          {/* Right side actions */}
          <div className="flex items-center gap-4">
            {/* Notification bell */}
            <button
              type="button"
              className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label="Notifications"
            >
              <Bell size={20} />
              {/* Optional unread indicator dot */}
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* User avatar / initial circle */}
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white text-sm font-semibold cursor-pointer select-none">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
