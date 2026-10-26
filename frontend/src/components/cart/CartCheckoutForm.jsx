import { Loader2, ShieldCheck } from 'lucide-react';
import { formatPrice } from '../../data/products';

/**
 * CartCheckoutForm — Delivery details and finalization form for Algerian cash-on-delivery orders.
 */
export default function CartCheckoutForm({
  formData,
  onInputChange,
  onSubmit,
  formError = '',
  isAuthenticated = false,
  wilayas = [],
  isAlgiers = false,
  cartCount = 0,
  subtotal = 0,
  shippingFee = 500,
  totalOrderPrice = 0,
  checkoutLoading = false,
}) {
  return (
    <form onSubmit={onSubmit} className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {formError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs">
            {formError}
          </div>
        )}

        <div className="flex items-center justify-between pb-3 border-b border-[#E8E8E8]">
          <span className="text-xs tracking-[0.2em] uppercase text-[#666] font-medium">
            Customer Information
          </span>
          {isAuthenticated ? (
            <span className="text-[10px] bg-green-50 text-green-700 font-semibold px-2 py-0.5 rounded">
              Profile linked
            </span>
          ) : (
            <span className="text-[10px] text-[#666]">Guest order</span>
          )}
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5 font-medium text-[#444]">
            Full Name *
          </label>
          <input
            type="text"
            name="customerName"
            value={formData.customerName}
            onChange={onInputChange}
            placeholder="e.g. Rayan Taleb"
            required
            className="w-full border border-[#CCC] px-3 py-2.5 text-xs focus:outline-none focus:border-[#0A0A0A] bg-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5 font-medium text-[#444]">
              Phone Number *
            </label>
            <input
              type="tel"
              name="customerPhone"
              value={formData.customerPhone}
              onChange={onInputChange}
              placeholder="0550 12 34 56"
              required
              className="w-full border border-[#CCC] px-3 py-2.5 text-xs focus:outline-none focus:border-[#0A0A0A] bg-white"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5 font-medium text-[#444]">
              Email (Optional)
            </label>
            <input
              type="email"
              name="customerEmail"
              value={formData.customerEmail}
              onChange={onInputChange}
              placeholder="you@email.com"
              className="w-full border border-[#CCC] px-3 py-2.5 text-xs focus:outline-none focus:border-[#0A0A0A] bg-white"
            />
          </div>
        </div>

        <div className="pt-2">
          <label className="block text-xs uppercase tracking-wider mb-1.5 font-medium text-[#444]">
            Wilaya *
          </label>
          <select
            name="wilaya"
            value={formData.wilaya}
            onChange={onInputChange}
            required
            className="w-full border border-[#CCC] px-3 py-2.5 text-xs focus:outline-none focus:border-[#0A0A0A] bg-white"
          >
            {wilayas.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5 font-medium text-[#444]">
            Commune / City *
          </label>
          <input
            type="text"
            name="commune"
            value={formData.commune}
            onChange={onInputChange}
            placeholder="e.g. Bab Ezzouar, Hydra, Es Senia..."
            required
            className="w-full border border-[#CCC] px-3 py-2.5 text-xs focus:outline-none focus:border-[#0A0A0A] bg-white"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5 font-medium text-[#444]">
            Delivery Address *
          </label>
          <textarea
            name="shippingAddress"
            rows={2}
            value={formData.shippingAddress}
            onChange={onInputChange}
            placeholder="Street name, building number, floor or landmarks..."
            required
            className="w-full border border-[#CCC] px-3 py-2.5 text-xs focus:outline-none focus:border-[#0A0A0A] bg-white resize-none"
          />
        </div>

        {/* Delivery Option */}
        <div className="pt-2">
          <span className="block text-xs uppercase tracking-wider mb-2 font-medium text-[#444]">
            Delivery Method
          </span>
          <div className="flex items-center justify-between p-3 border text-xs bg-[#F7F6F2] border-[#0A0A0A]">
            <div>
              <p className="font-semibold text-[#0A0A0A]">Home Delivery (À domicile)</p>
              <p className="text-[11px] text-[#666]">Delivered directly to your door</p>
            </div>
            <span className="font-semibold text-[#0A0A0A]">
              {formatPrice(isAlgiers ? 500 : 800)}
            </span>
          </div>
        </div>

        <div className="p-3 bg-[#F0F0F0] text-xs text-[#555] flex items-center gap-2">
          <ShieldCheck size={16} className="text-[#0A0A0A] shrink-0" />
          <span>Paiement à la livraison — Pay in cash upon receipt.</span>
        </div>
      </div>

      {/* Order Finalization Footer */}
      <div className="border-t border-[#E8E8E8] p-6 bg-[#F7F6F2] space-y-3">
        <div className="flex justify-between text-xs text-[#666]">
          <span>Items ({cartCount})</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-xs text-[#666]">
          <span>Shipping Fee</span>
          <span>{formatPrice(shippingFee)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold border-t border-[#E8E8E8] pt-2">
          <span>Total Due</span>
          <span className="text-base text-[#0A0A0A]">{formatPrice(totalOrderPrice)}</span>
        </div>

        <button
          type="submit"
          disabled={checkoutLoading}
          className="w-full bg-[#0A0A0A] text-white py-4 text-xs tracking-[0.2em] uppercase font-medium hover:bg-[#333333] hover:-translate-y-[0.5px] active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-70 mt-2"
        >
          {checkoutLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Confirming Order…</span>
            </>
          ) : (
            <span>Confirm Order • {formatPrice(totalOrderPrice)}</span>
          )}
        </button>
      </div>
    </form>
  );
}
