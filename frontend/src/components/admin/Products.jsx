import { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit3, X, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { getAllProducts, createProduct, deleteProduct, updateProduct } from '../../services/api/productService';
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
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All categories');
  const [statusFilter, setStatusFilter] = useState('All statuses');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

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
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return setFormError('Product name is required');
    if (!formData.price || Number(formData.price) <= 0) return setFormError('Valid price is required');
    if (formData.stock === '' || Number(formData.stock) < 0) return setFormError('Valid stock quantity is required');

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
      setFormError(err.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from MongoDB?`)) return;
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
    const isAvailable = (Number(product.stock) || 0) > 0;
    const matchesStatus =
      statusFilter === 'All statuses' ||
      (statusFilter === 'ACTIVE' && isAvailable) ||
      (statusFilter === 'DRAFT' && !isAvailable);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-base text-[#666]">
            Manage the live VÉLOR product catalog ({products.length} products stored in MongoDB).
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

      {/* Filter and Action Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 mb-8">
        <div className="flex-1 flex items-center gap-3 bg-white border border-[#E8E8E8] px-4 py-3">
          <Search size={18} strokeWidth={1.5} className="text-[#666]" />
          <input
            type="text"
            placeholder="Search products by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-white border border-[#E8E8E8] px-4 py-3 text-sm focus:outline-none"
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

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-[#E8E8E8] px-4 py-3 text-sm focus:outline-none"
        >
          <option>All statuses</option>
          <option value="ACTIVE">ACTIVE (In Stock)</option>
          <option value="DRAFT">DRAFT (Out of Stock)</option>
        </select>

        <button
          onClick={openAddModal}
          className="bg-[#0A0A0A] text-white px-6 py-3 text-xs tracking-[0.15em] uppercase font-medium hover:bg-[#333333] transition-colors flex items-center justify-center gap-2 shrink-0"
        >
          <Plus size={16} strokeWidth={1.5} />
          Add Product
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-[#E8E8E8]">
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
              {filteredProducts.length === 0 ? (
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
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <img
                            src={product.image || 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=200&h=200&fit=crop'}
                            alt={product.name}
                            className="w-16 h-20 object-cover bg-[#F0F0F0]"
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=200&h=200&fit=crop';
                            }}
                          />
                          <div>
                            <p className="text-sm font-medium mb-1 text-[#0A0A0A]">{product.name}</p>
                            <p className="text-xs text-[#666] line-clamp-1 max-w-xs">{product.description || 'VÉLOR Collection Piece'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm">{catName || 'Uncategorized'}</td>
                      <td className="py-4 px-6 text-sm font-medium">{formatPrice(product.price)}</td>
                      <td className="py-4 px-6 text-sm">
                        <span className={inStock ? 'font-medium' : 'text-red-500 font-medium'}>
                          {product.stock} units
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-block px-3 py-1 text-xs tracking-[0.1em] uppercase ${statusColors[statusKey]}`}>
                          {statusKey}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs text-[#666] font-mono">
                        {String(product._id).slice(-6).toUpperCase()}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(product)}
                            title="Edit Product"
                            className="p-1.5 text-[#666] hover:text-[#0A0A0A] transition-colors"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(product._id, product.name)}
                            title="Delete Product"
                            className="p-1.5 text-[#666] hover:text-red-600 transition-colors"
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

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg border border-[#E8E8E8] shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[#E8E8E8]">
              <div>
                <p className="text-xs tracking-[0.2em] uppercase text-[#666] mb-1">
                  {editingProduct ? 'Update Product' : 'New Catalog Item'}
                </p>
                <h3 className="font-serif-display text-2xl">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-[#666] hover:text-[#0A0A0A] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-xs">
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
                  className="w-full border border-[#D0D0D0] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0A0A0A]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#666] mb-1.5 font-medium">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-[#D0D0D0] px-3 py-2.5 text-sm focus:outline-none focus:border-[#0A0A0A] bg-white"
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
                    className="w-full border border-[#D0D0D0] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0A0A0A]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                    className="w-full border border-[#D0D0D0] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0A0A0A]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#666] mb-1.5 font-medium">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full border border-[#D0D0D0] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0A0A0A]"
                  />
                </div>
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
                  className="w-full border border-[#D0D0D0] px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0A0A0A] resize-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E8E8E8]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-xs tracking-wider uppercase border border-[#E8E8E8] hover:border-[#0A0A0A] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#0A0A0A] text-white px-6 py-2.5 text-xs tracking-wider uppercase hover:bg-[#333333] transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving to Database...' : editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
