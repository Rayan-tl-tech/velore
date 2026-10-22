import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Package, Calendar, Loader2, MapPin, Phone, Truck } from 'lucide-react';
import { getMyOrders, getAllOrders } from '../../services/api/orderService';
import { useAuth } from '../../context/AuthContext';
import { formatPrice } from '../../data/products';
import { getImageUrl } from '../../utils/formatters';

export default function OrdersModal({ isOpen, onClose, isAdminMode = false }) {
  const { user, isAdmin } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Animation Lifecycle: open → enter → visible → exit → unmount
  const [mounted, setMounted] = useState(isOpen);
  const [visible, setVisible] = useState(false);
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      isClosingRef.current = false;
      setMounted(true);
      const raf = requestAnimationFrame(() => {
        setVisible(true);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setVisible(false);
      const timer = setTimeout(() => {
        setMounted(false);
      }, 240);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleRequestClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setVisible(false);
    setTimeout(() => {
      onClose();
    }, 240);
  }, [onClose]);

  // Keyboard accessibility: Escape key closes modal
  useEffect(() => {
    if (!mounted) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleRequestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mounted, handleRequestClose]);

  // Lock background body scroll
  useEffect(() => {
    if (mounted) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [mounted]);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setError('');

    const fetchAction = isAdminMode && isAdmin ? getAllOrders : getMyOrders;

    fetchAction()
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || 'Failed to load orders'))
      .finally(() => setLoading(false));
  }, [isOpen, isAdminMode, isAdmin]);

  if (!mounted) return null;

  const formatDate = (isoString) => {
    if (!isoString) return 'Recent';
    try {
      return new Date(isoString).toLocaleDateString('fr-DZ', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recent';
    }
  };

  const getStatusBadge = (status = 'pending') => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return (
          <span className="px-2.5 py-1 text-[10px] tracking-wider uppercase font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            Delivered / Livré
          </span>
        );
      case 'shipped':
        return (
          <span className="px-2.5 py-1 text-[10px] tracking-wider uppercase font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            Shipped / Expédié
          </span>
        );
      case 'processing':
        return (
          <span className="px-2.5 py-1 text-[10px] tracking-wider uppercase font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
            Processing / En préparation
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 text-[10px] tracking-wider uppercase font-semibold bg-red-50 text-red-800 border border-red-200">
            Cancelled / Annulé
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-[10px] tracking-wider uppercase font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            Pending / En attente
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans-body"
      role="dialog"
      aria-modal="true"
      aria-label="Order History"
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-[240ms] ease-out cursor-pointer ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleRequestClose}
      />

      {/* Modal Container */}
      <div
        style={{
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className={`relative bg-white shadow-2xl w-full max-w-3xl overflow-hidden z-10 flex flex-col max-h-[85vh] border border-[#E8E8E8] transform transition-[transform,opacity] duration-[240ms] ${
          visible
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-[0.98] translate-y-1'
        }`}
      >
        {/* Header */}
        <div className="p-6 bg-[#0A0A0A] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 text-white rounded">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif-display text-xl tracking-[0.1em] font-medium">
                {isAdminMode && isAdmin ? 'Platform Orders (Back-Office)' : 'Order History'}
              </h2>
              <p className="text-xs text-white/60">
                {isAdminMode && isAdmin
                  ? 'All customer orders placed across Algeria'
                  : `Orders linked to ${user?.name || user?.email}`}
              </p>
            </div>
          </div>
          <button
            onClick={handleRequestClose}
            className="p-1 text-white/70 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-[#666] space-y-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#0A0A0A]" />
              <p className="text-xs tracking-wider uppercase">Loading orders…</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-700 text-xs text-center border border-red-200">
              {error}
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center text-[#666] space-y-3">
              <Package className="w-12 h-12 text-[#999] mx-auto stroke-1" />
              <h3 className="font-serif-display text-xl text-[#0A0A0A]">No orders recorded yet</h3>
              <p className="text-xs max-w-sm mx-auto">
                Orders placed from your account or guest orders registered with your details will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => {
                const orderId = order._id?.slice(-6).toUpperCase() || 'REF';
                return (
                  <div
                    key={order._id}
                    className="border border-[#E8E8E8] bg-[#FAFAFA] p-5 transition-shadow hover:shadow-sm"
                  >
                    {/* Top bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E8E8E8]">
                      <div>
                        <span className="text-[10px] tracking-widest text-[#888] uppercase block">
                          Reference
                        </span>
                        <span className="font-mono text-sm font-bold text-[#0A0A0A]">
                          #VLR-{orderId}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[#666]">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(order.createdAt)}</span>
                      </div>

                      <div>{getStatusBadge(order.status)}</div>
                    </div>

                    {/* Delivery & Customer Info */}
                    <div className="py-3 text-xs text-[#555] grid grid-cols-1 sm:grid-cols-2 gap-2 border-b border-[#E8E8E8]">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#888] shrink-0" />
                        <span className="truncate">
                          {order.wilaya} {order.commune ? `(${order.commune})` : ''} — {order.shippingAddress}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 sm:justify-end">
                        <Truck className="w-3.5 h-3.5 text-[#888] shrink-0" />
                        <span>
                          {order.deliveryMethod === 'desk' ? 'Desk Collection' : 'Home Delivery'}
                          {order.customerPhone ? ` · Tel: ${order.customerPhone}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="py-3 divide-y divide-[#E8E8E8]">
                      {order.items?.map((item, i) => {
                        const product = item.product || {};
                        return (
                          <div key={i} className="py-2.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-13 bg-[#E8E8E8] overflow-hidden shrink-0">
                                <img
                                  src={product.image ? getImageUrl(product.image) : 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=1000&fit=crop'}
                                  alt={product.name || 'VÉLOR'}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-[#0A0A0A]">{product.name || 'Piece'}</p>
                                <p className="text-[10px] text-[#777]">
                                  Qty: {item.quantity} {item.size ? `· Size ${item.size}` : ''}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-semibold text-[#0A0A0A]">
                              {formatPrice(Number(item.price) * item.quantity)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Total */}
                    <div className="pt-3 border-t border-[#E8E8E8] flex justify-between items-center text-xs">
                      <span className="text-[#666]">
                        Includes Shipping: {formatPrice(order.shippingFee || 0)}
                      </span>
                      <div className="text-right">
                        <span className="text-[10px] text-[#888] uppercase tracking-wider block">Total Paid / Due</span>
                        <span className="text-sm font-bold text-[#0A0A0A]">
                          {formatPrice(order.totalPrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
