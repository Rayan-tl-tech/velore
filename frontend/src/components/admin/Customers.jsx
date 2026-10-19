import { useState } from 'react';
import { Search } from 'lucide-react';
import AdminLayout from './AdminLayout';

const customers = [
  { id: 1, name: 'Demo Customer A', email: 'customer-a@example.demo', phone: '0550 12 34 56', orders: 4, spent: '54 300 DA', registered: '12 Apr 2026' },
  { id: 2, name: 'Demo Customer B', email: 'customer-b@example.demo', phone: '0661 23 45 67', orders: 2, spent: '26 700 DA', registered: '28 Mar 2026' },
  { id: 3, name: 'Demo Customer C', email: 'customer-c@example.demo', phone: '0770 34 56 78', orders: 5, spent: '68 100 DA', registered: '16 Mar 2026' },
  { id: 4, name: 'Demo Customer D', email: 'customer-d@example.demo', phone: '0555 98 76 54', orders: 1, spent: '9 800 DA', registered: '04 Feb 2026' },
];

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState('');
  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <p className="text-base text-[#666] mb-8">View customer profiles and order history.</p>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
        <div className="flex-1 flex items-center gap-3 bg-white border border-[#E8E8E8] px-4 py-3">
          <Search size={18} strokeWidth={1.5} className="text-[#666]" />
          <input
            type="text"
            placeholder="Search customers"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
        </div>
        <select className="bg-white border border-[#E8E8E8] px-4 py-3 text-sm focus:outline-none">
          <option>All customer tiers</option>
          <option>VIP Members</option>
          <option>New Customers</option>
        </select>
        <select className="bg-white border border-[#E8E8E8] px-4 py-3 text-sm focus:outline-none">
          <option>All statuses</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
      </div>
      <div className="bg-white border border-[#E8E8E8]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E8E8E8] bg-[#F9F9F9]">
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Customer</th>
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Email</th>
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Phone</th>
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Orders</th>
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Total Spent</th>
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Registered</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="border-b border-[#E8E8E8] last:border-0 hover:bg-[#FAFAFA] transition-colors">
                  <td className="py-4 px-6 text-sm font-medium">{customer.name}</td>
                  <td className="py-4 px-6 text-sm text-[#666]">{customer.email}</td>
                  <td className="py-4 px-6 text-sm text-[#666]">{customer.phone}</td>
                  <td className="py-4 px-6 text-sm">{customer.orders}</td>
                  <td className="py-4 px-6 text-sm font-medium">{customer.spent}</td>
                  <td className="py-4 px-6 text-sm text-[#666]">{customer.registered}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
