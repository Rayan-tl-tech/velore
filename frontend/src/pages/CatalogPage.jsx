import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { getAllProducts, searchProducts } from '../services/api/productService';
import { getAllCategories } from '../services/api/categoryService';
import Hero from '../components/catalog/Hero';
import SearchFilter from '../components/catalog/SearchFilter';
import ProductGrid from '../components/catalog/ProductGrid';
import ProductDetailModal from '../components/catalog/ProductDetailModal';
import { useToast } from '../components/ui/useToast';
import AuthModal from '../components/ui/AuthModal';

const CatalogPage = forwardRef(function CatalogPage(
  { onOpenAuth, onShowToast: externalToast },
  ref
) {
  // Data
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | category._id

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Toast
  const { showToast, ToastContainer } = useToast();

  const handleToast = useCallback(
    (msg, type = 'success') => {
      if (externalToast) externalToast(msg, type);
      else showToast(msg, type);
    },
    [externalToast, showToast]
  );

  // Ref for scrolling to catalog
  const catalogRef = useRef(null);

  const scrollToCatalog = useCallback(() => {
    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const resetFiltersAndScroll = useCallback(() => {
    setActiveCategory('all');
    setSearchQuery('');
    getAllProducts().then(setProducts).catch(() => {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Expose methods to parent
  useImperativeHandle(
    ref,
    () => ({
      scrollToCatalog,
      resetFiltersAndScroll,
    }),
    [scrollToCatalog, resetFiltersAndScroll]
  );

  // Fetch categories once on mount
  useEffect(() => {
    getAllCategories()
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]))
      .finally(() => setLoadingCategories(false));
  }, []);

  // Fetch all products on mount
  useEffect(() => {
    setLoadingProducts(true);
    setFetchError('');
    getAllProducts()
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch((err) => {
        setProducts([]);
        setFetchError(err.message || 'Unable to connect to backend server');
      })
      .finally(() => setLoadingProducts(false));
  }, []);

  // Refresh products and stock when an order is completed
  useEffect(() => {
    const handleOrderCreated = () => {
      getAllProducts()
        .then((data) => setProducts(Array.isArray(data) ? data : []))
        .catch(() => {});
    };
    window.addEventListener('order:created', handleOrderCreated);
    return () => window.removeEventListener('order:created', handleOrderCreated);
  }, []);

  // Search handler — hits /api/products/search?keyword=...
  const handleSearch = useCallback(async () => {
    const kw = searchQuery.trim();
    setLoadingProducts(true);
    setFetchError('');
    setActiveCategory('all'); // Reset category filter on search
    try {
      const results = kw ? await searchProducts(kw) : await getAllProducts();
      setProducts(Array.isArray(results) ? results : []);
    } catch (err) {
      setProducts([]);
      setFetchError(err.message || 'Search failed');
    } finally {
      setLoadingProducts(false);
    }
  }, [searchQuery]);

  // Client-side category filtering on already-loaded products
  const safeProducts = Array.isArray(products) ? products : [];
  const safeCategories = Array.isArray(categories) ? categories : [];

  const filteredProducts =
    activeCategory === 'all'
      ? safeProducts
      : safeProducts.filter((p) => (p.category?._id || p.category) === activeCategory);

  // Featured product for hero — pick first product with an image
  const featuredProduct = safeProducts.find((p) => p?.image) ?? safeProducts[0] ?? null;

  const handleLoginRequired = () => {
    if (onOpenAuth) onOpenAuth();
    else setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <Hero
        onShopNow={scrollToCatalog}
        onJoinFree={handleLoginRequired}
        featuredProduct={featuredProduct}
        onProductClick={setSelectedProduct}
      />

      {/* Search + Category Filter */}
      <div ref={catalogRef}>
        <SearchFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleSearch}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          categories={loadingCategories ? [] : safeCategories}
          productCount={filteredProducts.length}
        />
      </div>

      {/* Product Grid */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {/* API fetch error */}
          {fetchError && !loadingProducts && (
            <div className="mb-6 px-5 py-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-medium">
              ⚠️ Failed to load products: {fetchError}
            </div>
          )}

          <ProductGrid
            products={filteredProducts}
            loading={loadingProducts}
            onAddedToCart={handleToast}
            onLoginRequired={handleLoginRequired}
            onProductClick={setSelectedProduct}
          />
        </div>
      </section>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onOpenAuth={handleLoginRequired}
          onShowToast={handleToast}
        />
      )}

      {/* Auth Modal (fallback if not handled globally) */}
      {authModalOpen && (
        <AuthModal
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => handleToast('Welcome! You are now signed in.', 'success')}
        />
      )}

      {/* Toast Stack */}
      <ToastContainer />
    </div>
  );
});

export default CatalogPage;
