import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ShoppingBag, Plus, Minus, Loader2, Check } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../data/products';
import { getImageUrl } from '../../utils/formatters';

export default function ProductDetailModal({ product, onClose, onShowToast }) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState(product?.sizes?.[0] || 'M');
  const [adding, setAdding] = useState(false);

  // Animation Lifecycle: enter → visible → exit → unmount
  const [visible, setVisible] = useState(false);
  const isClosingRef = useRef(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setVisible(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

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
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleRequestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRequestClose]);

  // Lock background body scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (!product) return null;

  const productId = product._id || product.id;
  const outOfStock = product.stock === 0;
  const maxStock = product.stock || 99;
  const categoryName = typeof product.category === 'object' ? product.category?.name : product.category || 'Collection';
  const sizes = product.sizes || ['XS', 'S', 'M', 'L', 'XL'];
  const colors = product.colors || [];

  const handleAddToCart = async () => {
    if (outOfStock || adding) return;

    setAdding(true);
    try {
      await addToCart(productId, quantity, true, { size: selectedSize, product });
      onShowToast?.(`Added ${quantity} × "${product.name}" (Size ${selectedSize}) to your bag!`);
      handleRequestClose();
    } catch (err) {
      onShowToast?.(err.message || 'Failed to add to bag', 'error');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans-body"
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-[240ms] ease-out cursor-pointer ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleRequestClose}
      />

      {/* Modal Card */}
      <div
        style={{
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className={`relative bg-white rounded-none shadow-2xl w-full max-w-3xl overflow-hidden z-10 flex flex-col md:flex-row max-h-[92vh] border border-[#E8E8E8] transform transition-[transform,opacity] duration-[240ms] ${
          visible
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-[0.98] translate-y-1'
        }`}
      >
        {/* Close button */}
        <button
          onClick={handleRequestClose}
          className="absolute top-4 right-4 z-20 p-2 text-[#0A0A0A] hover:bg-[#F7F6F2] transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Product Image */}
        <div className="md:w-1/2 bg-[#F0F0F0] relative overflow-hidden flex items-center justify-center min-h-[300px] md:min-h-full">
          <img
            src={product.image ? getImageUrl(product.image) : 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=1000&fit=crop'}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=1000&fit=crop';
            }}
          />
          {product.badge && (
            <div className="absolute top-4 left-4 bg-white px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase font-medium">
              {product.badge}
            </div>
          )}
          {outOfStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="bg-[#0A0A0A] text-white text-xs font-bold px-4 py-2 uppercase tracking-widest">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Details & Action */}
        <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-between overflow-y-auto">
          <div>
            <p className="text-[10px] tracking-[0.25em] uppercase text-[#666] mb-2">
              {categoryName} {product.subcategory ? `· ${product.subcategory}` : ''}
            </p>

            <h2 className="font-serif-display text-2xl md:text-3xl font-normal text-[#0A0A0A] mb-3 leading-tight">
              {product.name}
            </h2>

            <p className="text-xl font-medium text-[#0A0A0A] mb-4">
              {formatPrice(product.price)}
            </p>

            {/* Colors */}
            {colors.length > 0 && (
              <div className="mb-4">
                <span className="text-[10px] tracking-[0.2em] uppercase text-[#666] block mb-2 font-medium">
                  Available Shades
                </span>
                <div className="flex items-center gap-2">
                  {colors.map((color, idx) => (
                    <span
                      key={idx}
                      className="w-4 h-4 rounded-full border border-[#CCC]"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] tracking-[0.2em] uppercase text-[#666] font-medium">
                  Select Size
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSize(s)}
                    className={`py-2 px-3 text-xs tracking-wider transition-all border ${
                      selectedSize === s
                        ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white font-medium'
                        : 'border-[#E8E8E8] text-[#555] hover:border-[#0A0A0A]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-[#666] leading-relaxed mb-6">
              {product.description ||
                'Tailored from premium natural fibers with a clean silhouette, subtle drape, and quiet durability suited for effortless daily wear.'}
            </p>
          </div>

          {/* Stepper + Add to Bag */}
          <div className="space-y-4 pt-4 border-t border-[#E8E8E8]">
            {!outOfStock && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#666] uppercase tracking-widest">
                  Quantity
                </span>
                <div className="flex items-center space-x-3 border border-[#E8E8E8] px-3 py-1">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="text-[#666] hover:text-[#0A0A0A] disabled:opacity-30 cursor-pointer"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-medium text-[#0A0A0A] w-6 text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                    disabled={quantity >= maxStock}
                    className="text-[#666] hover:text-[#0A0A0A] disabled:opacity-30 cursor-pointer"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            <button
              id="add-to-bag-modal-btn"
              onClick={handleAddToCart}
              disabled={outOfStock || adding}
              className={`w-full py-4 text-xs tracking-[0.2em] uppercase font-medium flex items-center justify-center gap-2 transition-all cursor-pointer
                ${
                  outOfStock
                    ? 'bg-[#E8E8E8] text-[#999] cursor-not-allowed'
                    : 'bg-[#0A0A0A] text-white hover:bg-[#333333]'
                }`}
            >
              {adding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
              )}
              {adding
                ? 'Adding to Bag…'
                : outOfStock
                ? 'Sold Out'
                : `Add to Bag • ${formatPrice((Number(product.price) || 0) * quantity)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
