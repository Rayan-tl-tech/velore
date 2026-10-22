import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  Receipt,
  Users,
  Tag,
  Settings,
  Bell,
  Search,
  ArrowLeft,
  LogOut,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { label: 'Overview', path: '/admin', icon: LayoutDashboard },
  { label: 'Products', path: '/admin/products', icon: ShoppingBag },
  { label: 'Orders', path: '/admin/orders', icon: Receipt },
  { label: 'Customers', path: '/admin/customers', icon: Users },
  { label: 'Categories', path: '/admin/categories', icon: Tag },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }) {
  const location = useLocation();
  const { user, isAdmin, login, logout } = useAuth();
  const [loggingIn, setLoggingIn] = useState(false);
  const [authError, setAuthError] = useState(null);

  const currentPage = navItems.find((item) => item.path === location.pathname)?.label || 'Overview';

  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : isAdmin ? 'AD' : 'GZ';

  const handleQuickAdminLogin = async () => {
    try {
      setLoggingIn(true);
      setAuthError(null);
      await login('admin@velor.com', 'Admin1234!');
    } catch (err) {
      setAuthError(err.message || 'Failed to authenticate as admin');
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F5F5F5]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0A0A0A] text-white flex flex-col fixed h-screen z-20">
        <div className="p-8 border-b border-white/10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <h1 className="font-serif-display text-2xl tracking-[0.15em]">VÉLOR</h1>
            <span className="text-xs tracking-[0.2em] text-white/50 group-hover:text-white transition-colors">
              ADMIN
            </span>
          </Link>
          <Link
            to="/"
            title="Return to Storefront"
            className="text-white/40 hover:text-white p-1 rounded transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
        </div>

        <nav className="flex-1 py-6">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 px-8 py-4 text-sm transition-colors ${
                  isActive
                    ? 'bg-white/5 border-l-2 border-white text-white font-medium'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={20} strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>



        {/* User Card */}
        <div className="p-8 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-white text-[#0A0A0A] flex items-center justify-center text-xs font-medium shrink-0">
              {userInitials}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.name || (isAdmin ? 'Admin' : 'Guest Admin')}</p>
              <p className="text-xs text-white/50 truncate">
                {isAdmin ? 'Master Admin' : 'Demo Profile'}
              </p>
            </div>
          </div>
          {user && logout && (
            <button
              onClick={logout}
              title="Sign Out"
              className="text-white/40 hover:text-red-400 p-1.5 transition-colors shrink-0"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 ml-64 min-w-0">
        <header className="bg-white border-b border-[#E8E8E8] px-8 py-6 sticky top-0 z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-[#666] mb-1">VÉLOR ADMIN</p>
              <h1 className="font-serif-display text-4xl font-normal">{currentPage}</h1>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 bg-[#F5F5F5] px-4 py-2.5 rounded">
                <Search size={18} strokeWidth={1.5} className="text-[#666]" />
                <input
                  type="text"
                  placeholder="Quick search..."
                  className="bg-transparent text-sm focus:outline-none w-44"
                />
              </div>

              <Link
                to="/"
                className="text-xs tracking-wider uppercase border border-[#0A0A0A] px-4 py-2.5 hover:bg-[#0A0A0A] hover:text-white transition-colors"
              >
                Storefront →
              </Link>

              <div className="flex items-center gap-3 pl-2 border-l border-[#E8E8E8]">
                <div className="w-10 h-10 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center text-xs font-medium">
                  {userInitials}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium leading-tight">{user?.name || (isAdmin ? 'Admin' : 'Guest')}</p>
                  <p className="text-xs text-[#666]">{isAdmin ? 'Administrator' : 'Read-Only Mode'}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Quick Admin Auth Banner if not authenticated as admin */}
        {!isAdmin && (
          <div className="bg-[#0A0A0A] text-white px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <KeyRound size={16} className="text-amber-400 shrink-0" />
              <span>
                To create products, update order statuses, or manage customer roles, authenticate with an administrator account.
              </span>
            </div>
            <div className="flex items-center gap-3">
              {authError && <span className="text-red-400">{authError}</span>}
              <button
                onClick={handleQuickAdminLogin}
                disabled={loggingIn}
                className="bg-white text-[#0A0A0A] px-4 py-1.5 font-medium hover:bg-white/90 transition-colors uppercase tracking-wider text-[11px] disabled:opacity-50"
              >
                {loggingIn ? 'Connecting...' : 'One-Click Admin Login'}
              </button>
              <Link
                to="/signin"
                className="text-white/70 hover:text-white underline underline-offset-2"
              >
                Custom Sign In
              </Link>
            </div>
          </div>
        )}

        <main key={location.pathname} className="p-8 animate-admin-view">
          {children}
        </main>
      </div>
    </div>
  );
}
