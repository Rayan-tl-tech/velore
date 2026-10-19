import { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { getAllCategories, createCategory, deleteCategory } from '../../services/api/categoryService';
import { getAllProducts } from '../../services/api/productService';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadCategories = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const [cats, prods] = await Promise.all([
        getAllCategories(),
        getAllProducts().catch(() => []),
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setProducts(Array.isArray(prods) ? prods : []);
    } catch (err) {
      setError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      await createCategory({ name: newCategoryName.trim() });
      setSuccess(`Category "${newCategoryName}" created in MongoDB.`);
      setNewCategoryName('');
      await loadCategories();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete category "${name}"?`)) return;
    try {
      await deleteCategory(id);
      setSuccess(`Category "${name}" removed.`);
      await loadCategories();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to delete category');
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-base text-[#666]">
            Manage product categories and collections stored in MongoDB Atlas ({categories.length} categories active).
          </p>
        </div>
        <button
          onClick={loadCategories}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs border border-[#E8E8E8] hover:border-[#0A0A0A] transition-colors bg-white font-medium"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-6 py-3.5 mb-6 flex items-center gap-3 text-sm">
          <CheckCircle size={18} className="text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-6 py-3.5 mb-6 flex items-center gap-3 text-sm">
          <AlertCircle size={18} className="text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Add Category Form */}
      <div className="bg-white border border-[#E8E8E8] p-6 mb-8">
        <h3 className="text-xs uppercase tracking-wider text-[#666] font-semibold mb-3">
          Create New Category
        </h3>
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="e.g. Outerwear, Leather Accessories, Knitwear..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full border border-[#D0D0D0] px-4 py-2.5 text-sm focus:outline-none focus:border-[#0A0A0A]"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-[#0A0A0A] text-white px-6 py-2.5 text-xs tracking-wider uppercase font-medium hover:bg-[#333333] transition-colors flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
          >
            <Plus size={16} strokeWidth={1.5} />
            {submitting ? 'Saving...' : 'Add Category'}
          </button>
        </form>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => {
          const prodsInCat = products.filter((p) => {
            const catId = typeof p.category === 'object' ? p.category?._id : p.category;
            const catName = typeof p.category === 'object' ? p.category?.name : p.category;
            return catId === cat._id || catName?.toLowerCase() === cat.name?.toLowerCase();
          });

          return (
            <div key={cat._id || cat.name} className="bg-white border border-[#E8E8E8] p-6 flex flex-col justify-between hover:border-[#0A0A0A] transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#F5F5F5] flex items-center justify-center">
                    <Tag size={18} strokeWidth={1.5} className="text-[#666]" />
                  </div>
                  <div>
                    <h4 className="font-serif-display text-2xl text-[#0A0A0A] font-normal">{cat.name}</h4>
                    <p className="text-xs text-[#666]">
                      {prodsInCat.length} product{prodsInCat.length !== 1 ? 's' : ''} assigned
                    </p>
                  </div>
                </div>
                {cat._id && (
                  <button
                    onClick={() => handleDelete(cat._id, cat.name)}
                    title="Delete Category"
                    className="p-1.5 text-neutral-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="pt-4 border-t border-[#F0F0F0] flex items-center justify-between text-xs text-[#888]">
                <span>ID: {String(cat._id || 'default').slice(-6)}</span>
                <span className="font-mono uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Active</span>
              </div>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}
