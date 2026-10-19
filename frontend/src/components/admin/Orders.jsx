import { useState } from 'react';
import { Search } from 'lucide-react';
import AdminLayout from './AdminLayout';

const adminOrders = [
  { id: '#VL-1048', customer: 'Demo Customer A', date: '18 May 2026', items: 2, total: '18 700 DA', payment: 'COD · Demo', status: 'DELIVERED' },
  { id: '#VL-1047', customer: 'Demo Customer B', date: '18 May 2026', items: 1, total: '12 300 DA', payment: 'COD · Demo', status: 'PROCESSING' },
  { id: '#VL-1046', customer: 'Demo Customer C', date: '17 May 2026', items: 1, total: '7 400 DA', payment: 'COD · Demo', status: 'SHIPPED' },
  { id: '#VL-1045', customer: 'Demo Customer D', date: '16 May 2026', items: 3, total: '9 800 DA', payment: 'COD · Demo', status: 'PENDING' },
];

const statusColors = {
  DELIVERED: 'bg-green-100 text-green-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-amber-100 text-amber-800',
};

export default function Orders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');

  const filteredOrders = adminOrders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All statuses' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout>
      <p className="text-base text-[#666] mb-8">Review and update fictional customer orders.</p>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
        <div className="flex-1 flex items-center gap-3 bg-white border border-[#E8E8E8] px-4 py-3">
          <Search size={18} strokeWidth={1.5} className="text-[#666]" />
          <input
            type="text"
            placeholder="Search orders"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-[#E8E8E8] px-4 py-3 text-sm focus:outline-none"
        >
          <option>All statuses</option>
          <option>DELIVERED</option>
          <option>PROCESSING</option>
          <option>SHIPPED</option>
          <option>PENDING</option>
        </select>
        <input
          type="date"
          className="bg-white border border-[#E8E8E8] px-4 py-3 text-sm focus:outline-none"
        />
      </div>
      <div className="bg-white border border-[#E8E8E8]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E8E8E8] bg-[#F9F9F9]">
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Order ID</th>
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Customer</th>
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Date</th>
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Items</th>
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Total</th>
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Payment</th>
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-b border-[#E8E8E8] last:border-0 hover:bg-[#FAFAFA] transition-colors">
                  <td className="py-4 px-6 text-sm font-medium">{order.id}</td>
                  <td className="py-4 px-6 text-sm">{order.customer}</td>
                  <td className="py-4 px-6 text-sm text-[#666]">{order.date}</td>
                  <td className="py-4 px-6 text-sm">{order.items}</td>
                  <td className="py-4 px-6 text-sm">{order.total}</td>
                  <td className="py-4 px-6 text-sm text-[#666]">{order.payment}</td>
                  <td className="py-4 px-6">
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
