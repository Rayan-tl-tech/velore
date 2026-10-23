import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Plus, Trash2, Edit3, X, RefreshCw, AlertCircle, CheckCircle, ArrowLeft, Eye, LayoutGrid, List, ArrowRight, UploadCloud, Loader2 } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { getAllProducts, createProduct, deleteProduct, updateProduct, uploadProductImage } from '../../services/api/productService';
import { getAllCategories } from '../../services/api/categoryService';
import { formatPrice } from '../../data/products';
import { useAuth } from '../../context/AuthContext';

const statusColors = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  DRAFT: 'bg-amber-100 text-amber-800',
  OUT_OF_STOCK: 'bg-red-100 text-red-800',
};

export default function Products() {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const stockParam = searchParams.get('stock') || 'all';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All categories');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [stockFilter, setStockFilter] = useState(stockParam);
  const [viewMode, setViewMode] = useState(stockParam !== 'all' ? 'grid' : 'table');

  // Sync state if URL query params change
  useEffect(() => {
    const q = searchParams.get('stock') || 'all';
    setStockFilter(q);
    if (q !== 'all') {
      setViewMode('grid');
    }
  }, [searchParams]);

  const handleStockFilterChange = (val) => {
    setStockFilter(val);
    if (val && val !== 'all') {
      setViewMode('grid');
    }
    const newParams = new URLSearchParams(searchParams);
    if (!val || val === 'all') {
      newParams.delete('stock');
    } else {
      newParams.set('stock', val);
    }
    setSearchParams(newParams);
  };

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Image upload state
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    stock: '',
    description: '',
    image: '',
  });

  const loadData = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const [prods, cats] = await Promise.all([
        getAllProducts(),
        getAllCategories().catch(() => []),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: categories[0]?._id || '',
      price: '',
      stock: '',
      description: '',
      image: '',
    });
    setImagePreview('');
    setImageUploadError(null);
    setUploadingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingProduct(p);
    setFormData({
      name: p.name || '',
      category: typeof p.category === 'object' ? p.category?._id : p.category || '',
      price: p.price || '',
      stock: p.stock ?? '',
      description: p.description || '',
      image: p.image || '',
    });
    setImagePreview(p.image || '');
    setImageUploadError(null);
    setUploadingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFormError(null);
    setIsModalOpen(true);
  };

  const processSelectedFile = async (file) => {
    if (!file) return;

    setImageUploadError(null);

    // 1. Client-side format validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const extension = file.name?.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(extension)) {
      setImageUploadError('Invalid format. Please select a JPG, PNG, or WebP image.');
      return;
    }

    // 2. Client-side size validation (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      setImageUploadError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 5MB.`);
      return;
    }

    // 3. Instant local preview
    const localPreviewUrl = URL.createObjectURL(file);
    setImagePreview(localPreviewUrl);

    // 4. Upload immediately to storage provider
    try {
      setUploadingImage(true);
      const res = await uploadProductImage(file);
      if (res && res.url) {
        setFormData((prev) => ({ ...prev, image: res.url }));
        setImagePreview(res.url);
      } else {
        throw new Error('No image URL returned from storage');
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to upload image. Please try again.';
      setImageUploadError(msg);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    setImagePreview('');
    setFormData((prev) => ({ ...prev, image: '' }));
    setImageUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return setFormError('Product name is required');
    if (!formData.price || Number(formData.price) <= 0) return setFormError('Valid price is required');
    if (formData.stock === '' || Number(formData.stock) < 0) return setFormError('Valid stock quantity is required');
    if (uploadingImage) return setFormError('Please wait for the image upload to complete before saving.');

    try {
      setSubmitting(true);
      setFormError(null);

      // Create a FormData or JSON payload
      const payload = new FormData();
      payload.append('name', formData.name.trim());
      payload.append('price', Number(formData.price));
      payload.append('stock', Number(formData.stock));
      payload.append('description', formData.description.trim());
      if (formData.category) payload.append('category', formData.category);
      if (formData.image) payload.append('image', formData.image.trim());

      if (editingProduct) {
        await updateProduct(editingProduct._id, payload);
        setSuccessMessage(`Product "${formData.name}" updated successfully!`);
      } else {
        await createProduct(payload);
        setSuccessMessage(`Product "${formData.name}" added to catalog!`);
      }

      setIsModalOpen(false);
      await loadData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await deleteProduct(id);
      setSuccessMessage(`Product "${name}" deleted.`);
      await loadData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to delete product');
    }
  };

  // Filtered List
  const filteredProducts = products.filter((product) => {
    const catName = typeof product.category === 'object' ? product.category?.name : product.category;
    const matchesSearch =
      (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product._id || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === 'All categories' ||
      catName?.toLowerCase() === categoryFilter.toLowerCase();

    const stockVal = Number(product.stock) || 0;
    const matchesStock = (() => {
      if (stockFilter === 'in_stock') return stockVal > 5;
      if (stockFilter === 'low_stock') return stockVal >= 1 && stockVal <= 5;
      if (stockFilter === 'out_of_stock') return stockVal === 0;
      return true;
    })();

    const isAvailable = stockVal > 0;
    const matchesStatus =
      statusFilter === 'All statuses' ||
      (statusFilter === 'ACTIVE' && isAvailable) ||
      (statusFilter === 'DRAFT' && !isAvailable);

    return matchesSearch && matchesCategory && matchesStock && matchesStatus;
  });

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-base text-[#666]">
            Manage the live VÉLOR product catalog ({products.length} products).
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border border-[#E8E8E8] hover:border-[#0A0A0A] transition-colors bg-white font-medium"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-6 py-3.5 mb-6 flex items-center gap-3 text-sm">
          <CheckCircle size={18} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-6 py-3.5 mb-6 flex items-center gap-3 text-sm">
          <AlertCircle size={18} className="text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Active Stock Health Banner (when navigated from Overview or filter selected) */}
      {stockFilter !== 'all' && (
        <div className="bg-[#FAFAFA] border border-[#E8E8E8] p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Link
                to="/admin"
                className="text-xs text-[#666] hover:text-[#0A0A0A] inline-flex items-center gap-1 font-medium underline underline-offset-4"
              >
                <ArrowLeft size={13} /> Back to Overview
              </Link>
              <span className="text-[#CCC]">·</span>
              <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-[#666]">
                Inventory Health Filter
              </span>
            </div>
            <h2 className="font-serif-display text-2xl text-[#0A0A0A]">
              {stockFilter === 'in_stock' && 'In Stock — Products with more than 5 units'}
              {stockFilter === 'low_stock' && 'Low Stock — Products with 1 to 5 units'}
              {stockFilter === 'out_of_stock' && 'Out of Stock — Products with no remaining inventory'}
            </h2>
            <p className="text-xs text-[#666] mt-1">
              Showing {filteredProducts.length} matching piece{filteredProducts.length === 1 ? '' : 's'} from live MongoDB catalog
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => handleStockFilterChange('all')}
              className="text-xs uppercase tracking-wider px-4 py-2.5 bg-white border border-[#E8E8E8] hover:border-[#0A0A0A] text-[#0A0A0A] font-medium transition-colors cursor-pointer"
            >
              Clear Stock Filter
            </button>
            <Link
              to="/admin"
              className="text-xs uppercase tracking-wider px-4 py-2.5 bg-[#0A0A0A] text-white hover:bg-[#333] font-medium transition-colors"
            >
              ← Back to Overview
            </Link>
          </div>
        </div>
      )}

      {/* Filter and Action Bar */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3 mb-6">
        <div className="flex-1 flex items-center gap-2.5 bg-white border border-[#E8E8E8] px-3.5 py-2.5 min-w-0">
          <Search size={16} strokeWidth={1.5} className="text-[#666] shrink-0" />
          <input
            type="text"
            placeholder="Search products by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent text-xs focus:outline-none min-w-0"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white border border-[#E8E8E8] px-3 py-2 text-xs focus:outline-none"
          >
            <option>All categories</option>
            {categories.map((c) => (
              <option key={c._id || c.name} value={c.name}>
                {c.name}
              </option>
            ))}
            <option>Men</option>
            <option>Women</option>
            <option>Kids</option>
          </select>

          {/* Stock Status Filter */}
          <select
            value={stockFilter}
            onChange={(e) => handleStockFilterChange(e.target.value)}
            className="bg-white border border-[#E8E8E8] px-3 py-2 text-xs focus:outline-none"
          >
            <option value="all">All stock levels</option>
            <option value="in_stock">In stock (&gt; 5 units)</option>
            <option value="low_stock">Low stock (1–5 units)</option>
            <option value="out_of_stock">Out of stock (0 units)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-[#E8E8E8] px-3 py-2 text-xs focus:outline-none"
          >
            <option>All statuses</option>
            <option value="ACTIVE">ACTIVE (In Stock)</option>
            <option value="DRAFT">DRAFT (Out of Stock)</option>
          </select>

          <div className="flex items-center gap-2 shrink-0 ml-auto xl:ml-0">
            <div className="flex items-center border border-[#E8E8E8] bg-white p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Card Grid View"
                className={`p-1.5 transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-[#0A0A0A] text-white' : 'text-[#666] hover:text-[#0A0A0A]'
                }`}
              >
                <LayoutGrid size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Table View"
                className={`p-1.5 transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-[#0A0A0A] text-white' : 'text-[#666] hover:text-[#0A0A0A]'
                }`}
              >
                <List size={14} />
              </button>
            </div>

            <button
              onClick={openAddModal}
              className="bg-[#0A0A0A] text-white px-4 py-2.5 text-xs tracking-[0.15em] uppercase font-medium hover:bg-[#333333] transition-colors flex items-center justify-center gap-2 shrink-0"
            >
              <Plus size={15} strokeWidth={1.5} />
              Add Product
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Card Grid View or Table View */}
      {viewMode === 'grid' ? (
        loading && products.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white border border-[#E8E8E8] flex flex-col animate-pulse">
                <div className="aspect-[3/4] bg-[#EFEFEF]"></div>
                <div className="p-5 space-y-3">
                  <div className="h-4 w-3/4 bg-[#EFEFEF]"></div>
                  <div className="h-3 w-1/3 bg-[#F5F5F5]"></div>
                  <div className="h-4 w-1/4 bg-[#EFEFEF] pt-2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white border border-[#E8E8E8] p-12 text-center my-6">
            <p className="font-serif-display text-2xl text-[#0A0A0A] mb-2">No pieces in this inventory category</p>
            <p className="text-xs text-[#666] mb-6">
              {stockFilter === 'out_of_stock'
                ? 'Great news! There are currently 0 out of stock products in your catalog.'
                : 'No products match the selected stock criteria in the live MongoDB catalog.'}
            </p>
            <div className="flex items-center justify-center gap-4">
              {stockFilter !== 'all' && (
                <button
                  onClick={() => handleStockFilterChange('all')}
                  className="text-xs uppercase tracking-wider px-5 py-2.5 bg-white border border-[#E8E8E8] hover:border-[#0A0A0A] text-[#0A0A0A] font-medium transition-colors cursor-pointer"
                >
                  Clear Stock Filter
                </button>
              )}
              <Link
                to="/admin"
                className="text-xs uppercase tracking-wider px-5 py-2.5 bg-[#0A0A0A] text-white hover:bg-[#333] font-medium transition-colors"
              >
                ← Back to Overview
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {filteredProducts.map((product) => {
              const catName = typeof product.category === 'object' ? product.category?.name : product.category || 'Collection';
              const stockVal = Number(product.stock) || 0;
              const inStock = stockVal > 5;
              const isLowStock = stockVal >= 1 && stockVal <= 5;
              const isOutOfStock = stockVal === 0;

              const statusLabel = inStock ? 'In Stock' : isLowStock ? 'Low Stock' : 'Out of Stock';
              const badgeStyle = inStock
                ? 'bg-[#0A0A0A] text-white'
                : isLowStock
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-red-100 text-red-800 border border-red-300';

              return (
                <div
                  key={product._id}
                  className="bg-white border border-[#E8E8E8] hover:border-[#0A0A0A] hover:shadow-sm transition-all duration-200 flex flex-col group overflow-hidden"
                >
                  {/* Product Image */}
                  <div className="relative aspect-[3/4] bg-[#F5F5F5] overflow-hidden">
                    <img
                      src={product.image || 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=600&h=800&fit=crop'}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=600&h=800&fit=crop';
                      }}
                    />
                    <div className="absolute top-3 left-3">
                      <span className={`inline-block px-2.5 py-1 text-[10px] tracking-[0.15em] uppercase font-semibold ${badgeStyle}`}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-[11px] tracking-[0.15em] uppercase text-[#666] mb-1">{catName}</p>
                      <h3 className="font-serif-display text-lg text-[#0A0A0A] mb-1 line-clamp-1">{product.name}</h3>
                      <p className="text-sm font-semibold text-[#0A0A0A] mb-4">{formatPrice(product.price)}</p>
                    </div>

                    <div className="pt-4 border-t border-[#F0F0F0]">
                      <div className="mb-3">
                        <p className="text-[10px] tracking-[0.15em] uppercase text-[#888] mb-0.5">Stock</p>
                        <p
                          className={`text-sm font-semibold ${
                            isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-700' : 'text-[#0A0A0A]'
                          }`}
                        >
                          {stockVal} unit{stockVal === 1 ? '' : 's'}
                        </p>
                      </div>

                      <button
                        onClick={() => openEditModal(product)}
                        className="w-full py-2.5 px-3 border border-[#E8E8E8] hover:border-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white transition-all text-xs uppercase tracking-wider font-medium flex items-center justify-between text-[#0A0A0A] group/btn cursor-pointer"
                      >
                        <span>{statusLabel}</span>
                        <span className="flex items-center gap-1.5">
                          <span className="text-[11px] lowercase opacity-80 group-hover/btn:underline">View</span>
                          <ArrowRight size={13} className="transform group-hover/btn:translate-x-1 transition-transform" />
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Products Table */
        <div className="bg-white border border-[#E8E8E8] mb-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E8E8E8] bg-[#F9F9F9]">
                  <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Product</th>
                  <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Category</th>
                  <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Price</th>
                  <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Stock</th>
                  <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Status</th>
                  <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">ID / SKU</th>
                  <th className="text-right py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && products.length === 0 ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#E8E8E8] animate-pulse">
                      <td className="py-4 px-6 flex items-center gap-4">
                        <div className="w-16 h-20 bg-[#EFEFEF]"></div>
                        <div className="space-y-2">
                          <div className="h-4 w-32 bg-[#EFEFEF]"></div>
                          <div className="h-3 w-20 bg-[#F5F5F5]"></div>
                        </div>
                      </td>
                      <td className="py-4 px-6"><div className="h-4 w-20 bg-[#EFEFEF]"></div></td>
                      <td className="py-4 px-6"><div className="h-4 w-16 bg-[#EFEFEF]"></div></td>
                      <td className="py-4 px-6"><div className="h-4 w-12 bg-[#EFEFEF]"></div></td>
                      <td className="py-4 px-6"><div className="h-6 w-16 bg-[#EFEFEF] rounded"></div></td>
                      <td className="py-4 px-6"><div className="h-4 w-16 bg-[#EFEFEF]"></div></td>
                      <td className="py-4 px-6 text-right"><div className="h-7 w-20 bg-[#EFEFEF] ml-auto"></div></td>
                    </tr>
                  ))
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-[#666]">
                      No products matched your filters.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const catName = typeof product.category === 'object' ? product.category?.name : product.category;
                    const inStock = (Number(product.stock) || 0) > 0;
                    const statusKey = inStock ? 'ACTIVE' : 'DRAFT';

                    return (
                      <tr key={product._id} className="border-b border-[#E8E8E8] last:border-0 hover:bg-[#FAFAFA] transition-colors">
                        <td className="py-3 px-4 lg:px-6">
                          <div className="flex items-center gap-3">
                            <img
                              src={product.image || 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=200&h=200&fit=crop'}
                              alt={product.name}
                              className="w-12 h-14 object-cover bg-[#F0F0F0] shrink-0"
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=200&h=200&fit=crop';
                              }}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium mb-0.5 text-[#0A0A0A] truncate max-w-xs">{product.name}</p>
                              <p className="text-xs text-[#666] line-clamp-1 max-w-xs">{product.description || 'VÉLOR Collection Piece'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 lg:px-6 text-sm">{catName || 'Uncategorized'}</td>
                        <td className="py-3 px-4 lg:px-6 text-sm font-medium">{formatPrice(product.price)}</td>
                        <td className="py-3 px-4 lg:px-6 text-sm">
                          <span className={inStock ? 'font-medium' : 'text-red-500 font-medium'}>
                            {product.stock} units
                          </span>
                        </td>
                        <td className="py-3 px-4 lg:px-6">
                          <span className={`inline-block px-2.5 py-0.5 text-[11px] tracking-[0.1em] uppercase ${statusColors[statusKey]}`}>
                            {statusKey}
                          </span>
                        </td>
                        <td className="py-3 px-4 lg:px-6 text-xs text-[#666] font-mono">
                          {String(product._id).slice(-6).toUpperCase()}
                        </td>
                        <td className="py-3 px-4 lg:px-6 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(product)}
                              title="Edit Product"
                              className="p-1.5 text-[#666] hover:text-[#0A0A0A] transition-colors cursor-pointer"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(product._id, product.name)}
                              title="Delete Product"
                              className="p-1.5 text-[#666] hover:text-red-600 transition-colors cursor-pointer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-lg border border-[#E8E8E8] shadow-2xl flex flex-col max-h-[90vh] my-auto">
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#E8E8E8] shrink-0">
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#666] mb-1">
                  {editingProduct ? 'Update Product' : 'New Catalog Item'}
                </p>
                <h3 className="font-serif-display text-xl sm:text-2xl">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-[#666] hover:text-[#0A0A0A] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#666] mb-1.5 font-medium">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Essential Tailored Coat"
                  className="w-full border border-[#D0D0D0] px-3.5 py-2 text-sm focus:outline-none focus:border-[#0A0A0A]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#666] mb-1.5 font-medium">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-[#D0D0D0] px-3 py-2 text-sm focus:outline-none focus:border-[#0A0A0A] bg-white"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c._id || c.name} value={c._id || c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#666] mb-1.5 font-medium">
                    Price (DA) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="e.g. 7400"
                    className="w-full border border-[#D0D0D0] px-3.5 py-2 text-sm focus:outline-none focus:border-[#0A0A0A]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#666] mb-1.5 font-medium">
                  Stock Quantity *
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="e.g. 25"
                  className="w-full border border-[#D0D0D0] px-3.5 py-2 text-sm focus:outline-none focus:border-[#0A0A0A]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#666] mb-1.5 font-medium">
                  Product Image
                </label>

                {imagePreview ? (
                  <div className="relative border border-[#E8E8E8] bg-[#FAFAFA] p-3.5 flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 bg-[#F0F0F0] border border-[#E0E0E0] shrink-0 overflow-hidden flex items-center justify-center">
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        className="w-full h-full object-cover"
                      />
                      {uploadingImage && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white p-2 text-center">
                          <Loader2 className="w-5 h-5 animate-spin mb-1 text-white" />
                          <span className="text-[10px] tracking-wider uppercase font-medium">Uploading...</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 w-full flex flex-col justify-between py-1">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-[#0A0A0A]">
                            {uploadingImage ? 'Uploading image...' : 'Image ready'}
                          </span>
                          {!uploadingImage && formData.image && (
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                              <CheckCircle size={10} /> Uploaded
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#777] mb-3">
                          {uploadingImage
                            ? 'Transmitting file to storage provider...'
                            : 'This image will be displayed on the storefront and product catalog.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                          className="px-3 py-1.5 text-xs tracking-wider uppercase border border-[#D0D0D0] hover:border-[#0A0A0A] bg-white text-[#0A0A0A] transition-colors disabled:opacity-50"
                        >
                          Replace Image
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          disabled={uploadingImage}
                          className="px-3 py-1.5 text-xs tracking-wider uppercase text-red-600 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        processSelectedFile(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`border-2 border-dashed transition-all cursor-pointer p-6 sm:p-8 text-center flex flex-col items-center justify-center gap-2 ${
                      isDragging
                        ? 'border-[#0A0A0A] bg-[#F5F5F5]'
                        : 'border-[#D0D0D0] hover:border-[#0A0A0A] bg-[#FAFAFA] hover:bg-[#F7F7F7]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-white border border-[#E5E5E5] flex items-center justify-center text-[#666] mb-1">
                      <UploadCloud size={18} />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider font-medium text-[#0A0A0A]">
                        Upload Product Image
                      </p>
                      <p className="text-xs text-[#777] mt-0.5">
                        Click to choose an image from your device or drag and drop
                      </p>
                    </div>
                    <p className="text-[10px] tracking-wider uppercase text-[#999] mt-1">
                      JPG, PNG, WebP · Max 5MB
                    </p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {imageUploadError && (
                  <div className="mt-2 bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 text-xs flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{imageUploadError}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#666] mb-1.5 font-medium">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tailored silhouette in breathable cotton..."
                  className="w-full border border-[#D0D0D0] px-3.5 py-2 text-sm focus:outline-none focus:border-[#0A0A0A] resize-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E8E8E8] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs tracking-wider uppercase border border-[#E8E8E8] hover:border-[#0A0A0A] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingImage}
                  className="bg-[#0A0A0A] text-white px-5 py-2 text-xs tracking-wider uppercase hover:bg-[#333333] transition-colors disabled:opacity-50"
                >
                  {uploadingImage ? 'Uploading image...' : submitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </AdminLayout>
  );
}
