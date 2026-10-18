import { ShoppingCart, ShoppingBag, ChevronDown, LogOut, Package, User as UserIcon, Shield } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { getInitials } from '../../utils/formatters';

export default function Navbar({
  onLoginClick,
  onGoHome,
  onGoShop,
  onOpenOrders,
  onOpenProfile,
  onOpenAdminOrders: _onOpenAdminOrders,
  onOpenAdminDashboard,
}) {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { cartCount, openBag } = useCart();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 backdrop-blur-md bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Left: Logo + Nav Links */}
          <div className="flex items-center space-x-8">
            {/* Logo */}
            <button
              onClick={onGoHome}
              className="flex items-center space-x-2.5 focus:outline-none group text-left"
              aria-label="Shopify Home"
            >
              <div className="bg-indigo-600 p-2 rounded-xl group-hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20">
                <ShoppingCart className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <span className="text-xl font-extrabold text-gray-900 tracking-tight">Shopify</span>
            </button>

            {/* Navigation Pills */}
            <div className="hidden md:flex space-x-1 items-center">
              <button
                onClick={onGoShop}
                className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-semibold text-sm hover:bg-indigo-100 transition-colors"
              >
                Shop
              </button>

              {isAuthenticated && (
                <button
                  onClick={onOpenOrders}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl font-medium text-sm transition-colors flex items-center gap-1.5"
                >
                  <Package className="w-4 h-4" />
                  <span>Orders</span>
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={onOpenAdminDashboard}
                  className="px-4 py-2 text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 rounded-xl font-medium text-sm transition-colors flex items-center gap-1.5"
                >
                  <Shield className="w-4 h-4 text-indigo-600" />
                  <span>Admin</span>
                </button>
              )}
            </div>
          </div>

          {/* Right: Cart + User */}
          <div className="flex items-center space-x-3">

            {/* Cart / Bag Icon with badge */}
            <button
              onClick={openBag}
              className="relative p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors focus:outline-none"
              aria-label="Open Shopping Bag"
              title="Shopping Bag"
            >
              <ShoppingBag className="w-5 h-5 text-gray-700" strokeWidth={2} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 bg-indigo-600 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-md shadow-indigo-600/30 animate-scale-in leading-none">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>

            {/* User section */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-gray-50 focus:outline-none transition-colors border border-transparent hover:border-gray-200"
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                >
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center shrink-0 border border-indigo-200">
                    <span className="text-indigo-700 font-bold text-xs">{getInitials(user?.name)}</span>
                  </div>
                  <span className="text-gray-800 font-semibold text-sm hidden sm:block max-w-[120px] truncate">
                    {user?.name}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 hidden sm:block transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-100 rounded-2xl shadow-xl py-1.5 z-50 animate-fade-in">
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Signed in as</p>
                      <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      {isAdmin && (
                        <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-semibold rounded-full border border-indigo-100">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      )}
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenOrders?.();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors font-medium"
                      >
                        <Package className="w-4 h-4 text-gray-400" />
                        My Orders
                      </button>

                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenProfile?.();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors font-medium"
                      >
                        <UserIcon className="w-4 h-4 text-gray-400" />
                        My Profile
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            onOpenAdminDashboard?.();
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 flex items-center gap-2.5 transition-colors font-medium"
                        >
                          <Shield className="w-4 h-4 text-indigo-500" />
                          Admin Dashboard
                        </button>
                      )}
                    </div>

                    <div className="border-t border-gray-100 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onLoginClick}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20 active:scale-95"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Close dropdown backdrop */}
      {dropdownOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
      )}
    </nav>
  );
}
