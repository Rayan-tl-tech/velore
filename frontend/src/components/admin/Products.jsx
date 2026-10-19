import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import AdminLayout from './AdminLayout';

const adminProducts = [
  { id: 1, name: 'Essential Structured Shirt', sku: 'VL-001', category: 'Women', price: '6 900 DA', stock: 4, status: 'ACTIVE', date: '18 May 2026', image: 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=200&h=200&fit=crop' },
  { id: 2, name: 'Relaxed Cotton Overshirt', sku: 'VL-002', category: 'Men', price: '7 400 DA', stock: 19, status: 'ACTIVE', date: '16 May 2026', image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=200&h=200&fit=crop' },
  { id: 3, name: 'Tailored Wool-Blend Coat', sku: 'VL-003', category: 'Women', price: '14 800 DA', stock: 20, status: 'ACTIVE', date: '18 May 2026', image: 'https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?w=200&h=200&fit=crop' },
  { id: 4, name: 'Modern Denim Set', sku: 'VL-004', category: 'Men', price: '9 800 DA', stock: 4, status: 'ACTIVE', date: '16 May 2026', image: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=200&h=200&fit=crop' },
  { id: 5, name: 'Fine Rib Everyday Top', sku: 'VL-005', category: 'Women', price: '4 500 DA', stock: 22, status: 'ACTIVE', date: '18 May 2026', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop' },
  { id: 6, name: 'Classic Weekend Jacket', sku: 'VL-006', category: 'Men', price: '11 200 DA', stock: 23, status: 'ACTIVE', date: '16 May 2026', image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=200&h=200&fit=crop' },
  { id: 7, name: 'Soft Motion Sweatshirt', sku: 'VL-007', category: 'Kids', price: '3 900 DA', stock: 4, status: 'DRAFT', date: '18 May 2026', image: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=200&h=200&fit=crop' },
  { id: 8, name: 'Mini Everyday Coat', sku: 'VL-008', category: 'Kids', price: '6 200 DA', stock: 25, status: 'ACTIVE', date: '16 May 2026', image: 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=200&h=200&fit=crop' },
];

const statusColors = {
  ACTIVE: 'bg-green-100 text-green-800',
  DRAFT: 'bg-amber-100 text-amber-800',
};

export default function Products() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All categories');
  const [statusFilter, setStatusFilter] = useState('All statuses');

  const filteredProducts = adminProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All categories' || product.category === categoryFilter;
    const matchesStatus = statusFilter === 'All statuses' || product.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <AdminLayout>
      <p className="text-base text-[#666] mb-8">Manage the demonstration product catalog.</p>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
        <div className="flex-1 flex items-center gap-3 bg-white border border-[#E8E8E8] px-4 py-3">
          <Search size={18} strokeWidth={1.5} className="text-[#666]" />
          <input
            type="text"
            placeholder="Search products"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-white border border-[#E8E8E8] px-4 py-3 text-sm focus:outline-none"
        >
          <option>All categories</option>
          <option>Men</option>
          <option>Women</option>
          <option>Kids</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-[#E8E8E8] px-4 py-3 text-sm focus:outline-none"
        >
          <option>All statuses</option>
          <option>ACTIVE</option>
          <option>DRAFT</option>
        </select>
        <button className="bg-[#0A0A0A] text-white px-6 py-3 text-xs tracking-[0.15em] uppercase font-medium hover:bg-[#333333] transition-colors flex items-center justify-center gap-2">
          <Plus size={16} strokeWidth={1.5} />
          Add Product
        </button>
      </div>
      <div className="bg-white border border-[#E8E8E8]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E8E8E8] bg-[#F9F9F9]">
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Product</th>
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Category</th>
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Price</th>
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Stock</th>
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Status</th>
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b border-[#E8E8E8] last:border-0 hover:bg-[#FAFAFA] transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-4">
                      <img src={product.image} alt={product.name} className="w-16 h-20 object-cover" />
                      <div>
                        <p className="text-sm font-medium mb-1">{product.name}</p>
                        <p className="text-xs text-[#666]">SKU {product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm">{product.category}</td>
                  <td className="py-4 px-6 text-sm">{product.price}</td>
                  <td className="py-4 px-6 text-sm">{product.stock}</td>
                  <td className="py-4 px-6">
                    <span className={`inline-block px-3 py-1 text-xs tracking-[0.1em] uppercase ${statusColors[product.status]}`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-[#666]">{product.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
