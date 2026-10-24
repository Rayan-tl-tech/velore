import { useState, useEffect } from 'react';
import { Heart, ShoppingBag, Check } from 'lucide-react';
import { formatPrice } from '../data/products';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';

export default function ProductCard({ product, index = 0, onProductClick, onShowToast }) {
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);
  const [addedRecently, setAddedRecently] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [heartBump, setHeartBump] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();

  const productId = product._id || product.id;
  const sizes = product.sizes || ['XS', 'S', 'M', 'L', 'XL'];
  const categoryLabel = typeof product.category === 'object' ? product.category?.name : product.category;
  const subcategory = product.subcategory || 'Collection';

  const handleQuickAdd = async (e, size) => {
    e.stopPropagation();
    setSelectedSize(size);
    try {
      await addToCart(productId, 1, true, { size, product });
      setAddedRecently(true);
      if (onShowToast) {
        onShowToast(`Added "${product.name}" (Size ${size}) to your bag!`);
      }
      setTimeout(() => setAddedRecently(false), 2000);
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Could not add to bag', 'error');
    }
  };

  const staggerDelay = `${Math.min(index, 7) * 40}ms`;

  return (
    <div
      id={`product-card-${product.name?.toLowerCase().replace(/\s+/g, '-')}`}
      style={{
        transitionDelay: staggerDelay,
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className={`group cursor-pointer transform transition-[transform,opacity] duration-[400ms] ${
        mounted ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
      onClick={() => onProductClick?.(product)}
    >
      <div
        className="relative aspect-[3/4] overflow-hidden bg-[#F0F0F0]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img
          src={product.image}
          alt={product.name}
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=1000&fit=crop';
            setImageLoaded(true);
          }}
        />


        <button
          type="button"
          onClick={async (e) => {
            e.stopPropagation();
            setHeartBump(true);
            setTimeout(() => setHeartBump(false), 180);
            await toggleFavorite(product, onShowToast);
          }}
          className={`absolute top-4 right-4 w-9 h-9 bg-white rounded-full flex items-center justify-center hover:bg-[#F7F6F2] transition-colors shadow-sm transform transition-transform duration-[180ms] ease-out motion-reduce:transition-none cursor-pointer ${
            heartBump ? 'scale-[1.08]' : 'scale-100'
          }`}
          aria-label={isFavorite(productId) ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart
            size={16}
            strokeWidth={1.5}
            className={`transition-colors duration-150 ${
              isFavorite(productId) ? 'fill-[#0A0A0A] text-[#0A0A0A]' : 'text-[#0A0A0A]'
            }`}
          />
        </button>

        {/* Hover Sizes Drawer */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm p-4 transition-all duration-300 ${
            isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          <p className="text-[10px] tracking-[0.2em] uppercase mb-2 font-medium text-[#666]">
            {addedRecently ? '✓ Added to bag' : 'Select Size to Add'}
          </p>
          <div className="flex items-center justify-between gap-1">
            {sizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={(e) => handleQuickAdd(e, size)}
                className={`text-xs tracking-wide py-1 px-2 transition-all font-medium rounded ${
                  selectedSize === size && addedRecently
                    ? 'bg-[#0A0A0A] text-white'
                    : 'text-[#444] hover:bg-[#0A0A0A] hover:text-white'
                }`}
                title={`Add size ${size} to bag`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-4">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h3 className="text-sm font-medium leading-tight group-hover:text-[#666] transition-colors">{product.name}</h3>
          <p className="text-sm font-medium whitespace-nowrap">{formatPrice(product.price)}</p>
        </div>
        <p className="text-xs text-[#666] mb-3">
          {categoryLabel} · {subcategory}
        </p>

        {product.colors && product.colors.length > 0 && (
          <div className="flex items-center gap-2">
            {product.colors.map((color, idx) => (
              <span
                key={idx}
                className="w-3 h-3 rounded-full border border-[#E8E8E8]"
                style={{ backgroundColor: color }}
                aria-label={`Color option ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
