import { useState } from 'react';
import { ShoppingBag, Loader2, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { getImageUrl, formatPrice } from '../../utils/formatters';

/**
 * ProductCard — displays a single product with quick-view and Add to Bag functionality.
 */
export default function ProductCard({
  product,
  onAddedToCart,
  onLoginRequired,
  onProductClick,
}) {
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [adding, setAdding] = useState(false);

  const categoryName = product.category?.name ?? 'General Collection';
  const imageUrl = getImageUrl(product.image);
  const outOfStock = product.stock === 0;

  const handleAddToCart = async (e) => {
    e.stopPropagation(); // Prevent opening product modal
    if (!isAuthenticated) {
      onLoginRequired?.();
      return;
    }
    if (outOfStock || adding) return;
    setAdding(true);
    try {
      await addToCart(product._id, 1, true); // true opens the bag drawer
      onAddedToCart?.(`"${product.name}" added to bag!`);
    } catch (err) {
      onAddedToCart?.(err.message || 'Failed to add to bag', 'error');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div
      onClick={() => onProductClick?.(product)}
      className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer group border border-gray-100"
    >
      {/* Product Image */}
      <div className="aspect-square overflow-hidden bg-gray-100 relative">
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.currentTarget.src =
              'https://placehold.co/400x400/e5e7eb/9ca3af?text=No+Image';
          }}
        />

        {/* Quick view hover pill */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="bg-white/90 backdrop-blur-md text-gray-900 text-xs font-semibold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> Quick View
          </span>
        </div>

        {outOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-5 flex flex-col flex-1 justify-between">
        <div>
          {/* Category Badge */}
          <div className="mb-2.5">
            <span className="inline-block px-2.5 py-0.5 bg-indigo-50 text-indigo-600 text-[11px] font-semibold rounded-full">
              {categoryName}
            </span>
          </div>

          {/* Name */}
          <h3 className="text-base font-bold text-gray-900 mb-1.5 line-clamp-2 group-hover:text-indigo-600 transition-colors">
            {product.name}
          </h3>

          {/* Stock Status */}
          <p
            className={`text-xs font-medium mb-4 ${
              outOfStock ? 'text-red-500' : 'text-green-600'
            }`}
          >
            {outOfStock ? 'Out of Stock' : `In Stock: ${product.stock}`}
          </p>
        </div>

        {/* Price + Add to Bag */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
          <span className="text-xl font-extrabold text-gray-900">
            ${formatPrice(product.price)}
          </span>
          <button
            onClick={handleAddToCart}
            disabled={outOfStock || adding}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold text-xs transition-all active:scale-95
              ${
                outOfStock
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20'
              }`}
          >
            {adding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ShoppingBag className="w-3.5 h-3.5" strokeWidth={2} />
            )}
            {adding ? 'Adding…' : 'Add to Bag'}
          </button>
        </div>
      </div>
    </div>
  );
}
