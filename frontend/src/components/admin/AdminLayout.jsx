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
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../utils/formatters';

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
  const { user, isAdmin, logout } = useAuth();

  const currentPage = navItems.find((item) => item.path === location.pathname)?.label || 'Overview';

  const userInitials = getInitials(user?.name) || 'AD';

  return (
    <div className="min-h-screen flex bg-[#F5F5F5] w-full">
      {/* Sidebar */}
      <aside className="w-60 xl:w-64 shrink-0 bg-[#0A0A0A] text-white flex flex-col fixed top-0 left-0 bottom-0 h-screen z-20">
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between shrink-0">
          <Link to="/" className="flex items-center gap-2.5 group">
            <h1 className="font-serif-display text-xl tracking-[0.15em]">VÉLOR</h1>
            <span className="text-[10px] tracking-[0.2em] text-white/50 group-hover:text-white transition-colors">
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

        <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3.5 px-6 py-3 text-xs tracking-wider uppercase transition-colors ${
                  isActive
                    ? 'bg-white/10 border-l-2 border-white text-white font-medium'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={17} strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-white text-[#0A0A0A] flex items-center justify-center text-xs font-medium shrink-0">
              {userInitials}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium truncate">{user?.name || 'Administrator'}</p>
              <p className="text-[10px] text-white/50 truncate">
                Administrator
              </p>
            </div>
          </div>
          {user && logout && (
            <button
              onClick={logout}
              title="Sign Out"
              className="text-white/40 hover:text-red-400 p-1.5 transition-colors shrink-0"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 ml-60 xl:ml-64 flex flex-col min-w-0">
        <header className="bg-white border-b border-[#E8E8E8] px-6 lg:px-8 py-4 sticky top-0 z-10 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-[#666] mb-0.5">VÉLOR ADMIN</p>
              <h1 className="font-serif-display text-2xl lg:text-3xl font-normal text-[#0A0A0A]">{currentPage}</h1>
            </div>

            <div className="flex items-center gap-4 lg:gap-6">
              <div className="flex items-center gap-2.5 bg-[#F5F5F5] px-3.5 py-2 rounded">
                <Search size={16} strokeWidth={1.5} className="text-[#666]" />
                <input
                  type="text"
                  placeholder="Quick search..."
                  className="bg-transparent text-xs focus:outline-none w-36 sm:w-44"
                />
              </div>

              <Link
                to="/"
                className="text-xs tracking-wider uppercase border border-[#0A0A0A] px-3.5 py-2 hover:bg-[#0A0A0A] hover:text-white transition-colors shrink-0"
              >
                Storefront →
              </Link>

              <div className="flex items-center gap-3 pl-2 border-l border-[#E8E8E8]">
                <div className="w-8 h-8 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center text-xs font-medium shrink-0">
                  {userInitials}
                </div>
                <div className="hidden md:block">
                  <p className="text-xs font-medium leading-tight text-[#0A0A0A]">{user?.name || 'Administrator'}</p>
                  <p className="text-[10px] text-[#666]">Administrator</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main key={location.pathname} className="p-6 lg:p-8 animate-admin-view flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
