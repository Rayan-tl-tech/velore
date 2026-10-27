import { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { FavoritesProvider, useFavorites } from './context/FavoritesContext';
import HomePage from './pages/HomePage';
import AdminRoute from './components/admin/AdminRoute';
import ShoppingBagDrawer from './components/cart/ShoppingBagDrawer';
import { useToast } from './components/ui/useToast';

// Code-split administrative routes (Implementation A)
const Overview = lazy(() => import('./components/admin/Overview'));
const Products = lazy(() => import('./components/admin/Products'));
const Orders = lazy(() => import('./components/admin/Orders'));
const Customers = lazy(() => import('./components/admin/Customers'));
const Categories = lazy(() => import('./components/admin/Categories'));
const Settings = lazy(() => import('./components/admin/Settings'));

// Code-split authentication pages (Implementation C)
const SignIn = lazy(() => import('./components/SignIn'));
const SignUp = lazy(() => import('./components/SignUp'));

// Code-split secondary customer modals (Implementations B & D)
const ProductDetailModal = lazy(() => import('./components/catalog/ProductDetailModal'));
const OrdersModal = lazy(() => import('./components/orders/OrdersModal'));
const ProfileModal = lazy(() => import('./components/profile/ProfileModal'));
const FavoritesModal = lazy(() => import('./components/favorites/FavoritesModal'));
const AuthModal = lazy(() => import('./components/ui/AuthModal'));

/**
 * Minimalist dark fallback for administrative routes, matching AdminRoute's loading UI.
 */
function AdminLoadingFallback() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-white">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
      <p className="text-xs tracking-[0.2em] uppercase text-white/60">Loading console...</p>
    </div>
  );
}

/**
 * Minimalist light fallback for standalone pages (Sign In / Sign Up).
 */
function PageLoadingFallback() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#0A0A0A]/20 border-t-[#0A0A0A] rounded-full animate-spin mb-4" />
      <p className="text-xs tracking-[0.2em] uppercase text-[#666]">Loading...</p>
    </div>
  );
}

function MainLayout() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const {
    isFavoritesOpen,
    openFavorites,
    closeFavorites,
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,
  } = useFavorites();

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [ordersModalOpen, setOrdersModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const handleOpenOrders = () => {
    if (!isAuthenticated) {
      openAuthModal();
      showToast('Sign in to view your order history.', 'info');
      return;
    }
    setOrdersModalOpen(true);
  };

  const handleOpenProfile = () => {
    if (!isAuthenticated) {
      openAuthModal();
      showToast('Sign in to view your profile.', 'info');
      return;
    }
    setProfileModalOpen(true);
  };

  const handleOpenFavorites = () => {
    if (!isAuthenticated) {
      openAuthModal();
      showToast('Sign in to save your favorites.', 'info');
      return;
    }
    openFavorites();
  };

  const handleOrderPlaced = (order) => {
    showToast(
      `Order #${order._id?.slice(-6).toUpperCase() || ''} confirmed! We will contact you for delivery.`,
      'success',
      5000
    );
  };

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              onProductClick={(p) => setSelectedProduct(p)}
              onOpenOrders={handleOpenOrders}
              onOpenFavorites={handleOpenFavorites}
              onOpenProfile={handleOpenProfile}
              onShowToast={showToast}
            />
          }
        />
        <Route
          path="/signin"
          element={
            <Suspense fallback={<PageLoadingFallback />}>
              <SignIn onShowToast={showToast} />
            </Suspense>
          }
        />
        <Route
          path="/register"
          element={
            <Suspense fallback={<PageLoadingFallback />}>
              <SignUp onShowToast={showToast} />
            </Suspense>
          }
        />
        {/* Protected Administrative Routes (Code-split) */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Suspense fallback={<AdminLoadingFallback />}>
                <Overview />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <AdminRoute>
              <Suspense fallback={<AdminLoadingFallback />}>
                <Products />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <AdminRoute>
              <Suspense fallback={<AdminLoadingFallback />}>
                <Orders />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/customers"
          element={
            <AdminRoute>
              <Suspense fallback={<AdminLoadingFallback />}>
                <Customers />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <AdminRoute>
              <Suspense fallback={<AdminLoadingFallback />}>
                <Categories />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <AdminRoute>
              <Suspense fallback={<AdminLoadingFallback />}>
                <Settings />
              </Suspense>
            </AdminRoute>
          }
        />
      </Routes>

      {/* Shopping Bag Drawer (Cart & Algerian Checkout - Kept eager for instantaneous interaction) */}
      <ShoppingBagDrawer
        onOpenAuth={() => openAuthModal()}
        onOrderPlaced={handleOrderPlaced}
      />

      {/* Secondary Customer Modals (Lazy Loaded) */}
      <Suspense fallback={null}>
        {selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onShowToast={showToast}
          />
        )}

        <OrdersModal
          isOpen={ordersModalOpen}
          onClose={() => setOrdersModalOpen(false)}
        />

        <FavoritesModal
          isOpen={isFavoritesOpen}
          onClose={closeFavorites}
          onProductClick={(p) => setSelectedProduct(p)}
          onShowToast={showToast}
        />

        <ProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          onShowToast={showToast}
          onOpenFavorites={handleOpenFavorites}
          onOpenOrders={handleOpenOrders}
        />

        {isAuthModalOpen && (
          <AuthModal
            onClose={closeAuthModal}
            onSuccess={() => {
              showToast('Welcome to VÉLOR!', 'success');
            }}
          />
        )}
      </Suspense>

      {/* Global Toast Container */}
      <ToastContainer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FavoritesProvider>
          <CartProvider>
            <MainLayout />
          </CartProvider>
        </FavoritesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
