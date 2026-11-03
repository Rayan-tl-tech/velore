import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import ImageUploadDropzone from '../../common/ImageUploadDropzone';
import { createProduct, updateProduct } from '../../../services/api/productService';

/**
 * ProductFormModal — Add / Edit product modal dialog with form validation,
 * category selection, pricing, inventory quantity, and image dropzone.
 */
export default function ProductFormModal({
  isOpen,
  product = null,
  categories = [],
  onClose,
  onSuccess,
}) {
  const isEditing = Boolean(product);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    stock: '',
    description: '',
    image: '',
    newArrival: false,
    colors: [],
  });

  const [colorInput, setColorInput] = useState('');
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [optimizingImage, setOptimizingImage] = useState(false);

  // Initialize or reset form state when modal opens or editing product changes
  useEffect(() => {
    if (!isOpen) return;

    if (product) {
      setFormData({
        name: product.name || '',
        category: typeof product.category === 'object' ? product.category?._id : product.category || '',
        price: product.price || '',
        stock: product.stock ?? '',
        description: product.description || '',
        image: product.image || '',
        newArrival: product.newArrival === true || (product.newArrival === undefined && product.collection === 'new-arrivals'),
        colors: Array.isArray(product.colors) ? product.colors : [],
      });
    } else {
      setFormData({
        name: '',
        category: categories[0]?._id || '',
        price: '',
        stock: '',
        description: '',
        image: '',
        newArrival: false,
        colors: [],
      });
    }

    setColorInput('');
    setFormError(null);
    setSubmitting(false);
    setUploadingImage(false);
    setOptimizingImage(false);
  }, [isOpen, product, categories]);

  const handleAddColor = (colorToAdd) => {
    const trimmed = (colorToAdd || colorInput).trim();
    if (!trimmed) return;
    if (formData.colors.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setColorInput('');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      colors: [...prev.colors, trimmed],
    }));
    setColorInput('');
  };

  const handleRemoveColor = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      colors: prev.colors.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      return setFormError('Product name is required');
    }
    if (!formData.price || Number(formData.price) <= 0) {
      return setFormError('Valid price is required');
    }
    if (formData.stock === '' || Number(formData.stock) < 0) {
      return setFormError('Valid stock quantity is required');
    }
    if (uploadingImage || optimizingImage) {
      return setFormError('Please wait for the image processing to complete before saving.');
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const payload = new FormData();
      payload.append('name', formData.name.trim());
      payload.append('price', Number(formData.price));
      payload.append('stock', Number(formData.stock));
      payload.append('description', formData.description.trim());
      payload.append('newArrival', String(formData.newArrival));
      payload.append('colors', JSON.stringify(formData.colors));
      if (formData.category) payload.append('category', formData.category);
      if (formData.image) payload.append('image', formData.image.trim());

      let result;
      let successMsg;

      if (isEditing) {
        result = await updateProduct(product._id, payload);
        successMsg = `Product "${formData.name}" updated successfully!`;
      } else {
        result = await createProduct(payload);
        successMsg = `Product "${formData.name}" added to catalog!`;
      }

      onSuccess?.(result, successMsg);
      onClose();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-lg border border-[#E8E8E8] shadow-2xl flex flex-col max-h-[90vh] my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#E8E8E8] shrink-0">
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#666] mb-1">
              {isEditing ? 'Update Product' : 'New Catalog Item'}
            </p>
            <h3 className="font-serif-display text-xl sm:text-2xl">
              {isEditing ? 'Edit Product' : 'Add New Product'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#666] hover:text-[#0A0A0A] transition-colors cursor-pointer"
            title="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
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

          {/* Reusable Image Upload Dropzone */}
          <ImageUploadDropzone
            value={formData.image}
            onChange={(url) => setFormData((prev) => ({ ...prev, image: url }))}
            disabled={submitting}
            onUploadingChange={setUploadingImage}
            onOptimizingChange={setOptimizingImage}
          />

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

          {/* New Arrival Toggle */}
          <div className="pt-2 pb-1 border-t border-[#F0F0F0]">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.newArrival}
                onChange={(e) => setFormData((prev) => ({ ...prev, newArrival: e.target.checked }))}
                className="w-4 h-4 border border-[#D0D0D0] rounded-none accent-[#0A0A0A] cursor-pointer"
              />
              <div className="flex-1">
                <span className="text-xs uppercase tracking-wider text-[#0A0A0A] font-medium block">
                  New Arrival
                </span>
                <span className="text-[11px] text-[#666]">
                  Display this piece in the curated New Arrivals storefront section
                </span>
              </div>
            </label>
          </div>

          {/* Available Colors Section */}
          <div className="pt-3 pb-1 border-t border-[#F0F0F0]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs uppercase tracking-wider text-[#666] font-medium">
                Available Colors
              </label>
              <span className="text-[11px] text-[#888]">
                {formData.colors.length} color{formData.colors.length === 1 ? '' : 's'} defined
              </span>
            </div>

            {/* List of currently added colors */}
            {formData.colors.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.colors.map((color, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#F7F6F2] border border-[#E8E8E8] text-xs text-[#0A0A0A]"
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-medium">{color}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveColor(idx)}
                      className="text-[#888] hover:text-red-600 transition-colors cursor-pointer ml-0.5 font-bold"
                      title={`Remove ${color}`}
                      aria-label={`Remove color ${color}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add color input bar */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={colorInput}
                onChange={(e) => setColorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddColor();
                  }
                }}
                placeholder="e.g. Black, White, Beige, #4A6B8A"
                className="flex-1 border border-[#D0D0D0] px-3 py-1.5 text-xs focus:outline-none focus:border-[#0A0A0A]"
              />
              <button
                type="button"
                onClick={() => handleAddColor()}
                disabled={!colorInput.trim()}
                className="px-3.5 py-1.5 text-xs tracking-wider uppercase border border-[#0A0A0A] bg-[#0A0A0A] text-white hover:bg-[#333] transition-colors cursor-pointer disabled:opacity-40"
              >
                + Add Color
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#666] flex-wrap">
              <span className="text-[#888]">Presets:</span>
              {['Black', 'White', 'Beige', 'Navy', 'Olive', 'Camel'].map((preset) => {
                const alreadySelected = formData.colors.some(
                  (c) => c.toLowerCase() === preset.toLowerCase()
                );
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleAddColor(preset)}
                    disabled={alreadySelected}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 border text-[10px] transition-colors ${
                      alreadySelected
                        ? 'opacity-40 border-[#E8E8E8] cursor-not-allowed bg-[#F9F9F9]'
                        : 'border-[#E0E0E0] hover:border-[#0A0A0A] cursor-pointer bg-white'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full border border-black/15 inline-block shrink-0"
                      style={{ backgroundColor: preset }}
                    />
                    <span>{preset}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E8E8E8] shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting || uploadingImage}
              className="px-4 py-2 text-xs tracking-wider uppercase border border-[#E8E8E8] hover:border-[#0A0A0A] transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploadingImage || optimizingImage}
              className="bg-[#0A0A0A] text-white px-5 py-2 text-xs tracking-wider uppercase hover:bg-[#333333] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {uploadingImage
                ? 'Uploading image...'
                : submitting
                ? 'Saving...'
                : isEditing
                ? 'Update Product'
                : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
