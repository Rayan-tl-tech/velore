import { ShoppingBag } from 'lucide-react';

/**
 * CartEmptyState — Displayed when the shopping bag contains zero items.
 */
export default function CartEmptyState({ onClose }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-[#F7F6F2] flex items-center justify-center mb-6">
        <ShoppingBag size={24} className="text-[#666]" strokeWidth={1.5} />
      </div>
      <h3 className="font-serif-display text-2xl mb-2">Your bag is empty</h3>
      <p className="text-sm text-[#666] max-w-xs mb-8">
        Explore the seasonal collection and discover timeless essentials.
      </p>
      <button
        onClick={onClose}
        className="bg-[#0A0A0A] text-white px-8 py-3.5 text-xs tracking-[0.2em] uppercase font-medium hover:bg-[#333333] transition-colors cursor-pointer"
        type="button"
      >
        Start Shopping
      </button>
    </div>
  );
}
