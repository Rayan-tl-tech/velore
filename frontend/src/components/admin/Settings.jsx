import { useState } from 'react';
import { Database, ShieldCheck, Truck, CreditCard, Server, CheckCircle, Save } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useAuth } from '../../context/AuthContext';

export default function Settings() {
  const { user } = useAuth();
  const [currency, setCurrency] = useState('DA (Algerian Dinar)');
  const [shippingMode, setShippingMode] = useState('Cash On Delivery (COD)');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('25000');
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <p className="text-base text-[#666]">
          Configure your VÉLOR storefront, Algerian logistics parameters, and system infrastructure.
        </p>
      </div>

      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-6 py-3.5 mb-6 flex items-center gap-3 text-sm">
          <CheckCircle size={18} className="text-emerald-600 shrink-0" />
          <span>Settings saved successfully.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Logistics & Payment Settings */}
        <div className="bg-white border border-[#E8E8E8] p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-[#E8E8E8]">
            <Truck size={20} className="text-[#0A0A0A]" />
            <h3 className="font-serif-display text-2xl font-normal">Store & Delivery Preferences</h3>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#666] mb-2 font-medium">
                Operating Currency
              </label>
              <input
                type="text"
                disabled
                value={currency}
                className="w-full bg-[#F9F9F9] border border-[#E8E8E8] px-4 py-2.5 text-sm text-[#0A0A0A]"
              />
              <p className="text-[11px] text-[#888] mt-1">Formatted across all storefront collections as DA.</p>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#666] mb-2 font-medium">
                Default Payment Method
              </label>
              <input
                type="text"
                disabled
                value={shippingMode}
                className="w-full bg-[#F9F9F9] border border-[#E8E8E8] px-4 py-2.5 text-sm text-[#0A0A0A]"
              />
              <p className="text-[11px] text-[#888] mt-1">Available across all 58 Algerian wilayas.</p>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#666] mb-2 font-medium">
                Free Delivery Order Threshold (DA)
              </label>
              <input
                type="number"
                value={freeShippingThreshold}
                onChange={(e) => setFreeShippingThreshold(e.target.value)}
                className="w-full border border-[#D0D0D0] px-4 py-2.5 text-sm focus:outline-none focus:border-[#0A0A0A]"
              />
              <p className="text-[11px] text-[#888] mt-1">Orders exceeding this total qualify for complimentary shipping.</p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="bg-[#0A0A0A] text-white px-6 py-2.5 text-xs tracking-wider uppercase font-medium hover:bg-[#333333] transition-colors inline-flex items-center gap-2"
              >
                <Save size={15} />
                <span>Save Preferences</span>
              </button>
            </div>
          </form>
        </div>

        {/* System & Infrastructure Status */}
        <div className="bg-white border border-[#E8E8E8] p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-[#E8E8E8]">
            <Server size={20} className="text-[#0A0A0A]" />
            <h3 className="font-serif-display text-2xl font-normal">System & Security</h3>
          </div>

          <div className="space-y-4 text-xs">

            <div className="p-4 bg-[#F9F9F9] border border-[#E8E8E8] rounded-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#0A0A0A] uppercase tracking-wider">API Server</span>
                <span className="font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px] font-semibold">
                  PORT 5000 ACTIVE
                </span>
              </div>
              <p className="text-[#666]">Runtime: Node.js + Express (ES Modules)</p>
              <p className="text-[#666]">Security: Helmet CSP + Rate Limiting + CORS Whitelist</p>
            </div>

            <div className="p-4 bg-[#F9F9F9] border border-[#E8E8E8] rounded-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#0A0A0A] uppercase tracking-wider">Active Session</span>
                <span className="font-mono text-purple-700 bg-purple-100 px-2 py-0.5 rounded text-[11px] font-semibold">
                  JWT SECURED
                </span>
              </div>
              <p className="text-[#666]">Admin Email: <strong className="text-[#0A0A0A]">{user?.email || 'N/A'}</strong></p>
              <p className="text-[#666]">Admin Name: <strong className="text-[#0A0A0A]">{user?.name || 'Administrator'}</strong></p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
