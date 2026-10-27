import { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { FavoritesProvider, useFavorites } from './context/FavoritesContext';
import HomePage from './pages/HomePage';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import Overview from './components/admin/Overview';
import Products from './components/admin/Products';
import Orders from './components/admin/Orders';
import Customers from './components/admin/Customers';
import Categories from './components/admin/Categories';
import Settings from './components/admin/Settings';
import AdminRoute from './components/admin/AdminRoute';
import ShoppingBagDrawer from './components/cart/ShoppingBagDrawer';
import ProductDetailModal from './components/catalog/ProductDetailModal';
import OrdersModal from './components/orders/OrdersModal';
import ProfileModal from './components/profile/ProfileModal';
import FavoritesModal from './components/favorites/FavoritesModal';
import AuthModal from './components/ui/AuthModal';
import { useToast } from './components/ui/useToast';

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
        <Route path="/signin" element={<SignIn onShowToast={showToast} />} />
        <Route path="/register" element={<SignUp onShowToast={showToast} />} />
        {/* Protected Administrative Routes */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Overview />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <AdminRoute>
              <Products />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <AdminRoute>
              <Orders />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/customers"
          element={
            <AdminRoute>
              <Customers />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <AdminRoute>
              <Categories />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <AdminRoute>
              <Settings />
            </AdminRoute>
          }
        />
      </Routes>

      {/* Shopping Bag Drawer (Cart & Algerian Checkout) */}
      <ShoppingBagDrawer
        onOpenAuth={() => openAuthModal()}
        onOrderPlaced={handleOrderPlaced}
      />

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onShowToast={showToast}
        />
      )}

      {/* Customer Orders Modal */}
      <OrdersModal
        isOpen={ordersModalOpen}
        onClose={() => setOrdersModalOpen(false)}
      />

      {/* Customer Favorites / Wishlist Modal */}
      <FavoritesModal
        isOpen={isFavoritesOpen}
        onClose={closeFavorites}
        onProductClick={(p) => setSelectedProduct(p)}
        onShowToast={showToast}
      />

      {/* Customer Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onShowToast={showToast}
        onOpenFavorites={handleOpenFavorites}
        onOpenOrders={handleOpenOrders}
      />

      {/* Quick Auth Modal for Guests */}
      {isAuthModalOpen && (
        <AuthModal
          onClose={closeAuthModal}
          onSuccess={() => {
            showToast('Welcome to VÉLOR!', 'success');
          }}
        />
      )}

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
