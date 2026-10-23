import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User, ShoppingBag, Menu, X, Shield, Package, UserCheck, LogOut, ChevronDown, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { getInitials } from '../utils/formatters';

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'New Arrivals', href: '#new-arrivals' },
  { label: 'Men', href: '#men' },
  { label: 'Women', href: '#women' },
  { label: 'Kids', href: '#kids' },
  { label: 'Contact', href: '#contact' },
];

export default function Header({
  onLoginClick,
  onOpenOrders,
  onOpenFavorites,
  onOpenProfile,
  onOpenAdminDashboard,
}) {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { cartCount, openBag } = useCart();
  const { favoritesCount } = useFavorites();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Profile Dropdown animation lifecycle
  const [dropdownMounted, setDropdownMounted] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  useEffect(() => {
    if (dropdownOpen) {
      setDropdownMounted(true);
      const raf = requestAnimationFrame(() => {
        setDropdownVisible(true);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setDropdownVisible(false);
      const timer = setTimeout(() => {
        setDropdownMounted(false);
      }, 180);
      return () => clearTimeout(timer);
    }
  }, [dropdownOpen]);

  // Mobile Menu animation lifecycle
  const [mobileMenuMounted, setMobileMenuMounted] = useState(false);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);

  useEffect(() => {
    if (mobileMenuOpen) {
      setMobileMenuMounted(true);
      const raf = requestAnimationFrame(() => {
        setMobileMenuVisible(true);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setMobileMenuVisible(false);
      const timer = setTimeout(() => {
        setMobileMenuMounted(false);
      }, 220);
      return () => clearTimeout(timer);
    }
  }, [mobileMenuOpen]);

  // Cart Badge micro-interaction on count increment
  const [badgeBump, setBadgeBump] = useState(false);
  const prevCartCountRef = useRef(cartCount);

  useEffect(() => {
    if (cartCount > 0 && cartCount !== prevCartCountRef.current) {
      setBadgeBump(true);
      const timer = setTimeout(() => {
        setBadgeBump(false);
      }, 200);
      prevCartCountRef.current = cartCount;
      return () => clearTimeout(timer);
    }
    prevCartCountRef.current = cartCount;
  }, [cartCount]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e, href) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
  };

  return (
    <>
      <div className="bg-[#0A0A0A] text-white py-3 px-4 text-center border-b border-white/5">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-8 text-xs sm:text-[11px] tracking-[0.2em] uppercase">
          <span>Delivery available across selected wilayas</span>
          <span className="hidden sm:inline text-white/40">·</span>
          <a
            href="#new-arrivals"
            onClick={(e) => handleNavClick(e, '#new-arrivals')}
            className="hover:text-white/70 transition-colors"
          >
            Explore the new collection
          </a>
        </div>
      </div>

      <header
        className={`sticky top-0 z-50 bg-[#0A0A0A] text-white transition-all duration-300 ${
          scrolled ? 'shadow-lg border-b border-white/10' : ''
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="text-sm tracking-wide hover:text-white/70 transition-colors font-sans-body"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 -ml-2 text-white hover:text-white/70 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            {/* Centered Brand Wordmark */}
            <a
              href="#home"
              onClick={(e) => handleNavClick(e, '#home')}
              className="font-serif-display text-2xl lg:text-3xl tracking-[0.15em] font-medium text-white hover:opacity-90 transition-opacity"
            >
              VÉLOR
            </a>

            {/* Right Icons: Search, Auth / Profile, Cart */}
            <div className="flex items-center gap-4 lg:gap-6">
              <button
                onClick={(e) => handleNavClick(e, '#new-arrivals')}
                className="hidden sm:block hover:text-white/70 transition-colors p-1"
                aria-label="Search"
                title="Search collection"
              >
                <Search size={20} strokeWidth={1.5} />
              </button>

              {/* Authentication Button or User Menu */}
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="flex items-center gap-2 hover:text-white/70 transition-colors text-xs tracking-wide py-1.5 px-2 rounded-lg"
                    aria-label="Account options"
                  >
                    <div className="w-7 h-7 rounded-full bg-white text-[#0A0A0A] font-semibold flex items-center justify-center text-xs">
                      {getInitials(user?.name)}
                    </div>
                    <span className="hidden md:inline max-w-[110px] truncate uppercase tracking-widest text-[11px]">
                      {user?.name}
                    </span>
                    <ChevronDown size={14} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Account Dropdown */}
                  {dropdownMounted && (
                    <div
                      style={{
                        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      className={`absolute right-0 mt-3 w-56 bg-[#0A0A0A] text-white border border-white/20 rounded-xl shadow-2xl py-2 z-50 text-xs transform transition-[transform,opacity] duration-[180ms] ${
                        dropdownVisible
                          ? 'opacity-100 scale-100 translate-y-0'
                          : 'opacity-0 scale-[0.98] -translate-y-1 pointer-events-none'
                      }`}
                    >
                      <div className="px-4 py-2 border-b border-white/10">
                        <p className="text-[10px] text-white/50 uppercase tracking-widest">Signed in as</p>
                        <p className="font-semibold truncate text-white mt-0.5">{user?.name}</p>
                        <p className="text-white/60 truncate">{user?.email}</p>
                        {isAdmin && (
                          <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-white/10 text-white rounded text-[10px] uppercase tracking-wider font-semibold">
                            <Shield size={10} /> Admin
                          </span>
                        )}
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            onOpenOrders?.();
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-white/10 flex items-center gap-2.5 transition-colors"
                        >
                          <Package size={14} className="text-white/70" />
                          <span>My Orders</span>
                        </button>

                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            onOpenFavorites?.();
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-white/10 flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <Heart size={14} className="text-white/70" />
                            <span>My Favorites</span>
                          </div>
                          {favoritesCount > 0 && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-white/20 rounded text-white">
                              {favoritesCount}
                            </span>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            onOpenProfile?.();
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-white/10 flex items-center gap-2.5 transition-colors"
                        >
                          <UserCheck size={14} className="text-white/70" />
                          <span>My Profile</span>
                        </button>

                        {isAdmin && (
                          <button
                            onClick={() => {
                              setDropdownOpen(false);
                              if (onOpenAdminDashboard) {
                                onOpenAdminDashboard();
                              } else {
                                navigate('/admin');
                              }
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-white/10 flex items-center gap-2.5 text-white font-semibold transition-colors border-t border-white/10 mt-1 pt-2"
                          >
                            <Shield size={14} />
                            <span>Admin Dashboard</span>
                          </button>
                        )}
                      </div>

                      <div className="border-t border-white/10 pt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-red-400 hover:bg-white/10 flex items-center gap-2.5 transition-colors"
                        >
                          <LogOut size={14} />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/signin"
                  className="hidden sm:flex items-center gap-2 hover:text-white/70 transition-colors text-xs tracking-wide"
                >
                  <User size={20} strokeWidth={1.5} />
                  <span className="hidden md:inline uppercase tracking-widest text-[11px]">SIGN IN / REGISTER</span>
                </Link>
              )}

              {/* Shopping Bag Button with Animated Badge */}
              <button
                onClick={openBag}
                className="relative hover:text-white/70 transition-colors p-1"
                aria-label="Shopping bag"
              >
                <ShoppingBag size={20} strokeWidth={1.5} />
                {cartCount > 0 && (
                  <span
                    className={`absolute -top-1.5 -right-1.5 bg-white text-[#0A0A0A] text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center transform transition-transform duration-[200ms] ease-out ${
                      badgeBump ? 'scale-110' : 'scale-100'
                    }`}
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuMounted && (
          <div
            style={{
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className={`lg:hidden bg-[#0A0A0A] border-t border-white/10 transform transition-[transform,opacity] duration-[220ms] ${
              mobileMenuVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 -translate-y-1.5 pointer-events-none'
            }`}
          >
            <nav className="flex flex-col px-6 py-4 gap-4">
              {navLinks.map((link, idx) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  style={{
                    transitionDelay: mobileMenuVisible ? `${idx * 35}ms` : '0ms',
                    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  className={`text-sm tracking-wide py-2 hover:text-white/70 transition-[color,transform,opacity] duration-200 font-sans-body transform ${
                    mobileMenuVisible
                      ? 'translate-x-0 opacity-100'
                      : '-translate-x-1.5 opacity-0'
                  }`}
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-4 border-t border-white/10">
                {isAuthenticated ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-widest font-semibold">{user?.name}</span>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setMobileMenuOpen(false);
                            if (onOpenAdminDashboard) {
                              onOpenAdminDashboard();
                            } else {
                              navigate('/admin');
                            }
                          }}
                          className="text-xs text-white/80 underline flex items-center gap-1"
                        >
                          <Shield size={12} /> Admin
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs">
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onOpenOrders?.();
                        }}
                        className="hover:underline"
                      >
                        My Orders
                      </button>
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onOpenFavorites?.();
                        }}
                        className="hover:underline flex items-center gap-1"
                      >
                        <span>Favorites</span>
                        {favoritesCount > 0 && <span>({favoritesCount})</span>}
                      </button>
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onOpenProfile?.();
                        }}
                        className="hover:underline"
                      >
                        Profile
                      </button>
                      <button onClick={handleLogout} className="text-red-400 hover:underline">
                        Sign Out
                      </button>
                    </div>
                  </div>
                ) : (
                  <Link
                    to="/signin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 pt-4 border-t border-white/10 text-xs tracking-wide hover:text-white/70 transition-colors"
                  >
                    <User size={18} strokeWidth={1.5} />
                    <span>SIGN IN / REGISTER</span>
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}

        {/* Backdrop for desktop dropdown */}
        {dropdownMounted && (
          <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
        )}
      </header>
    </>
  );
}
