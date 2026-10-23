import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Heart, ArrowRight } from 'lucide-react';
import { useFavorites } from '../../context/FavoritesContext';
import ProductCard from '../ProductCard';

export default function FavoritesModal({ isOpen, onClose, onProductClick, onShowToast }) {
  const { favorites, favoritesCount, loading } = useFavorites();

  // Animation Lifecycle: open → enter → visible → exit → unmount (240ms cubic-bezier)
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

  const handleExploreCollections = () => {
    handleRequestClose();
    setTimeout(() => {
      const target = document.querySelector('#new-arrivals') || document.querySelector('#home');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }, 260);
  };

  if (!mounted) return null;

  // Filter out any stale/deleted items safely
  const validFavorites = (favorites || []).filter((item) => item != null && (item._id || item.id));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans-body"
      role="dialog"
      aria-modal="true"
      aria-label="My Favorites"
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
        className={`relative bg-white shadow-2xl w-full max-w-5xl overflow-hidden z-10 flex flex-col max-h-[90vh] border border-[#E8E8E8] transform transition-[transform,opacity] duration-[240ms] ${
          visible
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-[0.98] translate-y-1'
        }`}
      >
        {/* Header */}
        <div className="p-6 md:p-8 bg-[#0A0A0A] text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
              <Heart className="w-5 h-5 fill-white text-white" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[10px] tracking-[0.25em] text-white/50 uppercase font-mono">
                Wardrobe / Curated
              </p>
              <h2 className="font-serif-display text-2xl tracking-[0.12em] font-normal uppercase">
                My Favorites
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-block text-xs uppercase tracking-widest text-white/60 font-mono">
              {favoritesCount === 1 ? '1 saved piece' : `${favoritesCount} saved pieces`}
            </span>
            <button
              onClick={handleRequestClose}
              className="p-2 text-white/70 hover:text-white transition-colors cursor-pointer"
              aria-label="Close favorites"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {loading && validFavorites.length === 0 ? (
            /* Skeleton Loading State matching Phase 3 */
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8">
              {[1, 2, 3].map((n) => (
                <div key={n} className="animate-pulse space-y-3">
                  <div className="aspect-[3/4] bg-[#E8E8E8]" />
                  <div className="h-4 bg-[#E8E8E8] w-3/4" />
                  <div className="h-3 bg-[#E8E8E8] w-1/2" />
                </div>
              ))}
            </div>
          ) : validFavorites.length === 0 ? (
            /* Empty State */
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-[#F7F6F2] border border-[#E8E8E8] flex items-center justify-center text-[#888]">
                <Heart className="w-7 h-7 stroke-1 text-[#888]" />
              </div>

              <div className="space-y-1.5 max-w-sm">
                <h3 className="font-serif-display text-2xl text-[#0A0A0A] font-normal">
                  Your wishlist is empty.
                </h3>
                <p className="text-xs text-[#666] leading-relaxed">
                  Save pieces you love and find them here later.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExploreCollections}
                className="mt-4 px-8 py-3.5 bg-[#0A0A0A] text-white text-xs tracking-[0.2em] uppercase font-medium hover:bg-[#333] transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Explore Collections</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            /* Favorites Product Grid */
            <div>
              <div className="flex items-center justify-between pb-6 mb-6 border-b border-[#E8E8E8]">
                <span className="text-xs uppercase tracking-widest text-[#666] font-mono">
                  {favoritesCount === 1 ? '1 saved piece' : `${favoritesCount} saved pieces`}
                </span>
                <span className="text-[11px] text-[#888]">
                  Click ❤️ to remove from wishlist
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8">
                {validFavorites.map((product, index) => (
                  <ProductCard
                    key={product._id || product.id || index}
                    product={product}
                    index={index}
                    onProductClick={onProductClick}
                    onShowToast={onShowToast}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
