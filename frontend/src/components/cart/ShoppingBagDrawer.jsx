import { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { formatPrice } from '../../data/products';
import CartItem from './CartItem';
import CartEmptyState from './CartEmptyState';
import CartCheckoutForm from './CartCheckoutForm';
import CartSuccessReceipt from './CartSuccessReceipt';

// 58 Algerian Wilayas (preserved for export compatibility with ProfileModal.jsx)
export const ALGERIA_WILAYAS = [
  '01 - Adrar', '02 - Chlef', '03 - Laghouat', '04 - Oum El Bouaghi', '05 - Batna',
  '06 - Béjaïa', '07 - Biskra', '08 - Béchar', '09 - Blida', '10 - Bouira',
  '11 - Tamanrasset', '12 - Tébessa', '13 - Tlemcen', '14 - Tiaret', '15 - Tizi Ouzou',
  '16 - Alger', '17 - Djelfa', '18 - Jijel', '19 - Sétif', '20 - Saïda',
  '21 - Skikda', '22 - Sidi Bel Abbès', '23 - Annaba', '24 - Guelma', '25 - Constantine',
  '26 - Médéa', '27 - Mostaganem', '28 - M\'Sila', '29 - Mascara', '30 - Ouargla',
  '31 - Oran', '32 - El Bayadh', '33 - Illizi', '34 - Bordj Bou Arreridj', '35 - Boumerdès',
  '36 - El Tarf', '37 - Tindouf', '38 - Tissemsilt', '39 - El Oued', '40 - Khenchela',
  '41 - Souk Ahras', '42 - Tipaza', '43 - Mila', '44 - Aïn Defla', '45 - Naâma',
  '46 - Aïn Témouchent', '47 - Ghardaïa', '48 - Relizane', '49 - Timimoun', '50 - Bordj Badji Mokhtar',
  '51 - Ouled Djellal', '52 - Béni Abbès', '53 - In Salah', '54 - In Guezzam', '55 - Touggourt',
  '56 - Djanet', '57 - El M\'Ghair', '58 - El Meniaa'
];

/**
 * ShoppingBagDrawer — Main sliding panel coordinating cart review,
 * Algerian cash-on-delivery checkout, and order confirmation receipt.
 */
export default function ShoppingBagDrawer({ onOpenAuth, onOrderPlaced }) {
  const { isAuthenticated, user } = useAuth();
  const {
    items,
    cartCount,
    subtotal,
    isBagOpen,
    closeBag,
    updateQuantity,
    removeFromCart,
    checkout,
  } = useCart();

  // Drawer mode: 'cart' | 'checkout' | 'success'
  const [drawerMode, setDrawerMode] = useState('cart');
  const [placedOrder, setPlacedOrder] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [formError, setFormError] = useState('');

  // Checkout Form State
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    wilaya: '16 - Alger',
    commune: '',
    shippingAddress: '',
    deliveryMethod: 'home', // 'home' | 'desk'
  });

  // Prefill checkout form if authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData((prev) => ({
        ...prev,
        customerName: prev.customerName || user.name || '',
        customerEmail: prev.customerEmail || user.email || '',
        customerPhone: prev.customerPhone || user.phone || '',
        wilaya: prev.wilaya || user.wilaya || '16 - Alger',
        commune: prev.commune || user.commune || '',
        shippingAddress: prev.shippingAddress || user.address || '',
      }));
    }
  }, [isAuthenticated, user]);

  // Animation Lifecycle: open → enter → visible → exit → unmount
  const [mounted, setMounted] = useState(isBagOpen);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isBagOpen) {
      setMounted(true);
      const raf = requestAnimationFrame(() => {
        setVisible(true);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setVisible(false);
      const timer = setTimeout(() => {
        setMounted(false);
      }, 320);
      return () => clearTimeout(timer);
    }
  }, [isBagOpen]);

  // Keyboard accessibility: Escape key closes drawer
  useEffect(() => {
    if (!mounted) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeBag();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mounted, closeBag]);

  // Lock background body scroll when drawer is open
  useEffect(() => {
    if (mounted) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [mounted]);

  // Reset mode after drawer is fully closed and unmounted
  useEffect(() => {
    if (!isBagOpen && !mounted) {
      if (drawerMode === 'success') {
        setDrawerMode('cart');
        setPlacedOrder(null);
        setFormError('');
      }
    }
  }, [isBagOpen, mounted, drawerMode]);

  const handleContinueShopping = () => {
    closeBag();
    setTimeout(() => {
      setDrawerMode('cart');
      setPlacedOrder(null);
      setFormError('');
    }, 350);
  };

  if (!mounted) return null;

  // Delivery fee calculation (Home delivery standard across 58 Wilayas)
  const isAlgiers = formData.wilaya?.includes('Alger') || formData.wilaya?.startsWith('16');
  const shippingFee = isAlgiers ? 500 : 800;
  const totalOrderPrice = subtotal + shippingFee;

  const handleQuantityChange = async (productId, size, currentQty, delta) => {
    const newQty = currentQty + delta;
    if (newQty < 1) {
      handleRemove(productId, size);
      return;
    }
    setUpdatingId(`${productId}-${size}`);
    try {
      await updateQuantity(productId, newQty, size);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (productId, size) => {
    setUpdatingId(`${productId}-${size}`);
    try {
      await removeFromCart(productId, size);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleProceedToCheckout = () => {
    if (items.length === 0) return;
    setFormError('');
    setDrawerMode('checkout');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.customerName.trim()) {
      setFormError('Please enter your full name');
      return;
    }
    const cleanPhone = formData.customerPhone.replace(/[\s\-\.]/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setFormError('Please provide a valid Algerian phone number (e.g. 0550123456)');
      return;
    }
    if (!formData.wilaya) {
      setFormError('Please select your Wilaya');
      return;
    }
    if (!formData.commune.trim()) {
      setFormError('Please enter your Commune / City');
      return;
    }
    if (!formData.shippingAddress.trim()) {
      setFormError('Please enter your full delivery address');
      return;
    }

    setCheckoutLoading(true);
    try {
      const order = await checkout(formData);
      setPlacedOrder(order);
      setDrawerMode('success');
      onOrderPlaced?.(order);
    } catch (err) {
      setFormError(err.message || 'Failed to place order. Please review your details.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden font-sans-body"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag Drawer"
    >
      {/* Dark backdrop with smooth opacity transition */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-[240ms] ease-out cursor-pointer ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={closeBag}
      />

      {/* Sliding Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
        <div
          style={{
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className={`w-screen max-w-md bg-white text-[#0A0A0A] shadow-2xl flex flex-col border-l border-[#E8E8E8] pointer-events-auto transform transition-[transform,opacity] duration-[320ms] ${
            visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
          }`}
        >
          {/* Header */}
          <div className="p-6 bg-[#0A0A0A] text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              {drawerMode === 'checkout' && (
                <button
                  onClick={() => setDrawerMode('cart')}
                  className="p-1 hover:text-white/70 transition-colors mr-1 cursor-pointer"
                  aria-label="Back to Cart"
                  type="button"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <h2 className="font-serif-display text-xl tracking-[0.1em] font-medium">
                {drawerMode === 'cart' && `Shopping Bag (${cartCount})`}
                {drawerMode === 'checkout' && 'Checkout & Delivery'}
                {drawerMode === 'success' && 'Order Confirmed'}
              </h2>
            </div>
            <button
              onClick={closeBag}
              className="p-1 text-white/70 hover:text-white transition-colors cursor-pointer"
              aria-label="Close bag"
              type="button"
            >
              <X size={20} />
            </button>
          </div>

          {/* CONTENT: CART VIEW */}
          {drawerMode === 'cart' && (
            <>
              {items.length === 0 ? (
                <CartEmptyState onClose={closeBag} />
              ) : (
                <>
                  {/* Items Scrollable List */}
                  <div className="flex-1 overflow-y-auto divide-y divide-[#E8E8E8] p-6 space-y-6">
                    {items.map((item, idx) => {
                      const p = item.product || {};
                      const pId = p._id || p.id;
                      const size = item.size || 'M';
                      const itemKey = `${pId}-${size}-${idx}`;
                      const isUpdating = updatingId === `${pId}-${size}`;

                      return (
                        <CartItem
                          key={itemKey}
                          item={item}
                          isUpdating={isUpdating}
                          onQuantityChange={(delta) =>
                            handleQuantityChange(pId, size, item.quantity, delta)
                          }
                          onRemove={() => handleRemove(pId, size)}
                        />
                      );
                    })}
                  </div>

                  {/* Summary Footer */}
                  <div className="border-t border-[#E8E8E8] p-6 bg-[#F7F6F2] space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#666]">Subtotal</span>
                      <span className="font-semibold text-[#0A0A0A]">
                        {formatPrice(subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-[#666]">
                      <span>Estimated Shipping</span>
                      <span>Calculated at checkout</span>
                    </div>

                    <button
                      onClick={handleProceedToCheckout}
                      className="w-full bg-[#0A0A0A] text-white py-4 text-xs tracking-[0.2em] uppercase font-medium hover:bg-[#333333] hover:-translate-y-[0.5px] active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                      type="button"
                    >
                      <span>Proceed to Checkout</span>
                      <ArrowRight size={14} />
                    </button>

                    <p className="text-[11px] text-center text-[#666]">
                      Paiement à la livraison · Cash on Delivery across Algeria
                    </p>
                  </div>
                </>
              )}
            </>
          )}

          {/* CONTENT: CHECKOUT VIEW */}
          {drawerMode === 'checkout' && (
            <CartCheckoutForm
              formData={formData}
              onInputChange={handleInputChange}
              onSubmit={handleSubmitOrder}
              formError={formError}
              isAuthenticated={isAuthenticated}
              wilayas={ALGERIA_WILAYAS}
              isAlgiers={isAlgiers}
              cartCount={cartCount}
              subtotal={subtotal}
              shippingFee={shippingFee}
              totalOrderPrice={totalOrderPrice}
              checkoutLoading={checkoutLoading}
            />
          )}

          {/* CONTENT: SUCCESS RECEIPT VIEW */}
          {drawerMode === 'success' && (
            <CartSuccessReceipt
              placedOrder={placedOrder}
              onContinueShopping={handleContinueShopping}
            />
          )}
        </div>
      </div>
    </div>
  );
}
