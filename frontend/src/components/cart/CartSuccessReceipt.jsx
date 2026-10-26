import { CheckCircle2 } from 'lucide-react';
import { formatPrice } from '../../data/products';

/**
 * CartSuccessReceipt — Order confirmation receipt shown after an order has been successfully placed.
 */
export default function CartSuccessReceipt({ placedOrder, onContinueShopping }) {
  if (!placedOrder) return null;

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto text-center justify-between animate-admin-view">
      <div className="py-6">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="font-serif-display text-2xl font-normal mb-2">
          Merci pour votre commande
        </h3>
        <p className="text-xs text-[#666] tracking-widest uppercase mb-6">
          Order #{placedOrder._id?.slice(-6).toUpperCase()}
        </p>

        <div className="bg-[#F7F6F2] p-4 text-left text-xs space-y-2 border border-[#E8E8E8] mb-6">
          <div className="flex justify-between">
            <span className="text-[#666]">Client:</span>
            <span className="font-semibold">{placedOrder.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#666]">Téléphone:</span>
            <span className="font-semibold">{placedOrder.customerPhone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#666]">Wilaya:</span>
            <span className="font-semibold">{placedOrder.wilaya}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#666]">Commune:</span>
            <span className="font-semibold">{placedOrder.commune}</span>
          </div>
          <div className="flex justify-between border-t border-[#E8E8E8] pt-2">
            <span className="text-[#666]">Total à payer:</span>
            <span className="font-bold text-sm text-[#0A0A0A]">
              {formatPrice(placedOrder.totalPrice)}
            </span>
          </div>
        </div>

        <p className="text-xs text-[#666] leading-relaxed">
          Notre équipe va vous contacter par téléphone pour confirmer la livraison de votre colis.
        </p>
      </div>

      <button
        onClick={onContinueShopping}
        className="w-full bg-[#0A0A0A] text-white py-4 text-xs tracking-[0.2em] uppercase font-medium hover:bg-[#333333] hover:-translate-y-[0.5px] active:scale-[0.99] transition-all duration-150 cursor-pointer"
        type="button"
      >
        Continuer mes achats
      </button>
    </div>
  );
}
