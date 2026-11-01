import { BACKEND_ORIGIN } from '../services/api/apiClient';

/**
 * Format a number as a price string.
 * Backend stores prices as raw numbers (e.g. 120000 = DZD or USD based on your context).
 * Here we display as-is with 2 decimal places.
 */
export const formatPrice = (price) => {
  if (price == null) return '—';
  return new Intl.NumberFormat('fr-DZ').format(price) + " DA";
};

/**
 * Default high-resolution fallback image for products without a specific image.
 */
export const DEFAULT_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=1000&fit=crop';

/**

 * Build a full image URL for a product image filename.
 * If the image is null/empty, returns a placeholder.
 */
export const getImageUrl = (filename) => {
  if (!filename) return 'https://placehold.co/400x400/e5e7eb/9ca3af?text=No+Image';
  // Already an absolute URL (external placeholder, CDN) or Data URI
  if (filename.startsWith('http') || filename.startsWith('data:')) return filename;
  const cleanPath = filename.replace(/^\/?uploads\//, '');
  if (BACKEND_ORIGIN) {
    return `${BACKEND_ORIGIN}/uploads/${cleanPath}`;
  }
  return `/uploads/${cleanPath}`;
};

/**
 * Get the initials of a name (max 2 chars)
 */
export const getInitials = (name = '') => {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
};
