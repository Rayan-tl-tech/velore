import { useState, useEffect } from 'react';
import {
  X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, ArrowLeft,
  Loader2, CheckCircle2, ShieldCheck, Truck, MapPin, Phone, User
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { getImageUrl } from '../../utils/formatters';
import { formatPrice } from '../../data/products';

// 58 Algerian Wilayas
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

  // Reset mode when closing
  useEffect(() => {
    if (!isBagOpen) {
      if (drawerMode === 'success') {
        setDrawerMode('cart');
        setPlacedOrder(null);
      }
    }
  }, [isBagOpen, drawerMode]);

  if (!mounted) return null;

  // Delivery fee calculation
  const isAlgiers = formData.wilaya?.includes('Alger') || formData.wilaya?.startsWith('16');
  const shippingFee = formData.deliveryMethod === 'desk'
    ? (isAlgiers ? 350 : 500)
    : (isAlgiers ? 500 : 800);
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
            >
              <X size={20} />
            </button>
          </div>

          {/* CONTENT: CART VIEW */}
          {drawerMode === 'cart' && (
            <>
              {items.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#F7F6F2] flex items-center justify-center mb-6">
                    <ShoppingBag size={24} className="text-[#666]" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-serif-display text-2xl mb-2">Your bag is empty</h3>
                  <p className="text-sm text-[#666] max-w-xs mb-8">
                    Explore the seasonal collection and discover timeless essentials.
                  </p>
                  <button
                    onClick={closeBag}
                    className="bg-[#0A0A0A] text-white px-8 py-3.5 text-xs tracking-[0.2em] uppercase font-medium hover:bg-[#333333] transition-colors cursor-pointer"
                  >
                    Start Shopping
                  </button>
                </div>
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
                        <div key={itemKey} className="flex gap-4 pt-4 first:pt-0">
                          {/* Thumbnail */}
                          <div className="w-20 h-26 bg-[#F0F0F0] overflow-hidden shrink-0">
                            <img
                              src={p.image ? getImageUrl(p.image) : 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=1000&fit=crop'}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Info */}
                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start gap-2">
                                <h4 className="text-sm font-medium leading-tight text-[#0A0A0A]">
                                  {p.name}
                                </h4>
                                <button
                                  onClick={() => handleRemove(pId, size)}
                                  disabled={isUpdating}
                                  className="text-[#888] hover:text-[#0A0A0A] p-1 transition-colors cursor-pointer"
                                  title="Remove item"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              <p className="text-xs text-[#666] mt-1">
                                Size: <span className="font-semibold text-[#0A0A0A]">{size}</span>
                              </p>
                              <p className="text-sm font-medium text-[#0A0A0A] mt-1">
                                {formatPrice(p.price)}
                              </p>
                            </div>

                            {/* Quantity Stepper */}
                            <div className="flex items-center justify-between pt-2">
                              <div className="inline-flex items-center border border-[#E8E8E8] text-xs">
                                <button
                                  onClick={() => handleQuantityChange(pId, size, item.quantity, -1)}
                                  disabled={isUpdating}
                                  className="p-1.5 hover:bg-[#F7F6F2] transition-colors cursor-pointer disabled:opacity-30"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="px-3 font-medium min-w-6 text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => handleQuantityChange(pId, size, item.quantity, 1)}
                                  disabled={isUpdating}
                                  className="p-1.5 hover:bg-[#F7F6F2] transition-colors cursor-pointer disabled:opacity-30"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                              <span className="text-xs font-semibold">
                                {formatPrice((Number(p.price) || 0) * item.quantity)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Footer */}
                  <div className="border-t border-[#E8E8E8] p-6 bg-[#F7F6F2] space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#666]">Subtotal</span>
                      <span className="font-semibold text-[#0A0A0A]">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-[#666]">
                      <span>Estimated Shipping</span>
                      <span>Calculated at checkout</span>
                    </div>

                    <button
                      onClick={handleProceedToCheckout}
                      className="w-full bg-[#0A0A0A] text-white py-4 text-xs tracking-[0.2em] uppercase font-medium hover:bg-[#333333] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
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
            <form onSubmit={handleSubmitOrder} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs">
                    {formError}
                  </div>
                )}

                <div className="flex items-center justify-between pb-3 border-b border-[#E8E8E8]">
                  <span className="text-xs tracking-[0.2em] uppercase text-[#666] font-medium">
                    Customer Information
                  </span>
                  {isAuthenticated ? (
                    <span className="text-[10px] bg-green-50 text-green-700 font-semibold px-2 py-0.5 rounded">
                      Profile linked
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#666]">Guest order</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1.5 font-medium text-[#444]">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleInputChange}
                    placeholder="e.g. Rayan Taleb"
                    required
                    className="w-full border border-[#CCC] px-3 py-2.5 text-xs focus:outline-none focus:border-[#0A0A0A] bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-1.5 font-medium text-[#444]">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="customerPhone"
                      value={formData.customerPhone}
                      onChange={handleInputChange}
                      placeholder="0550 12 34 56"
                      required
                      className="w-full border border-[#CCC] px-3 py-2.5 text-xs focus:outline-none focus:border-[#0A0A0A] bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-1.5 font-medium text-[#444]">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      name="customerEmail"
                      value={formData.customerEmail}
                      onChange={handleInputChange}
                      placeholder="you@email.com"
                      className="w-full border border-[#CCC] px-3 py-2.5 text-xs focus:outline-none focus:border-[#0A0A0A] bg-white"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs uppercase tracking-wider mb-1.5 font-medium text-[#444]">
                    Wilaya *
                  </label>
                  <select
                    name="wilaya"
                    value={formData.wilaya}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-[#CCC] px-3 py-2.5 text-xs focus:outline-none focus:border-[#0A0A0A] bg-white"
                  >
                    {ALGERIA_WILAYAS.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1.5 font-medium text-[#444]">
                    Commune / City *
                  </label>
                  <input
                    type="text"
                    name="commune"
                    value={formData.commune}
                    onChange={handleInputChange}
                    placeholder="e.g. Bab Ezzouar, Hydra, Es Senia..."
                    required
                    className="w-full border border-[#CCC] px-3 py-2.5 text-xs focus:outline-none focus:border-[#0A0A0A] bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1.5 font-medium text-[#444]">
                    Delivery Address *
                  </label>
                  <textarea
                    name="shippingAddress"
                    rows={2}
                    value={formData.shippingAddress}
                    onChange={handleInputChange}
                    placeholder="Street name, building number, floor or landmarks..."
                    required
                    className="w-full border border-[#CCC] px-3 py-2.5 text-xs focus:outline-none focus:border-[#0A0A0A] bg-white resize-none"
                  />
                </div>

                {/* Delivery Option */}
                <div className="pt-2">
                  <span className="block text-xs uppercase tracking-wider mb-2 font-medium text-[#444]">
                    Delivery Method
                  </span>
                  <div className="space-y-2">
                    <label className={`flex items-center justify-between p-3 border text-xs cursor-pointer transition-colors ${
                      formData.deliveryMethod === 'home' ? 'border-[#0A0A0A] bg-[#F7F6F2]' : 'border-[#E8E8E8]'
                    }`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="deliveryMethod"
                          value="home"
                          checked={formData.deliveryMethod === 'home'}
                          onChange={handleInputChange}
                          className="accent-[#0A0A0A]"
                        />
                        <div>
                          <p className="font-semibold">Home Delivery (À domicile)</p>
                          <p className="text-[11px] text-[#666]">Delivered to your door</p>
                        </div>
                      </div>
                      <span className="font-semibold">
                        {formatPrice(isAlgiers ? 500 : 800)}
                      </span>
                    </label>

                    <label className={`flex items-center justify-between p-3 border text-xs cursor-pointer transition-colors ${
                      formData.deliveryMethod === 'desk' ? 'border-[#0A0A0A] bg-[#F7F6F2]' : 'border-[#E8E8E8]'
                    }`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="deliveryMethod"
                          value="desk"
                          checked={formData.deliveryMethod === 'desk'}
                          onChange={handleInputChange}
                          className="accent-[#0A0A0A]"
                        />
                        <div>
                          <p className="font-semibold">Desk Collection (Point Relais / Bureau)</p>
                          <p className="text-[11px] text-[#666]">Pickup from nearest agency</p>
                        </div>
                      </div>
                      <span className="font-semibold">
                        {formatPrice(isAlgiers ? 350 : 500)}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="p-3 bg-[#F0F0F0] text-xs text-[#555] flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#0A0A0A] shrink-0" />
                  <span>Paiement à la livraison — Pay in cash upon receipt.</span>
                </div>
              </div>

              {/* Order Finalization Footer */}
              <div className="border-t border-[#E8E8E8] p-6 bg-[#F7F6F2] space-y-3">
                <div className="flex justify-between text-xs text-[#666]">
                  <span>Items ({cartCount})</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-[#666]">
                  <span>Shipping Fee</span>
                  <span>{formatPrice(shippingFee)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t border-[#E8E8E8] pt-2">
                  <span>Total Due</span>
                  <span className="text-base text-[#0A0A0A]">{formatPrice(totalOrderPrice)}</span>
                </div>

                <button
                  type="submit"
                  disabled={checkoutLoading}
                  className="w-full bg-[#0A0A0A] text-white py-4 text-xs tracking-[0.2em] uppercase font-medium hover:bg-[#333333] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-70 mt-2"
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Confirming Order…</span>
                    </>
                  ) : (
                    <span>Confirm Order • {formatPrice(totalOrderPrice)}</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* CONTENT: SUCCESS RECEIPT VIEW */}
          {drawerMode === 'success' && placedOrder && (
            <div className="flex-1 flex flex-col p-8 overflow-y-auto text-center justify-between">
              <div className="py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="font-serif-display text-2xl font-normal mb-2">
                  Merci pour votre commande
                </h3>
                <p className="text-xs text-[#666] tracking-widest uppercase mb-6">
                  Order #{placedOrder._id?.slice(-6).toUpperCase()}
                </p>

                <div className="bg-[#F7F6F2] p-4 text-left text-xs space-y-2 border border-[#E8E8E8] mb-6">
                  <div className="flex justify-between">
                    <span className="text-[#666]">Client:</span>
                    <span className="font-semibold">{placedOrder.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#666]">Téléphone:</span>
                    <span className="font-semibold">{placedOrder.customerPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#666]">Wilaya:</span>
                    <span className="font-semibold">{placedOrder.wilaya}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#666]">Commune:</span>
                    <span className="font-semibold">{placedOrder.commune}</span>
                  </div>
                  <div className="flex justify-between border-t border-[#E8E8E8] pt-2">
                    <span className="text-[#666]">Total à payer:</span>
                    <span className="font-bold text-sm text-[#0A0A0A]">{formatPrice(placedOrder.totalPrice)}</span>
                  </div>
                </div>

                <p className="text-xs text-[#666] leading-relaxed">
                  Notre équipe va vous contacter par téléphone pour confirmer la livraison de votre colis.
                </p>
              </div>

              <button
                onClick={closeBag}
                className="w-full bg-[#0A0A0A] text-white py-4 text-xs tracking-[0.2em] uppercase font-medium hover:bg-[#333333] transition-colors cursor-pointer"
              >
                Continuer mes achats
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
