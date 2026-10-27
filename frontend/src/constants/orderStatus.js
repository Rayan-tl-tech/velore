/**
 * Mapping of order status strings (both uppercase and lowercase)
 * to Tailwind CSS badge styling classes for consistent admin display.
 */
export const ORDER_STATUS_COLORS = {
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-emerald-100 text-emerald-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  processing: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-gray-100 text-gray-800',
  shipped: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-amber-100 text-amber-800',
  pending: 'bg-amber-100 text-amber-800',
  CANCELLED: 'bg-red-100 text-red-800',
  cancelled: 'bg-red-100 text-red-800',
};
