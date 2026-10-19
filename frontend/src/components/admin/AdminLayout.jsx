import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Receipt, Users, Tag, Settings, Bell, Search, ArrowLeft, LogOut } from 'lucide-react';
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
  const { user, logout } = useAuth();
  const currentPage = navItems.find((item) => item.path === location.pathname)?.label || 'Overview';

  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AD';

  return (
    <div className="min-h-screen flex bg-[#F5F5F5]">
      <aside className="w-64 bg-[#0A0A0A] text-white flex flex-col fixed h-screen z-20">
        <div className="p-8 border-b border-white/10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <h1 className="font-serif-display text-2xl tracking-[0.15em]">VÉLOR</h1>
            <span className="text-xs tracking-[0.2em] text-white/50 group-hover:text-white transition-colors">ADMIN</span>
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
                    ? 'bg-white/5 border-l-2 border-white text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={20} strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-8 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white text-[#0A0A0A] flex items-center justify-center text-xs font-medium">
              {userInitials}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate max-w-[120px]">{user?.name || 'Administrator'}</p>
              <p className="text-xs text-white/50">{user?.role === 'admin' ? 'Master Admin' : 'Demo profile'}</p>
            </div>
          </div>
          {logout && (
            <button
              onClick={logout}
              title="Sign Out"
              className="text-white/40 hover:text-red-400 p-1.5 transition-colors"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>
      <div className="flex-1 ml-64">
        <header className="bg-white border-b border-[#E8E8E8] px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-[#666] mb-2">VÉLOR ADMIN / DEMO</p>
              <h1 className="font-serif-display text-4xl font-normal">{currentPage}</h1>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 bg-[#F5F5F5] px-4 py-3 rounded">
                <Search size={18} strokeWidth={1.5} className="text-[#666]" />
                <input
                  type="text"
                  placeholder="Search dashboard"
                  className="bg-transparent text-sm focus:outline-none w-48"
                />
              </div>
              <button className="relative p-2 hover:bg-[#F5F5F5] rounded transition-colors">
                <Bell size={20} strokeWidth={1.5} />
              </button>
              <Link to="/" className="text-xs tracking-wider uppercase border border-[#0A0A0A] px-3.5 py-2 hover:bg-[#0A0A0A] hover:text-white transition-colors">
                Storefront →
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center text-xs font-medium">
                  {userInitials}
                </div>
                <div>
                  <p className="text-sm font-medium">{user?.name || 'Administrator'}</p>
                  <p className="text-xs text-[#666]">{user?.role === 'admin' ? 'Master Admin' : 'Demo profile'}</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
