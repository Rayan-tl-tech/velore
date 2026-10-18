import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../services/api/productService';
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../services/api/categoryService';
import {
  getAllOrders,
  updateOrderStatus,
  deleteOrder as deleteOrderApi,
} from '../services/api/orderService';
import {
  getAllUsers,
  updateUserRole,
  deleteUser,
} from '../services/api/userService';
import { getImageUrl } from '../utils/formatters';
import {
  Loader2, ShoppingCart, X, Upload, Pencil, Trash2, Eye, Plus,
  LayoutDashboard, Package, Tag, ClipboardList, Home, LogOut,
  ChevronRight, AlertCircle, Search, CheckCircle2, Clock,
  Check, RefreshCw, ArrowUpDown, DollarSign, Copy,
  Users, Shield, ShieldAlert, ShieldCheck, UserCheck,
} from 'lucide-react';


// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStatusStyle = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending':    return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'processing': return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'shipped':    return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
    case 'delivered':  return 'bg-teal-50 text-teal-700 border border-teal-200';
    case 'completed':  return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'cancelled':  return 'bg-red-50 text-red-700 border border-red-200';
    default:           return 'bg-gray-50 text-gray-700 border border-gray-200';
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

const formatMoney = (n) => `${new Intl.NumberFormat('fr-DZ').format(Number(n ?? 0))} DA`;

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }) {
  const colorMap = {
    indigo: 'bg-indigo-50 text-indigo-600',
    purple: 'bg-purple-50 text-purple-600',
    green:  'bg-green-50 text-green-600',
    amber:  'bg-amber-50 text-amber-600',
  };
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colorMap[color]}`}>
        {icon}
      </div>
      <div className="text-4xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-gray-500 text-sm">{label}</div>
    </div>
  );
}

// ─── Action Card ──────────────────────────────────────────────────────────────

function ActionCard({ icon, label, color, onClick }) {
  const colorMap = {
    indigo: 'bg-indigo-50 text-indigo-600',
    purple: 'bg-purple-50 text-purple-600',
    green:  'bg-green-50 text-green-600',
  };
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all flex items-center space-x-4 w-full text-left group"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[color]} group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <span className="font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
      <ChevronRight className="w-4 h-4 text-gray-400 ml-auto group-hover:translate-x-1 transition-transform" />
    </button>
  );
}

// ─── Confirm Delete Modal ─────────────────────────────────────────────────────

function ConfirmModal({ title, message, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        </div>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Product Form Modal ───────────────────────────────────────────────────────

function ProductFormModal({ product, categories, onClose, onSaved, onShowToast }) {
  const isEdit = !!product;
  const [form, setForm] = useState({
    name:        product?.name ?? '',
    description: product?.description ?? '',
    price:       product?.price ?? '',
    stock:       product?.stock ?? '',
    category:    product?.category?._id ?? product?.category ?? '',
  });
  const [imageFile, setImageFile]     = useState(null);
  const [imagePreview, setImagePreview] = useState(
    product?.image ? getImageUrl(product.image) : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const fileRef = useRef();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleImage = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Product name is required.');
      return;
    }
    if (form.price === '' || form.price === null || form.price === undefined || isNaN(Number(form.price)) || Number(form.price) < 0) {
      setError('Price is required and must be 0 or greater.');
      return;
    }
    if (form.stock === '' || form.stock === null || form.stock === undefined || isNaN(Number(form.stock)) || Number(form.stock) < 0) {
      setError('Stock is required and must be 0 or greater.');
      return;
    }
    if (!form.category) {
      setError('Please select a category.');
      return;
    }
    if (!isEdit && !imageFile) {
      setError('Please upload a product image.');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name',        form.name.trim());
      fd.append('description', form.description.trim());
      fd.append('price',       form.price);
      fd.append('stock',       form.stock);
      fd.append('category',    form.category);
      if (imageFile) fd.append('image', imageFile);

      if (isEdit) {
        await updateProduct(product._id, fd);
        onShowToast?.('Product updated successfully.', 'success');
      } else {
        await createProduct(fd);
        onShowToast?.('Product created successfully.', 'success');
      }
      onSaved();
    } catch (err) {
      setError(err.message || 'Failed to save product.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            {isEdit ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>
          )}

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Image {!isEdit && <span className="text-red-500">*</span>}
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 transition-colors min-h-[120px]"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-32 object-contain rounded-lg" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Click to upload image</span>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. Wireless Headphones"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={3}
              placeholder="Product description..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none"
            />
          </div>

          {/* Price & Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number" min="0" step="0.01" required
                value={form.price} onChange={set('price')}
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock <span className="text-red-500">*</span>
              </label>
              <input
                type="number" min="0" required
                value={form.stock} onChange={set('stock')}
                placeholder="0"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.category}
              onChange={set('category')}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-white"
            >
              <option value="">Select a category...</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-3 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={loading}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Category Form Modal ──────────────────────────────────────────────────────

function CategoryFormModal({ category, onClose, onSaved, onShowToast }) {
  const isEdit = !!category;
  const [name, setName]     = useState(category?.name ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    setLoading(true);
    try {
      if (isEdit) {
        await updateCategory(category._id, { name: name.trim() });
        onShowToast?.('Category updated.', 'success');
      } else {
        await createCategory({ name: name.trim() });
        onShowToast?.('Category created.', 'success');
      }
      onSaved();
    } catch (err) {
      setError(err.message || 'Failed to save category.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {isEdit ? 'Edit Category' : 'Add Category'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Electronics"
              autoFocus
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Order Inspect Modal ──────────────────────────────────────────────────────

function OrderInspectModal({ order, onClose, onRefresh, onShowToast }) {
  const [currentStatus, setCurrentStatus] = useState(order?.status || 'pending');
  const [updating, setUpdating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (order?.status) {
      setCurrentStatus(order.status);
    }
  }, [order?.status]);

  if (!order) return null;
  const lineItems = order.items ?? order.products ?? [];

  const statusOptions = [
    { value: 'pending',    label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped',    label: 'Shipped' },
    { value: 'delivered',  label: 'Delivered' },
    { value: 'completed',  label: 'Completed' },
    { value: 'cancelled',  label: 'Cancelled' },
  ];

  const handleStatusChange = async (newStatus) => {
    setCurrentStatus(newStatus);
    setUpdating(true);
    try {
      await updateOrderStatus(order._id, newStatus);
      onShowToast?.(`Order #${order._id.slice(-6).toUpperCase()} updated to ${newStatus}`, 'success');
      onRefresh?.();
    } catch (err) {
      onShowToast?.(err.message || 'Failed to update order status', 'error');
      setCurrentStatus(order.status);
    } finally {
      setUpdating(false);
    }
  };

  const copyOrderId = () => {
    navigator.clipboard.writeText(order._id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const orderTotal = Number(order.totalPrice ?? order.totalAmount ?? order.total ?? 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">
                  Order #{order._id?.slice(-6).toUpperCase()}
                </h2>
                <button
                  onClick={copyOrderId}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
                  title="Copy full order ID"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 font-mono mt-0.5">ID: {order._id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Quick status & date strip */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50/80 rounded-xl border border-gray-100">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                Order Placed
              </span>
              <span className="text-sm font-medium text-gray-800">
                {formatDate(order.createdAt)}
              </span>
            </div>

            {/* Status Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status:
              </span>
              <div className="relative">
                <select
                  value={currentStatus}
                  disabled={updating}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className={`text-sm font-semibold px-3 py-1.5 rounded-xl border appearance-none pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 ${getStatusStyle(currentStatus)}`}
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-white text-gray-900">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                  {updating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Customer info card */}
          <div className="border border-gray-100 rounded-xl p-4 bg-white shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Customer & Delivery Information
              </h3>
              {order.isGuest && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded">
                  Guest Order
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {(order.customerName ?? order.user?.name ?? 'C')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {order.customerName ?? order.user?.name ?? 'Customer'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {order.customerPhone ? `Tel: ${order.customerPhone}` : ''} {order.customerEmail ? `· ${order.customerEmail}` : ''}
                </p>
              </div>
            </div>

            {order.wilaya && (
              <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg space-y-1 border border-gray-100">
                <p>
                  <strong className="text-gray-900">Destination:</strong> {order.wilaya} {order.commune ? `— ${order.commune}` : ''}
                </p>
                <p>
                  <strong className="text-gray-900">Address:</strong> {order.shippingAddress}
                </p>
                <p>
                  <strong className="text-gray-900">Delivery Mode:</strong>{' '}
                  {order.deliveryMethod === 'desk' ? 'Desk Collection (Point Relais)' : 'Home Delivery (À domicile)'}
                  {' · Shipping: '}
                  {formatMoney(order.shippingFee || 0)}
                </p>
              </div>
            )}
          </div>

          {/* Line items table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Order Items ({lineItems.length})
              </h3>
            </div>
            <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100">
              {lineItems.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">
                  No items listed for this order.
                </div>
              ) : (
                lineItems.map((item, i) => {
                  const prod = item.product ?? item;
                  const itemPrice = Number(item.price ?? prod?.price ?? 0);
                  const qty = Number(item.quantity ?? 1);
                  const lineTotal = itemPrice * qty;

                  return (
                    <div key={i} className="p-3.5 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                        {prod?.image ? (
                          <img
                            src={getImageUrl(prod.image)}
                            alt={prod.name || 'Product'}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <Package className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {prod?.name ?? (item.product ? `Product (${item.product})` : 'Product item')}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatMoney(itemPrice)} × {qty}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900 text-sm">
                          {formatMoney(lineTotal)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Price Summary Breakdown */}
          <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span className="font-medium text-gray-900">{formatMoney(orderTotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Standard Shipping</span>
              <span className="font-medium text-emerald-600">Free</span>
            </div>
            <div className="pt-2 border-t border-gray-200/80 flex justify-between items-baseline">
              <span className="font-bold text-gray-900">Total Price</span>
              <span className="text-2xl font-extrabold text-gray-900 tracking-tight">
                {formatMoney(orderTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Overview View ────────────────────────────────────────────────────────────

function OverviewView({ products, categories, orders, onNavigate }) {
  const totalRevenue = orders
    .filter((o) => o.status?.toLowerCase() !== 'cancelled')
    .reduce((sum, o) => sum + (Number(o.totalPrice ?? o.totalAmount ?? 0) || 0), 0);

  return (
    <>
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Dashboard Overview</h1>
      <p className="text-gray-500 mb-8">Monitor your store at a glance.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard icon={<Package className="w-6 h-6" />}       label="Total Products"   value={products.length}   color="indigo" />
        <StatCard icon={<Tag className="w-6 h-6" />}           label="Total Categories" value={categories.length} color="purple" />
        <StatCard icon={<ClipboardList className="w-6 h-6" />} label="Total Orders"     value={orders.length}     color="green"  />
        <StatCard icon={<DollarSign className="w-6 h-6" />}    label="Total Revenue"    value={formatMoney(totalRevenue)} color="amber" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ActionCard icon={<Plus className="w-6 h-6" />}          label="Add new product"   color="indigo" onClick={() => onNavigate('products',   'add')} />
        <ActionCard icon={<Plus className="w-6 h-6" />}          label="Add new category"  color="purple" onClick={() => onNavigate('categories', 'add')} />
        <ActionCard icon={<ClipboardList className="w-6 h-6" />} label="Review all orders" color="green"  onClick={() => onNavigate('orders')} />
      </div>
    </>
  );
}

// ─── Products View ────────────────────────────────────────────────────────────

function ProductsView({ products, categories, onRefresh, onShowToast, openAdd, setOpenAdd }) {
  const [showModal, setShowModal]     = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (openAdd) { setEditProduct(null); setShowModal(true); setOpenAdd(false); }
  }, [openAdd, setOpenAdd]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteProduct(confirmDelete._id);
      onShowToast?.('Product deleted.', 'success');
      setConfirmDelete(null);
      onRefresh();
    } catch (err) {
      onShowToast?.(err.message || 'Failed to delete.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Products</h1>
          <p className="text-gray-500">Manage your product catalog ({products.length} items).</p>
        </div>
        <button
          onClick={() => { setEditProduct(null); setShowModal(true); }}
          className="px-5 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-md shadow-indigo-600/20"
        >
          <Plus className="w-5 h-5" />
          Add Product
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                {['Product', 'Category', 'Price', 'Stock', 'Actions'].map((h) => (
                  <th key={h} className="text-left py-4 px-6 text-gray-500 font-semibold text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-gray-400">
                    <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p>No products yet. Add your first one!</p>
                  </td>
                </tr>
              ) : products.map((p) => (
                <tr key={p._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <img
                        src={getImageUrl(p.image)}
                        alt={p.name}
                        className="w-12 h-12 rounded-xl object-cover border border-gray-100 bg-gray-100 shrink-0"
                        onError={(e) => { e.target.src = 'https://placehold.co/48x48/e5e7eb/9ca3af?text=IMG'; }}
                      />
                      <span className="font-medium text-gray-900 truncate max-w-[220px]">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                      {p.category?.name ?? '—'}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-bold text-gray-900">{formatMoney(p.price)}</td>
                  <td className="py-4 px-6">
                    <span className={`font-semibold ${p.stock < 10 ? 'text-red-600' : 'text-green-600'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditProduct(p); setShowModal(true); }}
                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(p)}
                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <ProductFormModal
          product={editProduct}
          categories={categories}
          onClose={() => { setShowModal(false); setEditProduct(null); }}
          onSaved={() => { setShowModal(false); setEditProduct(null); onRefresh(); }}
          onShowToast={onShowToast}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete Product"
          message={`Are you sure you want to delete "${confirmDelete.name}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
          loading={deleteLoading}
        />
      )}
    </>
  );
}

// ─── Categories View ──────────────────────────────────────────────────────────

function CategoriesView({ categories, onRefresh, onShowToast, openAdd, setOpenAdd }) {
  const [showModal, setShowModal]       = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (openAdd) { setEditCategory(null); setShowModal(true); setOpenAdd(false); }
  }, [openAdd, setOpenAdd]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteCategory(confirmDelete._id);
      onShowToast?.('Category deleted.', 'success');
      setConfirmDelete(null);
      onRefresh();
    } catch (err) {
      onShowToast?.(err.message || 'Failed to delete.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Categories</h1>
          <p className="text-gray-500">Create and manage product categories.</p>
        </div>
        <button
          onClick={() => { setEditCategory(null); setShowModal(true); }}
          className="px-5 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-md shadow-indigo-600/20"
        >
          <Plus className="w-5 h-5" />
          Add Category
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              {['#', 'Name', 'ID', 'Actions'].map((h) => (
                <th key={h} className="text-left py-4 px-6 text-gray-500 font-semibold text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-16 text-center text-gray-400">
                  <Tag className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>No categories yet. Add your first one!</p>
                </td>
              </tr>
            ) : categories.map((cat, i) => (
              <tr key={cat._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="py-4 px-6 text-gray-500 font-medium">{i + 1}</td>
                <td className="py-4 px-6 font-semibold text-gray-900">{cat.name}</td>
                <td className="py-4 px-6">
                  <code className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-mono">{cat._id}</code>
                </td>
                <td className="py-4 px-6">
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditCategory(cat); setShowModal(true); }}
                      className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(cat)}
                      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <CategoryFormModal
          category={editCategory}
          onClose={() => { setShowModal(false); setEditCategory(null); }}
          onSaved={() => { setShowModal(false); setEditCategory(null); onRefresh(); }}
          onShowToast={onShowToast}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete Category"
          message={`Delete "${confirmDelete.name}"? Products in this category may be affected.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
          loading={deleteLoading}
        />
      )}
    </>
  );
}

// ─── Orders View ──────────────────────────────────────────────────────────────

function OrdersView({ orders, onRefresh, onShowToast }) {
  const [inspectOrder, setInspectOrder] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'highest' | 'lowest'

  const statusOptions = [
    { value: 'pending',    label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped',    label: 'Shipped' },
    { value: 'delivered',  label: 'Delivered' },
    { value: 'completed',  label: 'Completed' },
    { value: 'cancelled',  label: 'Cancelled' },
  ];

  // Quick inline status update
  const handleQuickStatusChange = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      onShowToast?.(`Order #${orderId.slice(-6).toUpperCase()} status changed to ${newStatus}`, 'success');
      onRefresh?.();
    } catch (err) {
      onShowToast?.(err.message || 'Failed to update order status', 'error');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Delete Order
  const handleDeleteOrder = async () => {
    if (!confirmDelete) return;
    setDeleteLoading(true);
    try {
      await deleteOrderApi(confirmDelete._id);
      onShowToast?.(`Order #${confirmDelete._id.slice(-6).toUpperCase()} deleted successfully`, 'success');
      setConfirmDelete(null);
      if (inspectOrder?._id === confirmDelete._id) {
        setInspectOrder(null);
      }
      onRefresh?.();
    } catch (err) {
      onShowToast?.(err.message || 'Failed to delete order', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Counts for pills
  const statusCounts = orders.reduce((acc, o) => {
    const s = o.status?.toLowerCase() || 'pending';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  // Computed totals for KPI cards
  const totalRevenue = orders
    .filter((o) => o.status?.toLowerCase() !== 'cancelled')
    .reduce((sum, o) => sum + (Number(o.totalPrice ?? o.totalAmount ?? 0) || 0), 0);

  const activeOrdersCount = orders.filter((o) =>
    ['pending', 'processing', 'shipped'].includes(o.status?.toLowerCase())
  ).length;

  const completedOrdersCount = orders.filter((o) =>
    ['delivered', 'completed'].includes(o.status?.toLowerCase())
  ).length;

  // Filter & Search Logic
  const filteredOrders = orders.filter((o) => {
    // Status filter
    if (statusFilter !== 'all' && o.status?.toLowerCase() !== statusFilter) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const idMatch = o._id?.toLowerCase().includes(q) || `#${o._id?.slice(-6).toLowerCase()}`.includes(q);
      const nameMatch = o.user?.name?.toLowerCase().includes(q);
      const emailMatch = o.user?.email?.toLowerCase().includes(q);
      return idMatch || nameMatch || emailMatch;
    }
    return true;
  });

  // Sorting
  filteredOrders.sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    const totalA = Number(a.totalPrice ?? a.totalAmount ?? 0);
    const totalB = Number(b.totalPrice ?? b.totalAmount ?? 0);
    if (sortBy === 'highest') return totalB - totalA;
    if (sortBy === 'lowest') return totalA - totalB;
    return 0;
  });

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Orders Management</h1>
          <p className="text-gray-500">Track and manage customer purchases ({orders.length} total orders).</p>
        </div>
        <button
          onClick={onRefresh}
          className="self-start sm:self-auto px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:text-indigo-600 hover:border-indigo-300 rounded-xl font-medium text-sm transition-all flex items-center gap-2 shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Orders
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{orders.length}</div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Orders</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{formatMoney(totalRevenue)}</div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Net Revenue</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{activeOrdersCount}</div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">In Progress</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{completedOrdersCount}</div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Completed / Delivered</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 shadow-sm space-y-4">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all',        label: 'All',        count: orders.length },
            { id: 'pending',    label: 'Pending',    count: statusCounts['pending'] || 0 },
            { id: 'processing', label: 'Processing', count: statusCounts['processing'] || 0 },
            { id: 'shipped',    label: 'Shipped',    count: statusCounts['shipped'] || 0 },
            { id: 'delivered',  label: 'Delivered',  count: statusCounts['delivered'] || 0 },
            { id: 'completed',  label: 'Completed',  count: statusCounts['completed'] || 0 },
            { id: 'cancelled',  label: 'Cancelled',  count: statusCounts['cancelled'] || 0 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                statusFilter === tab.id ? 'bg-indigo-700/60 text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, email, or #Order ID..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                {['Order ID', 'Customer', 'Date', 'Items', 'Total Price', 'Status (Quick Change)', 'Actions'].map((h, i) => (
                  <th key={i} className="text-left py-4 px-6 text-gray-500 font-semibold text-xs uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-semibold text-gray-600 mb-1">No orders found</p>
                    <p className="text-sm text-gray-400">
                      {searchQuery || statusFilter !== 'all'
                        ? 'Try clearing your filters or search keywords.'
                        : 'Customer orders will appear here once placed.'}
                    </p>
                    {(searchQuery || statusFilter !== 'all') && (
                      <button
                        onClick={() => { setStatusFilter('all'); setSearchQuery(''); }}
                        className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition-colors"
                      >
                        Reset Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const lineItems = order.items ?? order.products ?? [];
                  const isUpdatingThis = updatingOrderId === order._id;
                  const orderTotal = Number(order.totalPrice ?? order.totalAmount ?? order.total ?? 0);

                  return (
                    <tr key={order._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                      {/* Order ID */}
                      <td className="py-4 px-6">
                        <button
                          onClick={() => setInspectOrder(order)}
                          className="text-left group-hover:text-indigo-600 transition-colors focus:outline-none"
                        >
                          <code className="text-sm font-bold font-mono text-gray-900 group-hover:text-indigo-600 transition-colors">
                            #{order._id?.slice(-6).toUpperCase()}
                          </code>
                          <span className="block text-[11px] font-mono text-gray-400 truncate max-w-[100px]">
                            {order._id}
                          </span>
                        </button>
                      </td>

                      {/* Customer */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {(order.user?.name ?? order.user?.email ?? 'C')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 truncate max-w-[180px]">
                              {order.user?.name ?? 'Anonymous'}
                            </div>
                            <div className="text-xs text-gray-500 truncate max-w-[180px]">
                              {order.user?.email ?? 'No email'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-6 text-gray-600 text-sm whitespace-nowrap">
                        <div>{formatDate(order.createdAt)}</div>
                        <div className="text-[11px] text-gray-400">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Items */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-900 text-sm">
                            {lineItems.length}
                          </span>
                          <span className="text-xs text-gray-400">
                            {lineItems.length === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                      </td>

                      {/* Total */}
                      <td className="py-4 px-6 font-extrabold text-gray-900 text-sm whitespace-nowrap">
                        {formatMoney(orderTotal)}
                      </td>

                      {/* Status Dropdown (Quick Change) */}
                      <td className="py-4 px-6">
                        <div className="relative inline-block">
                          <select
                            value={order.status || 'pending'}
                            disabled={isUpdatingThis}
                            onChange={(e) => handleQuickStatusChange(order._id, e.target.value)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border appearance-none pr-7 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 ${getStatusStyle(order.status)}`}
                          >
                            {statusOptions.map((opt) => (
                              <option key={opt.value} value={opt.value} className="bg-white text-gray-900">
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-gray-400">
                            {isUpdatingThis ? (
                              <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                            ) : (
                              <ChevronRight className="w-3 h-3 rotate-90" />
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setInspectOrder(order)}
                            className="p-2 text-indigo-600 hover:text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100 rounded-lg transition-colors"
                            title="Inspect Order Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(order)}
                            className="p-2 text-red-600 hover:text-red-800 bg-red-50/70 hover:bg-red-100 rounded-lg transition-colors"
                            title="Delete Order"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Inspect Modal */}
      {inspectOrder && (
        <OrderInspectModal
          order={inspectOrder}
          onClose={() => setInspectOrder(null)}
          onRefresh={onRefresh}
          onShowToast={onShowToast}
        />
      )}

      {/* Confirm Delete Order Modal */}
      {confirmDelete && (
        <ConfirmModal
          title="Delete Order"
          message={`Are you sure you want to delete Order #${confirmDelete._id?.slice(-6).toUpperCase()}? This action cannot be undone.`}
          onConfirm={handleDeleteOrder}
          onCancel={() => setConfirmDelete(null)}
          loading={deleteLoading}
        />
      )}
    </>
  );
}

// ─── Team / Users Management ──────────────────────────────────────────────────

function RoleConfirmModal({ type, targetUser, onConfirm, onCancel, loading, error }) {

  if (!targetUser) return null;
  const isDemote = type === 'demote';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 ${isDemote ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'} rounded-full flex items-center justify-center shrink-0`}>
            {isDemote ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {isDemote ? 'Remove administrator access?' : 'Grant administrator access?'}
            </h3>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{targetUser.email}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="text-sm text-gray-600 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
          {isDemote ? (
            <p>
              This user (<strong className="text-gray-900">{targetUser.name}</strong>) will no longer be able to access the admin dashboard or perform administrative actions.
            </p>
          ) : (
            <p>
              This user (<strong className="text-gray-900">{targetUser.name}</strong>) will gain access to the administration dashboard and management features.
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-white transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm ${
              isDemote
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
            }`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isDemote ? 'Remove Access' : 'Grant Access'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TeamView({ currentUser, onShowToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [actionModal, setActionModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllUsers(searchQuery);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      onShowToast?.(err.message || 'Failed to load team members.', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, onShowToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleActionConfirm = async () => {
    if (!actionModal?.user) return;
    setActionLoading(true);
    setActionError('');
    try {
      await updateUserRole(actionModal.user._id, actionModal.type);
      const actionName = actionModal.type === 'promote' ? 'granted' : 'removed';
      onShowToast?.(`Administrator privileges ${actionName} for ${actionModal.user.name}.`, 'success');
      setActionModal(null);
      await fetchUsers();
    } catch (err) {
      setActionError(err.message || 'Failed to update user role.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteUser(deleteTarget._id);
      onShowToast?.(`User ${deleteTarget.name} deleted.`, 'success');
      setDeleteTarget(null);
      await fetchUsers();
    } catch (err) {
      onShowToast?.(err.message || 'Failed to delete user.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const isUserAdmin = Array.isArray(u.roles) && u.roles.includes('admin');
    if (roleFilter === 'admin' && !isUserAdmin) return false;
    if (roleFilter === 'user' && isUserAdmin) return false;
    return true;
  });

  const adminCount = users.filter((u) => Array.isArray(u.roles) && u.roles.includes('admin')).length;
  const standardUserCount = users.length - adminCount;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Team & Users</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage administrative access, team roles, and user accounts.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          Refresh Users
        </button>
      </div>

      {/* Info Notice on User Workflow */}
      <div className="mb-6 p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-start gap-3.5 text-xs text-indigo-900">
        <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-bold text-indigo-950 block mb-0.5">Secure Role Delegation:</strong>
          Team members create an account via standard registration. Administrators can then grant or revoke administrative privileges directly from this interface with full protection against self-lockout and last-admin removal.
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{users.length}</div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Accounts</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{adminCount}</div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Administrators</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{standardUserCount}</div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Accounts</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all',   label: 'All Users',     count: users.length },
            { id: 'admin', label: 'Administrators', count: adminCount },
            { id: 'user',  label: 'Customers',     count: standardUserCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                roleFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                roleFilter === tab.id ? 'bg-indigo-700/60 text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by user name or email address..."
            className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                {['User', 'Current Role', 'Joined Date', 'Actions'].map((h, i) => (
                  <th key={i} className="text-left py-4 px-6 text-gray-500 font-semibold text-xs uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
                    <span className="text-sm text-gray-400">Loading user accounts...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-semibold text-gray-600 mb-1">No users found</p>
                    <p className="text-sm text-gray-400">
                      {searchQuery ? 'Try clearing your search keyword.' : 'Registered users will appear here.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isUserAdmin = Array.isArray(u.roles) && u.roles.includes('admin');
                  const isCurrentAuthUser = currentUser?._id && String(u._id) === String(currentUser._id);

                  return (
                    <tr key={u._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      {/* User Info */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full font-bold text-sm flex items-center justify-center shrink-0 shadow-sm ${
                            isUserAdmin
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-indigo-100 text-indigo-700'
                          }`}>
                            {(u.name ?? u.email ?? 'U')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900 truncate max-w-[200px]">
                                {u.name || 'Unnamed User'}
                              </span>
                              {isCurrentAuthUser && (
                                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 truncate max-w-[240px]">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Current Role Badge */}
                      <td className="py-4 px-6">
                        {isUserAdmin ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Shield className="w-3.5 h-3.5" />
                            Administrator
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                            <UserCheck className="w-3.5 h-3.5" />
                            Customer
                          </span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="py-4 px-6 text-gray-600 text-sm whitespace-nowrap">
                        <div>{formatDate(u.createdAt)}</div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          {isUserAdmin ? (
                            isCurrentAuthUser ? (
                              <button
                                disabled
                                title="You cannot remove administrator privileges from your own account."
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed flex items-center gap-1.5"
                              >
                                <Shield className="w-3.5 h-3.5" />
                                Current Account
                              </button>
                            ) : (
                              <button
                                onClick={() => { setActionError(''); setActionModal({ type: 'demote', user: u }); }}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors flex items-center gap-1.5"
                                title="Remove Administrator Access"
                              >
                                <ShieldAlert className="w-3.5 h-3.5" />
                                Remove Admin
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => { setActionError(''); setActionModal({ type: 'promote', user: u }); }}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors flex items-center gap-1.5"
                              title="Grant Administrator Access"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Grant Admin
                            </button>
                          )}

                          {!isCurrentAuthUser && (
                            <button
                              onClick={() => setDeleteTarget(u)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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

      {/* Role Confirmation Modal */}
      {actionModal && (
        <RoleConfirmModal
          type={actionModal.type}
          targetUser={actionModal.user}
          onConfirm={handleRoleActionConfirm}
          onCancel={() => { setActionModal(null); setActionError(''); }}
          loading={actionLoading}
          error={actionError}
        />
      )}

      {/* Delete User Modal */}
      {deleteTarget && (
        <ConfirmModal
          title="Delete User Account"
          message={`Are you sure you want to delete user ${deleteTarget.name} (${deleteTarget.email})? This action cannot be undone.`}
          onConfirm={handleDeleteUser}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}
    </>
  );
}

// ─── Admin Dashboard (Main) ───────────────────────────────────────────────────

export default function AdminDashboard({ onNavigate, onShowToast }) {
  const { user, logout, isAdmin, isAuthenticated } = useAuth();
  const [activeView, setActiveView] = useState('overview');

  const [products,   setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders,     setOrders]     = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError,  setDataError]  = useState('');

  // Triggers for "Add" modal from Overview quick-action cards
  const [prodAddTrigger, setProdAddTrigger] = useState(false);
  const [catAddTrigger,  setCatAddTrigger]  = useState(false);

  const fetchAll = useCallback(async () => {
    setLoadingData(true);
    setDataError('');
    try {
      const [prods, cats, ords] = await Promise.all([
        getAllProducts(),
        getAllCategories(),
        getAllOrders(),
      ]);
      setProducts(prods);
      setCategories(cats);
      setOrders(ords);
    } catch (err) {
      setDataError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchAll();
    }
  }, [isAuthenticated, isAdmin, fetchAll]);

  // Guard: redirect non-admins or expired sessions
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-10 shadow-xl text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {!isAuthenticated ? 'Session Expired' : 'Access Denied'}
          </h2>
          <p className="text-gray-500 mb-6">
            {!isAuthenticated
              ? 'Your session has expired or is invalid. Please sign in again.'
              : 'You need administrator privileges to access this area.'}
          </p>
          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => onNavigate?.('auth')}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20"
            >
              Sign In
            </button>
            <button
              onClick={() => onNavigate?.('shop')}
              className="w-full px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Go to Store
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'overview',   label: 'Overview',   Icon: LayoutDashboard },
    { id: 'products',   label: 'Products',   Icon: Package },
    { id: 'categories', label: 'Categories', Icon: Tag },
    { id: 'orders',     label: 'Orders',     Icon: ClipboardList },
    { id: 'team',       label: 'Team',       Icon: Users },
  ];


  const handleOverviewNav = (view, action) => {
    setActiveView(view);
    if (view === 'products'   && action === 'add') setProdAddTrigger(true);
    if (view === 'categories' && action === 'add') setCatAddTrigger(true);
  };

  const userInitial = (user?.name ?? user?.email ?? 'A')[0].toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Sidebar ── */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-30 shadow-2xl">

        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <button
            onClick={() => onNavigate?.('shop')}
            className="flex items-center space-x-3 focus:outline-none group w-full"
          >
            <div className="w-10 h-10 bg-white text-[#0A0A0A] font-serif-display font-bold text-lg flex items-center justify-center shrink-0">
              V
            </div>
            <div className="text-left">
              <div className="font-serif-display font-medium text-xl tracking-[0.15em] leading-none text-white">VÉLOR</div>
              <div className="text-slate-400 text-[10px] tracking-widest uppercase font-medium mt-1">Back-Office</div>
            </div>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-medium ${
                activeView === id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{label}</span>
              {activeView === id && <div className="ml-auto w-1.5 h-1.5 bg-white/60 rounded-full" />}
            </button>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="p-4 border-t border-slate-800 space-y-1">
          <button
            onClick={() => onNavigate?.('shop')}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all font-medium"
          >
            <Home className="w-5 h-5 shrink-0" />
            <span>Back to Store</span>
          </button>
          <button
            onClick={() => { logout(); onNavigate?.('shop'); }}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-900/40 hover:text-red-400 transition-all font-medium"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* User profile chip */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center shadow-md shrink-0">
              <span className="text-white font-bold text-sm">{userInitial}</span>
            </div>
            <div className="overflow-hidden">
              <div className="font-semibold text-sm text-white truncate">{user?.name ?? 'Admin'}</div>
              <div className="text-slate-400 text-xs truncate">{user?.email ?? ''}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 ml-64 flex flex-col">

        {/* Top bar */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-bold text-gray-900">Admin</span>
            <ChevronRight className="w-4 h-4" />
            <span className="capitalize text-gray-700">{activeView}</span>
          </div>
          <button
            onClick={fetchAll}
            disabled={loadingData}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50 disabled:opacity-50"
          >
            {loadingData
              ? <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )
            }
            Refresh
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-8">
          {dataError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center justify-between gap-4 text-sm shadow-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
                <span>{dataError}</span>
              </div>
              {(dataError.toLowerCase().includes('token') ||
                dataError.toLowerCase().includes('session') ||
                dataError.toLowerCase().includes('unauthorized') ||
                dataError.toLowerCase().includes('access denied')) && (
                <button
                  onClick={() => {
                    logout();
                    onNavigate?.('auth');
                  }}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors shrink-0 shadow-sm"
                >
                  Sign In Again
                </button>
              )}
            </div>
          )}

          {loadingData ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : (
            <>
              {activeView === 'overview' && (
                <OverviewView
                  products={products}
                  categories={categories}
                  orders={orders}
                  onNavigate={handleOverviewNav}
                />
              )}
              {activeView === 'products' && (
                <ProductsView
                  products={products}
                  categories={categories}
                  onRefresh={fetchAll}
                  onShowToast={onShowToast}
                  openAdd={prodAddTrigger}
                  setOpenAdd={setProdAddTrigger}
                />
              )}
              {activeView === 'categories' && (
                <CategoriesView
                  categories={categories}
                  onRefresh={fetchAll}
                  onShowToast={onShowToast}
                  openAdd={catAddTrigger}
                  setOpenAdd={setCatAddTrigger}
                />
              )}
              {activeView === 'orders' && (
                <OrdersView
                  orders={orders}
                  onRefresh={fetchAll}
                  onShowToast={onShowToast}
                />
              )}
              {activeView === 'team' && (
                <TeamView
                  currentUser={user}
                  onShowToast={onShowToast}
                />
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
