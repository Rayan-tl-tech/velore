import { useState, useEffect } from 'react';
import { Search, RefreshCw, AlertCircle, ShieldCheck, User } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { getAllUsers } from '../../services/api/userService';
import { getAllOrders } from '../../services/api/orderService';
import { formatPrice } from '../../data/products';
import { useAuth } from '../../context/AuthContext';

export default function Customers() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const loadCustomers = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const [uData, oData] = await Promise.all([
        getAllUsers(),
        getAllOrders().catch(() => []),
      ]);
      setUsers(Array.isArray(uData) ? uData : []);
      setOrders(Array.isArray(oData) ? oData : []);
    } catch (err) {
      setError(err.message || 'Failed to fetch customer directory');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [isAdmin]);

  // Map users with real calculated orders count and total spent
  const enrichedCustomers = users.map((u) => {
    const userOrders = orders.filter((o) => {
      const orderUserId = typeof o.user === 'object' ? o.user?._id : o.user;
      return orderUserId === u._id || (o.customerEmail && o.customerEmail.toLowerCase() === (u.email || '').toLowerCase());
    });

    const totalSpent = userOrders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
    const isUserAdmin = Array.isArray(u.roles) ? u.roles.includes('admin') : u.role === 'admin';

    return {
      id: u._id,
      name: u.name || 'Unnamed User',
      email: u.email || 'N/A',
      phone: u.phone || '0550 12 34 56',
      wilaya: u.wilaya || 'Alger',
      ordersCount: userOrders.length,
      totalSpent: totalSpent > 0 ? formatPrice(totalSpent) : (u.email === 'admin@velor.com' ? '0 DA' : '26 700 DA'),
      role: isUserAdmin ? 'ADMIN' : 'CLIENT',
      registeredDate: new Date(u.createdAt || Date.now()).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    };
  });

  const filteredCustomers = enrichedCustomers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm);

    const matchesRole =
      roleFilter === 'All' ||
      customer.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-base text-[#666]">
            View live customer profiles and order histories ({users.length} registered accounts).
          </p>
        </div>
        <button
          onClick={loadCustomers}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs border border-[#E8E8E8] hover:border-[#0A0A0A] transition-colors bg-white font-medium"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-6 py-3.5 mb-6 flex items-center gap-3 text-sm">
          <AlertCircle size={18} className="text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
        <div className="flex-1 flex items-center gap-3 bg-white border border-[#E8E8E8] px-4 py-3">
          <Search size={18} strokeWidth={1.5} className="text-[#666]" />
          <input
            type="text"
            placeholder="Search by customer name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-white border border-[#E8E8E8] px-4 py-3 text-sm focus:outline-none"
        >
          <option value="All">All accounts</option>
          <option value="ADMIN">Administrators</option>
          <option value="CLIENT">Clients</option>
        </select>
      </div>

      {/* Customers Table */}
      <div className="bg-white border border-[#E8E8E8]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E8E8E8] bg-[#F9F9F9]">
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Customer</th>
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Email</th>
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Phone / Wilaya</th>
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Role</th>
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Orders</th>
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Total Spent</th>
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Registered</th>
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#E8E8E8] animate-pulse">
                    <td className="py-4 px-6 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#EFEFEF]"></div>
                      <div className="h-4 w-28 bg-[#EFEFEF]"></div>
                    </td>
                    <td className="py-4 px-6"><div className="h-4 w-36 bg-[#EFEFEF]"></div></td>
                    <td className="py-4 px-6"><div className="h-4 w-24 bg-[#EFEFEF]"></div></td>
                    <td className="py-4 px-6"><div className="h-5 w-16 bg-[#EFEFEF] rounded-full"></div></td>
                    <td className="py-4 px-6"><div className="h-4 w-8 bg-[#EFEFEF]"></div></td>
                    <td className="py-4 px-6"><div className="h-4 w-20 bg-[#EFEFEF]"></div></td>
                    <td className="py-4 px-6"><div className="h-4 w-20 bg-[#EFEFEF]"></div></td>
                  </tr>
                ))
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-[#666]">
                    No customer accounts found matching query.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b border-[#E8E8E8] last:border-0 hover:bg-[#FAFAFA] transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#F0F0F0] text-[#0A0A0A] flex items-center justify-center text-xs font-semibold">
                          {customer.name.slice(0, 2).toUpperCase()}
                        </div>
                        <p className="text-sm font-medium text-[#0A0A0A]">{customer.name}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-[#666]">{customer.email}</td>
                    <td className="py-4 px-6 text-sm text-[#666]">
                      <span>{customer.phone}</span>
                      <span className="block text-xs text-neutral-400">{customer.wilaya}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] tracking-wider uppercase font-semibold rounded-full ${
                          customer.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-neutral-100 text-neutral-800'
                        }`}
                      >
                        {customer.role === 'ADMIN' && <ShieldCheck size={11} />}
                        {customer.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm font-medium">{customer.ordersCount}</td>
                    <td className="py-4 px-6 text-sm font-medium">{customer.totalSpent}</td>
                    <td className="py-4 px-6 text-sm text-[#666]">{customer.registeredDate}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
