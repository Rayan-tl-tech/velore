import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  getCart as getCartApi,
  addToCart as addToCartApi,
  updateCartItem as updateCartItemApi,
  removeFromCart as removeFromCartApi,
  clearCart as clearCartApi,
} from '../services/api/cartService';
import { createOrder as createOrderApi } from '../services/api/orderService';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);
const GUEST_CART_KEY = 'velor_guest_cart';

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [backendCart, setBackendCart] = useState(null);
  const [guestCart, setGuestCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isBagOpen, setIsBagOpen] = useState(false);

  // Load guest cart from localStorage on initial render
  useEffect(() => {
    try {
      const stored = localStorage.getItem(GUEST_CART_KEY);
      if (stored) {
        setGuestCart(JSON.parse(stored));
      }
    } catch {
      localStorage.removeItem(GUEST_CART_KEY);
      setGuestCart([]);
    }
  }, []);

  // Save guest cart to localStorage
  const saveGuestCart = useCallback((newItems) => {
    setGuestCart(newItems);
    try {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(newItems));
    } catch {
      // ignore storage quota issues
    }
  }, []);

  // Refresh cart from backend
  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) return null;
    try {
      setLoading(true);
      const data = await getCartApi();
      setBackendCart(data);
      return data;
    } catch {
      setBackendCart(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Merge guest cart into backend cart upon signing in
  useEffect(() => {
    if (isAuthenticated) {
      const mergeGuestItems = async () => {
        try {
          const stored = localStorage.getItem(GUEST_CART_KEY);
          const localItems = stored ? JSON.parse(stored) : [];
          if (localItems.length > 0) {
            for (const item of localItems) {
              const pId = item.product?._id || item.product?.id;
              if (pId) {
                await addToCartApi(pId, item.quantity || 1, item.size || 'M').catch(() => {});
              }
            }
            localStorage.removeItem(GUEST_CART_KEY);
            setGuestCart([]);
          }
        } catch (e) {
          console.error('Failed to merge guest cart:', e);
        }
        await refreshCart();
      };
      mergeGuestItems();
    } else {
      setBackendCart(null);
    }
  }, [isAuthenticated, refreshCart]);

  // Normalized items list
  const items = useMemo(() => {
    if (isAuthenticated) {
      if (!backendCart?.items) return [];
      return backendCart.items.filter((item) => item?.product != null);
    }
    return guestCart.filter((item) => item?.product != null);
  }, [isAuthenticated, backendCart, guestCart]);

  // Total item count in bag
  const cartCount = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }, [items]);

  // Monetary subtotal
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const price = Number(item.product?.price) || 0;
      const qty = Number(item.quantity) || 0;
      return sum + price * qty;
    }, 0);
  }, [items]);

  // Drawer controls
  const openBag = useCallback(() => setIsBagOpen(true), []);
  const closeBag = useCallback(() => setIsBagOpen(false), []);
  const toggleBag = useCallback(() => setIsBagOpen((prev) => !prev), []);

  // Add product to cart (works for both Guests and Authenticated users)
  const addToCart = useCallback(
    async (productId, quantity = 1, openDrawer = false, options = {}) => {
      const qty = Math.max(1, parseInt(quantity, 10) || 1);
      const size = String(options.size || 'M').trim();
      const productObj = options.product || null;

      if (isAuthenticated) {
        setLoading(true);
        try {
          const updated = await addToCartApi(productId, qty, size, productObj?.name || '');
          setBackendCart(updated);
          if (openDrawer) setIsBagOpen(true);
          return updated;
        } finally {
          setLoading(false);
        }
      } else {
        // Guest Cart in LocalStorage
        const current = [...guestCart];
        const matchIdx = current.findIndex(
          (it) =>
            (it.product?._id === productId || it.product?.id === productId) &&
            (it.size || 'M') === size
        );

        if (matchIdx > -1) {
          current[matchIdx].quantity += qty;
        } else {
          current.push({
            product: productObj || {
              _id: productId,
              name: 'VÉLOR Piece',
              price: 6900,
              image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=1000&fit=crop',
            },
            quantity: qty,
            size,
          });
        }
        saveGuestCart(current);
        if (openDrawer) setIsBagOpen(true);
        return current;
      }
    },
    [isAuthenticated, guestCart, saveGuestCart]
  );

  // Update item quantity
  const updateQuantity = useCallback(
    async (productId, newQuantity, size = 'M') => {
      const qty = Math.max(1, parseInt(newQuantity, 10) || 1);
      if (isAuthenticated) {
        setLoading(true);
        try {
          const updated = await updateCartItemApi(productId, qty, size);
          setBackendCart(updated);
          return updated;
        } finally {
          setLoading(false);
        }
      } else {
        const updated = guestCart.map((it) => {
          if (
            (it.product?._id === productId || it.product?.id === productId) &&
            (it.size || 'M') === (size || 'M')
          ) {
            return { ...it, quantity: qty };
          }
          return it;
        });
        saveGuestCart(updated);
        return updated;
      }
    },
    [isAuthenticated, guestCart, saveGuestCart]
  );

  // Remove item from cart
  const removeFromCart = useCallback(
    async (productId, size = 'M') => {
      if (isAuthenticated) {
        setLoading(true);
        try {
          const res = await removeFromCartApi(productId, size);
          const updated = res.cart || res;
          setBackendCart(updated);
          return updated;
        } finally {
          setLoading(false);
        }
      } else {
        const updated = guestCart.filter(
          (it) =>
            !(
              (it.product?._id === productId || it.product?.id === productId) &&
              (it.size || 'M') === (size || 'M')
            )
        );
        saveGuestCart(updated);
        return updated;
      }
    },
    [isAuthenticated, guestCart, saveGuestCart]
  );

  // Checkout (creates authoritative order on server)
  const checkout = useCallback(
    async (checkoutDetails = {}) => {
      setLoading(true);
      try {
        const payload = {
          ...checkoutDetails,
          items: items.map((it) => ({
            productId: it.product?._id || it.product?.id,
            quantity: it.quantity,
            size: it.size || 'M',
          })),
        };

        const order = await createOrderApi(payload);

        // Clear carts in both local state and backend/storage
        if (isAuthenticated) {
          setBackendCart({ items: [] });
          await clearCartApi().catch(() => {});
        } else {
          saveGuestCart([]);
          try {
            localStorage.removeItem(GUEST_CART_KEY);
          } catch {}
        }

        window.dispatchEvent(new CustomEvent('order:created', { detail: order }));
        return order;
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, items, saveGuestCart]
  );

  return (
    <CartContext.Provider
      value={{
        cart: isAuthenticated ? backendCart : { items: guestCart },
        items,
        cartCount,
        subtotal,
        loading,
        isBagOpen,
        openBag,
        closeBag,
        toggleBag,
        refreshCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        checkout,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
