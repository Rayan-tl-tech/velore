import { Link } from 'react-router-dom';
import { ShoppingBag, Receipt, Users, LayoutGrid } from 'lucide-react';
import AdminLayout from './AdminLayout';

const stats = [
  { label: 'Total Products', value: '48', change: '+4 this month', icon: ShoppingBag },
  { label: 'Total Orders', value: '126', change: '+12 this month', icon: Receipt },
  { label: 'Total Customers', value: '94', change: '+8 this month', icon: Users },
  { label: 'Total Revenue', value: '842 500 DA', change: '+6.4% demo comparison', icon: LayoutGrid },
];

const recentOrders = [
  { id: '#VL-1048', customer: 'Demo Customer A', date: '18 May 2026', items: 2, total: '18 700 DA', status: 'DELIVERED' },
  { id: '#VL-1047', customer: 'Demo Customer B', date: '18 May 2026', items: 1, total: '12 300 DA', status: 'PROCESSING' },
  { id: '#VL-1046', customer: 'Demo Customer C', date: '17 May 2026', items: 1, total: '7 400 DA', status: 'SHIPPED' },
  { id: '#VL-1045', customer: 'Demo Customer D', date: '16 May 2026', items: 3, total: '9 800 DA', status: 'PENDING' },
];

const statusColors = {
  DELIVERED: 'bg-green-100 text-green-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-amber-100 text-amber-800',
  ACTIVE: 'bg-green-100 text-green-800',
  DRAFT: 'bg-amber-100 text-amber-800',
};

export default function Overview() {
  return (
    <AdminLayout>
      <div className="bg-[#F0F0F0] border-l-4 border-[#0A0A0A] px-6 py-4 mb-8">
        <p className="text-xs tracking-[0.15em] uppercase text-[#666]">
          Demonstration Data — No figures represent real VÉLOR activity.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white border border-[#E8E8E8] p-6">
            <div className="flex items-start justify-between mb-4">
              <p className="text-sm text-[#666]">{stat.label}</p>
              <div className="w-10 h-10 bg-[#F5F5F5] flex items-center justify-center">
                <stat.icon size={20} strokeWidth={1.5} className="text-[#666]" />
              </div>
            </div>
            <p className="font-serif-display text-4xl font-normal mb-2">{stat.value}</p>
            <p className="text-xs text-[#666]">{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white border border-[#E8E8E8] p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-[#666] mb-2">Sales Overview</p>
              <h2 className="font-serif-display text-3xl font-normal">Performance</h2>
            </div>
            <select className="border border-[#E8E8E8] px-4 py-2 text-sm focus:outline-none">
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-64 relative">
            <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
              <line x1="0" y1="50" x2="600" y2="50" stroke="#E8E8E8" strokeWidth="1" />
              <line x1="0" y1="100" x2="600" y2="100" stroke="#E8E8E8" strokeWidth="1" />
              <line x1="0" y1="150" x2="600" y2="150" stroke="#E8E8E8" strokeWidth="1" />
              <text x="0" y="55" fontSize="10" fill="#999">40K</text>
              <text x="0" y="105" fontSize="10" fill="#999">30K</text>
              <text x="0" y="155" fontSize="10" fill="#999">20K</text>
              <text x="0" y="195" fontSize="10" fill="#999">10K</text>
              <text x="50" y="195" fontSize="10" fill="#999">May 01</text>
              <text x="170" y="195" fontSize="10" fill="#999">May 08</text>
              <text x="290" y="195" fontSize="10" fill="#999">May 15</text>
              <text x="410" y="195" fontSize="10" fill="#999">May 22</text>
              <text x="530" y="195" fontSize="10" fill="#999">May 30</text>
              <path
                d="M 50 150 L 110 120 L 170 130 L 230 80 L 290 60 L 350 90 L 410 50 L 470 70 L 530 40 L 590 60 L 590 180 L 50 180 Z"
                fill="#F5F5F5"
                opacity="0.5"
              />
              <path
                d="M 50 150 L 110 120 L 170 130 L 230 80 L 290 60 L 350 90 L 410 50 L 470 70 L 530 40 L 590 60"
                fill="none"
                stroke="#0A0A0A"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>

        <div className="bg-white border border-[#E8E8E8] p-8">
          <div className="mb-8">
            <p className="text-xs tracking-[0.2em] uppercase text-[#666] mb-2">Inventory</p>
            <h2 className="font-serif-display text-3xl font-normal">Stock status</h2>
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm">In stock</p>
                <p className="text-sm font-medium">38</p>
              </div>
              <div className="h-2 bg-[#F5F5F5] rounded-full overflow-hidden">
                <div className="h-full bg-[#0A0A0A] rounded-full" style={{ width: '80%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm">Low stock</p>
                <p className="text-sm font-medium">7</p>
              </div>
              <div className="h-2 bg-[#F5F5F5] rounded-full overflow-hidden">
                <div className="h-full bg-[#0A0A0A] rounded-full" style={{ width: '15%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm">Out of stock</p>
                <p className="text-sm font-medium">3</p>
              </div>
              <div className="h-2 bg-[#F5F5F5] rounded-full overflow-hidden">
                <div className="h-full bg-[#0A0A0A] rounded-full" style={{ width: '5%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#E8E8E8] p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-[#666] mb-2">Demo Orders</p>
            <h2 className="font-serif-display text-3xl font-normal">Recent orders</h2>
          </div>
          <Link to="/admin/orders" className="text-sm flex items-center gap-2 hover:gap-3 transition-all">
            View all <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E8E8E8]">
                <th className="text-left py-4 px-4 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Order</th>
                <th className="text-left py-4 px-4 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Customer</th>
                <th className="text-left py-4 px-4 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Date</th>
                <th className="text-left py-4 px-4 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Items</th>
                <th className="text-left py-4 px-4 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Total</th>
                <th className="text-left py-4 px-4 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-[#E8E8E8] last:border-0">
                  <td className="py-4 px-4 text-sm font-medium">{order.id}</td>
                  <td className="py-4 px-4 text-sm">{order.customer}</td>
                  <td className="py-4 px-4 text-sm text-[#666]">{order.date}</td>
                  <td className="py-4 px-4 text-sm">{order.items}</td>
                  <td className="py-4 px-4 text-sm">{order.total}</td>
                  <td className="py-4 px-4">
                    <span className={`inline-block px-3 py-1 text-xs tracking-[0.1em] uppercase ${statusColors[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
