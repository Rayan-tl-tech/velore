import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getFavorites as getFavoritesApi, addFavorite as addFavoriteApi, removeFavorite as removeFavoriteApi } from '../services/api/userService';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children, onShowToast }) {
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Modal open/close controls
  const openFavorites = useCallback(() => setIsFavoritesOpen(true), []);
  const closeFavorites = useCallback(() => setIsFavoritesOpen(false), []);
  const toggleFavorites = useCallback(() => setIsFavoritesOpen((prev) => !prev), []);

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  // Fetch favorites from backend when user is authenticated
  const refreshFavorites = useCallback(async () => {
    if (!isAuthenticated) {
      setFavorites([]);
      return [];
    }

    setLoading(true);
    try {
      const data = await getFavoritesApi();
      const list = Array.isArray(data) ? data : data?.favorites || [];
      // Sanitize: filter out any deleted/null products
      const valid = list.filter((item) => item != null && (item._id || item.id));
      setFavorites(valid);
      return valid;
    } catch (err) {
      console.error('Failed to load favorites from backend:', err);
      // Keep existing state or reset if session invalid
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Sync on authentication changes (initial mount, login, logout)
  useEffect(() => {
    if (isAuthenticated) {
      refreshFavorites();
    } else {
      setFavorites([]);
    }
  }, [isAuthenticated, refreshFavorites]);

  // Set of favorite product IDs for O(1) membership check
  const favoriteIds = useMemo(() => {
    const ids = new Set();
    favorites.forEach((p) => {
      const id = p?._id || p?.id;
      if (id) ids.add(String(id));
    });
    return ids;
  }, [favorites]);

  const isFavorite = useCallback(
    (productId) => {
      if (!productId) return false;
      return favoriteIds.has(String(productId));
    },
    [favoriteIds]
  );

  /**
   * Toggle favorite state for a product.
   * If unauthenticated, displays toast and opens AuthModal.
   * If authenticated, performs optimistic update with automatic rollback on error.
   */
  const toggleFavorite = useCallback(
    async (product, customToast) => {
      const notify = customToast || onShowToast;
      const rawId = product?._id || product?.id;
      if (!rawId) return false;
      const productId = String(rawId);

      if (!isAuthenticated) {
        if (notify) {
          notify('Sign in to save your favorites.', 'info');
        }
        setIsAuthModalOpen(true);
        return false;
      }

      const currentlyLiked = favoriteIds.has(productId);
      const previousFavorites = [...favorites];

      // Optimistic update
      if (currentlyLiked) {
        setFavorites((prev) => prev.filter((p) => String(p._id || p.id) !== productId));
      } else {
        setFavorites((prev) => [product, ...prev]);
      }

      try {
        if (currentlyLiked) {
          const res = await removeFavoriteApi(productId);
          const serverList = Array.isArray(res) ? res : res?.favorites;
          if (Array.isArray(serverList)) {
            setFavorites(serverList.filter((p) => p != null && (p._id || p.id)));
          }
          if (notify) {
            notify(`Removed "${product.name || 'piece'}" from your wishlist.`, 'info');
          }
          return false;
        } else {
          const res = await addFavoriteApi(productId);
          const serverList = Array.isArray(res) ? res : res?.favorites;
          if (Array.isArray(serverList)) {
            setFavorites(serverList.filter((p) => p != null && (p._id || p.id)));
          }
          if (notify) {
            notify(`Saved "${product.name || 'piece'}" to your wishlist!`, 'success');
          }
          return true;
        }
      } catch (err) {
        // Rollback state on failure
        setFavorites(previousFavorites);
        if (notify) {
          notify(err.message || 'Could not update favorites. Please try again.', 'error');
        }
        return currentlyLiked;
      }
    },
    [isAuthenticated, favoriteIds, favorites, onShowToast]
  );

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        favoriteIds,
        favoritesCount: favorites.length,
        loading,
        isFavorite,
        toggleFavorite,
        refreshFavorites,
        isFavoritesOpen,
        openFavorites,
        closeFavorites,
        toggleFavorites,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used inside FavoritesProvider');
  return ctx;
}
