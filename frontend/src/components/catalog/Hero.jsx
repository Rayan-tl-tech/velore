import { useAuth } from '../../context/AuthContext';
import { getImageUrl } from '../../utils/formatters';

/**
 * Hero section — dark slate background, premium headline, CTA buttons, and featured product preview.
 */
export default function Hero({ onShopNow, onJoinFree, featuredProduct, onProductClick }) {
  const { isAuthenticated } = useAuth();

  const heroImage = featuredProduct
    ? getImageUrl(featuredProduct.image)
    : 'https://placehold.co/600x600/d1d5db/6b7280?text=Premium+Products';

  return (
    <section className="bg-slate-900 py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left — Text content */}
          <div className="space-y-8">
            <div>
              <p className="text-indigo-400 font-bold tracking-widest uppercase text-xs mb-4">
                Premium Collection
              </p>
              <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-tight tracking-tight">
                Discover products
                <br />
                <span className="text-indigo-400">you'll love.</span>
              </h1>
            </div>
            <p className="text-base sm:text-lg text-gray-400 max-w-lg leading-relaxed">
              Curated selection of premium goods across every category. Designed for quality, performance, and everyday elegance.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={onShopNow}
                className="px-8 py-3.5 bg-indigo-600 text-white font-semibold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/30 active:scale-95 text-sm"
              >
                Shop Catalog
              </button>

              {!isAuthenticated ? (
                <button
                  onClick={onJoinFree}
                  className="px-8 py-3.5 border border-gray-700 text-white font-semibold rounded-2xl hover:bg-gray-800 transition-colors text-sm"
                >
                  Join Free
                </button>
              ) : (
                <button
                  onClick={onShopNow}
                  className="px-8 py-3.5 border border-indigo-500/30 text-indigo-300 font-semibold rounded-2xl hover:bg-indigo-950/40 transition-colors text-sm"
                >
                  Browse Deals
                </button>
              )}
            </div>
          </div>

          {/* Right — Featured Product Visual */}
          <div className="hidden lg:block">
            <div
              onClick={() => featuredProduct && onProductClick?.(featuredProduct)}
              className="bg-slate-800/80 border border-slate-700/60 rounded-3xl p-6 aspect-square flex flex-col justify-between shadow-2xl hover:border-indigo-500/50 transition-all duration-300 cursor-pointer group"
            >
              <div className="w-full h-[80%] rounded-2xl overflow-hidden bg-slate-900/50 flex items-center justify-center">
                <img
                  src={heroImage}
                  alt={featuredProduct?.name ?? 'Premium Product'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    e.currentTarget.src =
                      'https://placehold.co/600x600/d1d5db/6b7280?text=Premium+Products';
                  }}
                />
              </div>

              {featuredProduct && (
                <div className="pt-4 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-indigo-400 block">
                      {featuredProduct.category?.name || 'Featured'}
                    </span>
                    <span className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {featuredProduct.name}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-gray-300 bg-slate-700/70 px-2.5 py-1 rounded-lg">
                    View Details
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
