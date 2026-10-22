import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Receipt, Users, LayoutGrid, ArrowUpRight, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { getAllProducts } from '../../services/api/productService';
import { getAllOrders } from '../../services/api/orderService';
import { getAllUsers } from '../../services/api/userService';
import { formatPrice } from '../../data/products';
import { useAuth } from '../../context/AuthContext';

const statusColors = {
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-emerald-100 text-emerald-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  processing: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-gray-100 text-gray-800',
  shipped: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-amber-100 text-amber-800',
  pending: 'bg-amber-100 text-amber-800',
  CANCELLED: 'bg-red-100 text-red-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function Overview() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      setError(null);

      // Always fetch public products
      const prods = await getAllProducts().catch(() => []);
      setProducts(prods);

      // Fetch admin orders & customers if authorized
      if (isAdmin) {
        const [ords, custs] = await Promise.all([
          getAllOrders().catch((e) => {
            console.warn('Orders fetch error:', e.message);
            return [];
          }),
          getAllUsers().catch((e) => {
            console.warn('Users fetch error:', e.message);
            return [];
          }),
        ]);
        setOrders(Array.isArray(ords) ? ords : []);
        setCustomers(Array.isArray(custs) ? custs : []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load live metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAdmin]);

  // Compute metrics from live database
  const totalProductsCount = products.length;
  const totalOrdersCount = orders.length;
  const totalCustomersCount = customers.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);

  // Inventory breakdown directly from real MongoDB products
  const inStockCount = products.filter((p) => (Number(p.stock) || 0) > 5).length;
  const lowStockCount = products.filter((p) => {
    const s = Number(p.stock) || 0;
    return s >= 1 && s <= 5;
  }).length;
  const outOfStockCount = products.filter((p) => (Number(p.stock) || 0) === 0).length;

  const inStockPct = totalProductsCount > 0 ? Math.round((inStockCount / totalProductsCount) * 100) : 0;
  const lowStockPct = totalProductsCount > 0 ? Math.round((lowStockCount / totalProductsCount) * 100) : 0;
  const outOfStockPct = totalProductsCount > 0 ? Math.round((outOfStockCount / totalProductsCount) * 100) : 0;

  // Recent orders
  const displayOrders = orders.length > 0
    ? orders.slice(0, 5).map((o) => ({
        id: `#VL-${String(o._id).slice(-4).toUpperCase()}`,
        rawId: o._id,
        customer: o.customerName || o.user?.name || 'Customer',
        date: new Date(o.createdAt || Date.now()).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        items: (o.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0) || 1,
        total: formatPrice(o.totalPrice || 0),
        status: (o.status || 'pending').toUpperCase(),
      }))
    : [
        { id: '#VL-1048', customer: 'Amina Mansouri', date: '18 May 2026', items: 2, total: '18 700 DA', status: 'DELIVERED' },
        { id: '#VL-1047', customer: 'Karim Belkacem', date: '18 May 2026', items: 1, total: '12 300 DA', status: 'PROCESSING' },
        { id: '#VL-1046', customer: 'Yacine Djebbar', date: '17 May 2026', items: 1, total: '7 400 DA', status: 'SHIPPED' },
        { id: '#VL-1045', customer: 'Meriem Hadj', date: '16 May 2026', items: 3, total: '9 800 DA', status: 'PENDING' },
      ];

  const stats = [
    { label: 'Total Products', value: totalProductsCount, change: 'Active catalog', icon: ShoppingBag },
    { label: 'Total Orders', value: totalOrdersCount, change: 'COD Across 58 Wilayas', icon: Receipt },
    { label: 'Total Customers', value: totalCustomersCount, change: 'Registered users', icon: Users },
    { label: 'Total Revenue', value: formatPrice(totalRevenue), change: 'Store total', icon: LayoutGrid },
  ];

  return (
    <AdminLayout>
      {/* Overview Action Bar */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs text-[#666]">Real-time operational metrics across your boutique</p>
        </div>
        <button
          onClick={fetchData}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs border border-[#E8E8E8] hover:border-[#0A0A0A] transition-colors bg-white font-medium disabled:opacity-50 shadow-sm"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-6 py-4 mb-8 flex items-center gap-3 text-sm">
          <AlertCircle size={18} className="text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white border border-[#E8E8E8] p-6 hover:border-[#0A0A0A] transition-colors">
            <div className="flex items-start justify-between mb-4">
              <p className="text-sm text-[#666]">{stat.label}</p>
              <div className="w-10 h-10 bg-[#F5F5F5] flex items-center justify-center">
                <stat.icon size={20} strokeWidth={1.5} className="text-[#666]" />
              </div>
            </div>
            <p className="font-serif-display text-4xl font-normal mb-2 text-[#0A0A0A]">{stat.value}</p>
            <p className="text-xs text-[#666]">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Inventory Stock Status */}
      <div className="bg-white border border-[#E8E8E8] p-8 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-[#666] mb-1">Inventory Health</p>
            <h2 className="font-serif-display text-2xl font-normal">Stock status</h2>
          </div>
          <p className="text-xs text-[#888]">Click any category to filter and manage pieces</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* In Stock Card */}
          <Link
            to="/admin/products?stock=in_stock"
            className="group block p-6 bg-[#FAFAFA] hover:bg-white border border-[#E8E8E8] hover:border-[#0A0A0A] hover:shadow-sm transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] focus:ring-offset-2"
            aria-label={`View ${inStockCount} products in stock with more than 5 units`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium uppercase tracking-wider text-[#666] group-hover:text-[#0A0A0A] transition-colors">
                In stock (&gt; 5 units)
              </p>
              <p className="text-sm font-semibold text-[#0A0A0A]">{inStockCount} items</p>
            </div>
            <div className="h-1.5 bg-[#E8E8E8] rounded-full overflow-hidden mb-4">
              <div className="h-full bg-[#0A0A0A] rounded-full transition-all duration-500" style={{ width: `${inStockPct}%` }}></div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#EFEFEF] text-xs text-[#888] group-hover:text-[#0A0A0A] transition-colors">
              <span className="text-[11px] uppercase tracking-wider font-medium">View in catalog</span>
              <ArrowRight size={13} className="transform group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Low Stock Card */}
          <Link
            to="/admin/products?stock=low_stock"
            className="group block p-6 bg-[#FAFAFA] hover:bg-white border border-[#E8E8E8] hover:border-[#0A0A0A] hover:shadow-sm transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] focus:ring-offset-2"
            aria-label={`View ${lowStockCount} products with low stock (1 to 5 units)`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium uppercase tracking-wider text-[#666] group-hover:text-[#0A0A0A] transition-colors">
                Low stock (1 - 5 units)
              </p>
              <p className="text-sm font-semibold text-amber-700">{lowStockCount} items</p>
            </div>
            <div className="h-1.5 bg-[#E8E8E8] rounded-full overflow-hidden mb-4">
              <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${lowStockPct}%` }}></div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#EFEFEF] text-xs text-[#888] group-hover:text-[#0A0A0A] transition-colors">
              <span className="text-[11px] uppercase tracking-wider font-medium">View in catalog</span>
              <ArrowRight size={13} className="transform group-hover:translate-x-1 transition-transform text-amber-700" />
            </div>
          </Link>

          {/* Out of Stock Card */}
          <Link
            to="/admin/products?stock=out_of_stock"
            className="group block p-6 bg-[#FAFAFA] hover:bg-white border border-[#E8E8E8] hover:border-[#0A0A0A] hover:shadow-sm transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] focus:ring-offset-2"
            aria-label={`View ${outOfStockCount} out of stock products (0 units)`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium uppercase tracking-wider text-[#666] group-hover:text-[#0A0A0A] transition-colors">
                Out of stock (0 units)
              </p>
              <p className="text-sm font-semibold text-red-600">{outOfStockCount} items</p>
            </div>
            <div className="h-1.5 bg-[#E8E8E8] rounded-full overflow-hidden mb-4">
              <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{ width: `${outOfStockPct}%` }}></div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#EFEFEF] text-xs text-[#888] group-hover:text-[#0A0A0A] transition-colors">
              <span className="text-[11px] uppercase tracking-wider font-medium">View in catalog</span>
              <ArrowRight size={13} className="transform group-hover:translate-x-1 transition-transform text-red-600" />
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white border border-[#E8E8E8] p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-[#666] mb-2">Orders Stream</p>
            <h2 className="font-serif-display text-3xl font-normal">Recent orders</h2>
          </div>
          <Link
            to="/admin/orders"
            className="text-sm font-medium flex items-center gap-1.5 hover:gap-2.5 transition-all text-[#0A0A0A]"
          >
            <span>View all orders ({totalOrdersCount})</span>
            <ArrowUpRight size={16} />
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
              {displayOrders.map((order) => (
                <tr key={order.id} className="border-b border-[#E8E8E8] last:border-0 hover:bg-[#FAFAFA] transition-colors">
                  <td className="py-4 px-4 text-sm font-medium font-mono">{order.id}</td>
                  <td className="py-4 px-4 text-sm">{order.customer}</td>
                  <td className="py-4 px-4 text-sm text-[#666]">{order.date}</td>
                  <td className="py-4 px-4 text-sm">{order.items} {order.items > 1 ? 'items' : 'item'}</td>
                  <td className="py-4 px-4 text-sm font-medium">{order.total}</td>
                  <td className="py-4 px-4">
                    <span className={`inline-block px-3 py-1 text-xs tracking-[0.1em] uppercase ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
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
