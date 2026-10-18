import { useState, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Header from './components/Header';
import Hero from './components/Hero';
import CategoryCards from './components/CategoryCards';
import CollectionSection from './components/CollectionSection';
import LocationSection from './components/LocationSection';
import ContactSection from './components/ContactSection';
import Footer from './components/Footer';
import AuthPage from './pages/AuthPage';
import AdminDashboard from './pages/AdminDashboard';
import ShoppingBagDrawer from './components/cart/ShoppingBagDrawer';
import ProductDetailModal from './components/catalog/ProductDetailModal';
import OrdersModal from './components/orders/OrdersModal';
import ProfileModal from './components/profile/ProfileModal';
import { useToast } from './components/ui/useToast';
import { products } from './data/products';

function AppShell() {
  const { isAuthenticated, isAdmin } = useAuth();

  // Active page: 'shop' | 'auth' | 'admin'
  const [currentPage, setCurrentPage] = useState('shop');
  const [authInitialView, setAuthInitialView] = useState('signin'); // 'signin' | 'signup'

  // Modal states
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [ordersModalOpen, setOrdersModalOpen] = useState(false);
  const [isAdminOrders, setIsAdminOrders] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Global Toast
  const { showToast, ToastContainer } = useToast();

  // Filtered collections
  const newArrivals = products.filter((p) => p.collection === 'new-arrivals');
  const menProducts = products.filter((p) => p.collection === 'men');
  const womenProducts = products.filter((p) => p.collection === 'women');
  const kidsProducts = products.filter((p) => p.collection === 'kids');

  const handleOpenAuthPage = (view = 'signin') => {
    setAuthInitialView(view);
    setCurrentPage('auth');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenOrders = () => {
    if (!isAuthenticated) {
      handleOpenAuthPage('signin');
      return;
    }
    setIsAdminOrders(false);
    setOrdersModalOpen(true);
  };

  const handleOpenAdminOrders = () => {
    if (!isAuthenticated) {
      handleOpenAuthPage('signin');
      return;
    }
    setIsAdminOrders(true);
    setOrdersModalOpen(true);
  };

  const handleOpenProfile = () => {
    if (!isAuthenticated) {
      handleOpenAuthPage('signin');
      return;
    }
    setProfileModalOpen(true);
  };

  const handleOrderPlaced = (order) => {
    showToast(`Order #${order._id?.slice(-6).toUpperCase() || ''} confirmed! We will contact you for delivery.`, 'success', 5000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#0A0A0A] font-sans-body antialiased selection:bg-[#0A0A0A] selection:text-white">
      {/* Routed Screen: AuthPage */}
      {currentPage === 'auth' ? (
        <AuthPage
          initialView={authInitialView}
          onNavigate={(page) => setCurrentPage(page)}
          onShowToast={showToast}
        />
      ) : currentPage === 'admin' ? (
        /* Routed Screen: AdminDashboard */
        <AdminDashboard
          onNavigate={(page) => setCurrentPage(page)}
          onShowToast={showToast}
        />
      ) : (
        /* Single-Page Customer Storefront */
        <>
          <Header
            onLoginClick={() => handleOpenAuthPage('signin')}
            onOpenOrders={handleOpenOrders}
            onOpenProfile={handleOpenProfile}
            onOpenAdminDashboard={() => setCurrentPage('admin')}
          />

          <main>
            {/* Section: Home */}
            <Hero />

            {/* Shop by World Category Grid */}
            <CategoryCards />

            {/* Section: New Arrivals */}
            <section id="new-arrivals">
              <CollectionSection
                label="Fresh Perspective"
                title="New arrivals"
                products={newArrivals}
                onProductClick={(p) => setSelectedProduct(p)}
                onShowToast={showToast}
              />
            </section>

            {/* Section: Men */}
            <section id="men" className="bg-[#F7F6F2]">
              <CollectionSection
                label="Collection / 01"
                title="Men's collection"
                description="Clean proportions, practical layers, and everyday pieces with a precise point of view."
                products={menProducts}
                onProductClick={(p) => setSelectedProduct(p)}
                onShowToast={showToast}
              />
            </section>

            {/* Section: Women */}
            <section id="women">
              <CollectionSection
                title="Women's collection"
                description="Fluid tailoring and modern essentials designed for a versatile wardrobe."
                products={womenProducts}
                onProductClick={(p) => setSelectedProduct(p)}
                onShowToast={showToast}
              />
            </section>

            {/* Section: Kids */}
            <section id="kids" className="bg-[#F7F6F2]">
              <CollectionSection
                label="Collection / 03"
                title="Kids' collection"
                description="Comfortable, durable pieces with freedom to move and a refined sense of simplicity."
                products={kidsProducts}
                onProductClick={(p) => setSelectedProduct(p)}
                onShowToast={showToast}
              />
            </section>

            {/* Section: About VÉLOR */}
            <section id="about" className="py-24 lg:py-32 bg-white border-t border-[#E8E8E8]">
              <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                  <div>
                    <p className="text-xs tracking-[0.3em] uppercase text-[#666] mb-4">Maison VÉLOR</p>
                    <h2 className="font-serif-display text-4xl sm:text-5xl lg:text-6xl font-normal mb-8 leading-[1.1]">
                      Crafted for life,<br />defined by nuance.
                    </h2>
                    <p className="text-base text-[#555] leading-relaxed mb-6">
                      VÉLOR is a contemporary fashion house built around the philosophy of quiet luxury and architectural ease. Each garment is engineered from responsibly sourced fibers to deliver tactile refinement and longevity.
                    </p>
                    <p className="text-base text-[#555] leading-relaxed">
                      Conceived as a dedicated portfolio concept, our collections bridge Mediterranean warmth with modern international tailoring, celebrating intentional wardrobe curation for every generation.
                    </p>
                  </div>
                  <div className="aspect-[4/3] bg-[#E8E8E8] overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=900&fit=crop"
                      alt="VÉLOR Studio & Craft"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Location Section */}
            <LocationSection />

            {/* Section: Contact */}
            <ContactSection />
          </main>

          <Footer />
        </>
      )}

      {/* Shopping Bag Drawer (Cart + Algerian Checkout Flow) */}
      <ShoppingBagDrawer
        onOpenAuth={() => handleOpenAuthPage('signin')}
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
        isAdminMode={isAdminOrders}
        onClose={() => setOrdersModalOpen(false)}
      />

      {/* Customer Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onShowToast={showToast}
      />

      {/* Global Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppShell />
      </CartProvider>
    </AuthProvider>
  );
}
