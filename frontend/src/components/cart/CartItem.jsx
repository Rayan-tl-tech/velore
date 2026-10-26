import { Minus, Plus, Trash2 } from 'lucide-react';
import { getImageUrl } from '../../utils/formatters';
import { formatPrice } from '../../data/products';

/**
 * CartItem — Individual row representing a product in the shopping bag
 * with image preview, size badge, unit price, quantity stepper, and remove action.
 */
export default function CartItem({
  item,
  isUpdating = false,
  onQuantityChange,
  onRemove,
}) {
  const p = item.product || {};
  const size = item.size || 'M';

  return (
    <div className="flex gap-4 pt-4 first:pt-0">
      {/* Thumbnail */}
      <div className="w-20 h-26 bg-[#F0F0F0] overflow-hidden shrink-0">
        <img
          src={
            p.image
              ? getImageUrl(p.image)
              : 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=1000&fit=crop'
          }
          alt={p.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Product Details & Actions */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start gap-2">
            <h4 className="text-sm font-medium leading-tight text-[#0A0A0A]">
              {p.name}
            </h4>
            <button
              onClick={onRemove}
              disabled={isUpdating}
              className="text-[#888] hover:text-[#0A0A0A] p-1 transition-colors cursor-pointer"
              title="Remove item"
              type="button"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <p className="text-xs text-[#666] mt-1">
            Size: <span className="font-semibold text-[#0A0A0A]">{size}</span>
          </p>
          <p className="text-sm font-medium text-[#0A0A0A] mt-1">
            {formatPrice(p.price)}
          </p>
        </div>

        {/* Quantity Stepper & Line Total */}
        <div className="flex items-center justify-between pt-2">
          <div className="inline-flex items-center border border-[#E8E8E8] text-xs">
            <button
              onClick={() => onQuantityChange(-1)}
              disabled={isUpdating}
              className="p-1.5 hover:bg-[#F7F6F2] transition-colors cursor-pointer disabled:opacity-30"
              type="button"
              aria-label="Decrease quantity"
            >
              <Minus size={12} />
            </button>
            <span className="px-3 font-medium min-w-6 text-center">
              {item.quantity}
            </span>
            <button
              onClick={() => onQuantityChange(1)}
              disabled={isUpdating}
              className="p-1.5 hover:bg-[#F7F6F2] transition-colors cursor-pointer disabled:opacity-30"
              type="button"
              aria-label="Increase quantity"
            >
              <Plus size={12} />
            </button>
          </div>
          <span className="text-xs font-semibold">
            {formatPrice((Number(p.price) || 0) * item.quantity)}
          </span>
        </div>
      </div>
    </div>
  );
}
