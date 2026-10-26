import { useState, useRef, useEffect } from 'react';
import { UploadCloud, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { shouldOptimizeImage, optimizeImageIfNeeded, formatFileSize } from '../../utils/imageOptimizer';
import { uploadProductImage } from '../../services/api/productService';

/**
 * ImageUploadDropzone — Reusable drag-and-drop image upload zone with client-side
 * format validation, intelligent size optimization (>5MB), local preview, and storage upload.
 */
export default function ImageUploadDropzone({
  value = '',
  onChange,
  disabled = false,
  onUploadingChange,
  onOptimizingChange,
}) {
  const [imagePreview, setImagePreview] = useState(value || '');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [optimizingImage, setOptimizingImage] = useState(false);
  const [optimizationInfo, setOptimizationInfo] = useState(null);
  const [imageUploadError, setImageUploadError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Sync internal preview if external value changes (e.g. form reset or product load)
  useEffect(() => {
    setImagePreview(value || '');
  }, [value]);

  const notifyUploading = (status) => {
    setUploadingImage(status);
    onUploadingChange?.(status);
  };

  const notifyOptimizing = (status) => {
    setOptimizingImage(status);
    onOptimizingChange?.(status);
  };

  const processSelectedFile = async (file) => {
    if (!file || disabled) return;

    setImageUploadError(null);
    setOptimizationInfo(null);

    // 1. Client-side format validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const extension = file.name?.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(extension)) {
      setImageUploadError('Invalid format. Please select a JPG, PNG, or WebP image.');
      return;
    }

    let fileToUpload = file;

    // 2. Intelligent Optimization check: ONLY optimize if file > 5MB
    if (shouldOptimizeImage(file)) {
      try {
        notifyOptimizing(true);
        const result = await optimizeImageIfNeeded(file);
        fileToUpload = result.file;
        setOptimizationInfo({
          originalSize: result.originalSize,
          finalSize: result.finalSize,
          optimized: true,
        });
      } catch (err) {
        notifyOptimizing(false);
        setImageUploadError(err.message || 'Image optimization failed. Please choose a lighter image.');
        return;
      } finally {
        notifyOptimizing(false);
      }
    } else {
      // File is already <= 5MB: DO NOT compress. Preserve 100% original.
      setOptimizationInfo({
        originalSize: file.size,
        finalSize: file.size,
        optimized: false,
      });
    }

    // 3. Instant local preview
    const localPreviewUrl = URL.createObjectURL(fileToUpload);
    setImagePreview(localPreviewUrl);

    // 4. Upload immediately to storage provider (Cloudinary in prod / storage)
    try {
      notifyUploading(true);
      const res = await uploadProductImage(fileToUpload);
      if (res && res.url) {
        setImagePreview(res.url);
        onChange?.(res.url);
      } else {
        throw new Error('No image URL returned from storage');
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to upload image. Please try again.';
      setImageUploadError(msg);
      // Restore previous image if available
      if (value) {
        setImagePreview(value);
      }
    } finally {
      notifyUploading(false);
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
    onChange?.('');
    setImageUploadError(null);
    notifyOptimizing(false);
    setOptimizationInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-[#666] mb-1.5 font-medium">
        Product Image
      </label>

      {imagePreview || optimizingImage ? (
        <div className="relative border border-[#E8E8E8] bg-[#FAFAFA] p-3.5 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 bg-[#F0F0F0] border border-[#E0E0E0] shrink-0 overflow-hidden flex items-center justify-center">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Product preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#F7F7F7] text-[#999]">
                <UploadCloud size={24} className="mb-1" />
              </div>
            )}

            {/* Optimizing State Overlay */}
            {optimizingImage && (
              <div className="absolute inset-0 bg-black/65 backdrop-blur-xs flex flex-col items-center justify-center text-white p-2 text-center z-10">
                <Loader2 className="w-5 h-5 animate-spin mb-1 text-white" />
                <span className="text-[10px] tracking-wider uppercase font-medium">Optimizing...</span>
              </div>
            )}

            {/* Uploading State Overlay */}
            {!optimizingImage && uploadingImage && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white p-2 text-center z-10">
                <Loader2 className="w-5 h-5 animate-spin mb-1 text-white" />
                <span className="text-[10px] tracking-wider uppercase font-medium">Uploading...</span>
              </div>
            )}
          </div>

          <div className="flex-1 w-full flex flex-col justify-between py-1">
            <div>
              <div className="flex items-center flex-wrap gap-2 mb-1">
                <span className="text-xs font-medium text-[#0A0A0A]">
                  {optimizingImage
                    ? 'Optimizing image...'
                    : uploadingImage
                    ? 'Uploading image...'
                    : 'Image ready'}
                </span>

                {/* Badge: Optimization report (only if image was >5MB and got optimized) */}
                {optimizationInfo?.optimized && !optimizingImage && (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                    <CheckCircle size={10} />
                    {formatFileSize(optimizationInfo.originalSize)} → {formatFileSize(optimizationInfo.finalSize)}
                  </span>
                )}

                {/* Badge: Uploaded to storage */}
                {!optimizingImage && !uploadingImage && value && (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                    <CheckCircle size={10} /> Uploaded
                  </span>
                )}
              </div>

              <p className="text-[11px] text-[#777] mb-3">
                {optimizingImage
                  ? 'File exceeds 5MB. Optimizing dimensions and compression while preserving high visual quality...'
                  : uploadingImage
                  ? 'Transmitting file to storage provider...'
                  : 'This image will be displayed on the storefront and product catalog.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || uploadingImage || optimizingImage}
                className="px-3 py-1.5 text-xs tracking-wider uppercase border border-[#D0D0D0] hover:border-[#0A0A0A] bg-white text-[#0A0A0A] transition-colors disabled:opacity-50 cursor-pointer"
              >
                Replace Image
              </button>
              <button
                type="button"
                onClick={handleRemoveImage}
                disabled={disabled || uploadingImage || optimizingImage}
                className="px-3 py-1.5 text-xs tracking-wider uppercase text-red-600 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !disabled && !optimizingImage && fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (!disabled && e.dataTransfer.files && e.dataTransfer.files[0]) {
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
            JPG, PNG, WebP · Auto-optimized if &gt; 5MB
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
  );
}
