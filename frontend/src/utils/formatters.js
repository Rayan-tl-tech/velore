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
 * Build a full image URL for a product image filename.
 * If the image is null/empty, returns a placeholder.
 */
export const getImageUrl = (filename) => {
  if (!filename) return 'https://placehold.co/400x400/e5e7eb/9ca3af?text=No+Image';
  // Already an absolute URL (external placeholder, CDN) or Data URI
  if (filename.startsWith('http') || filename.startsWith('data:')) return filename;
  const cleanPath = filename.replace(/^\/?uploads\//, '');
  const apiUrl =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? 'https://final-project-backend-5htz.onrender.com' : '');
  if (apiUrl) {
    const base = apiUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
    return `${base}/uploads/${cleanPath}`;
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
