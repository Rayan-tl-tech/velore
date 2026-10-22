import { useState, useEffect } from 'react';
import { Search, RefreshCw, AlertCircle, CheckCircle, Eye, X } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { getAllOrders, updateOrderStatus } from '../../services/api/orderService';
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

export default function Orders() {
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [dateFilter, setDateFilter] = useState('');

  // Selected order for detail view
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const loadOrders = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const data = await getAllOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to fetch orders from database');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [isAdmin]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      setUpdatingId(orderId);
      await updateOrderStatus(orderId, newStatus);
      setSuccessMessage(`Order #${orderId.slice(-6).toUpperCase()} updated to ${newStatus.toUpperCase()}`);
      await loadOrders();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const orderIdStr = String(order._id || '');
    const shortId = `#VL-${orderIdStr.slice(-4).toUpperCase()}`;
    const custName = String(order.customerName || order.user?.name || '');
    const wilaya = String(order.wilaya || '');
    const phone = String(order.customerPhone || '');

    const matchesSearch =
      orderIdStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shortId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      custName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wilaya.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm);

    const matchesStatus =
      statusFilter === 'All statuses' ||
      (order.status || '').toLowerCase() === statusFilter.toLowerCase();

    const orderDateStr = order.createdAt ? new Date(order.createdAt).toISOString().split('T')[0] : '';
    const matchesDate = !dateFilter || orderDateStr === dateFilter;

    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-base text-[#666]">
            Review and update live customer orders ({orders.length} orders recorded across 58 wilayas).
          </p>
        </div>
        <button
          onClick={loadOrders}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs border border-[#E8E8E8] hover:border-[#0A0A0A] transition-colors bg-white font-medium"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-6 py-3.5 mb-6 flex items-center gap-3 text-sm">
          <CheckCircle size={18} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

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
            placeholder="Search by order ID, customer name, phone, or wilaya..."
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
          <option value="pending">PENDING</option>
          <option value="processing">PROCESSING</option>
          <option value="shipped">SHIPPED</option>
          <option value="delivered">DELIVERED</option>
          <option value="cancelled">CANCELLED</option>
        </select>

        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="bg-white border border-[#E8E8E8] px-4 py-3 text-sm focus:outline-none"
        />

        {dateFilter && (
          <button
            onClick={() => setDateFilter('')}
            className="text-xs text-[#666] hover:text-[#0A0A0A] underline"
          >
            Clear date
          </button>
        )}
      </div>

      {/* Orders Table */}
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
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Payment / Wilaya</th>
                <th className="text-left py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Status</th>
                <th className="text-right py-4 px-6 text-xs tracking-[0.15em] uppercase text-[#666] font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#E8E8E8] animate-pulse">
                    <td className="py-5 px-6"><div className="h-4 w-16 bg-[#EFEFEF]"></div></td>
                    <td className="py-5 px-6">
                      <div className="h-4 w-32 bg-[#EFEFEF] mb-1.5"></div>
                      <div className="h-3 w-24 bg-[#F5F5F5]"></div>
                    </td>
                    <td className="py-5 px-6"><div className="h-4 w-20 bg-[#EFEFEF]"></div></td>
                    <td className="py-5 px-6"><div className="h-4 w-14 bg-[#EFEFEF]"></div></td>
                    <td className="py-5 px-6"><div className="h-4 w-20 bg-[#EFEFEF]"></div></td>
                    <td className="py-5 px-6"><div className="h-4 w-24 bg-[#EFEFEF]"></div></td>
                    <td className="py-5 px-6"><div className="h-6 w-20 bg-[#EFEFEF] rounded"></div></td>
                    <td className="py-5 px-6 text-right"><div className="h-7 w-16 bg-[#EFEFEF] ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-[#666]">
                    No orders matched your search criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const shortId = `#VL-${String(order._id).slice(-4).toUpperCase()}`;
                  const custName = order.customerName || order.user?.name || 'Customer';
                  const dateStr = new Date(order.createdAt || Date.now()).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });
                  const itemsCount = (order.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0);
                  const statusUpper = (order.status || 'pending').toUpperCase();

                  return (
                    <tr key={order._id} className="border-b border-[#E8E8E8] last:border-0 hover:bg-[#FAFAFA] transition-colors">
                      <td className="py-4 px-6 text-sm font-medium font-mono">
                        {shortId}
                      </td>
                      <td className="py-4 px-6 text-sm">
                        <div>
                          <p className="font-medium text-[#0A0A0A]">{custName}</p>
                          <p className="text-xs text-[#666]">{order.customerPhone || order.customerEmail || 'No contact'}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-[#666]">{dateStr}</td>
                      <td className="py-4 px-6 text-sm">{itemsCount} {itemsCount > 1 ? 'items' : 'item'}</td>
                      <td className="py-4 px-6 text-sm font-medium">{formatPrice(order.totalPrice || 0)}</td>
                      <td className="py-4 px-6 text-sm text-[#666]">
                        <span className="font-medium text-[#0A0A0A]">COD</span> · {order.wilaya || 'Alger'}
                        <span className="text-xs block text-neutral-400 capitalize">{order.deliveryMethod || 'home'} delivery</span>
                      </td>
                      <td className="py-4 px-6">
                        <select
                          value={(order.status || 'pending').toLowerCase()}
                          disabled={updatingId === order._id}
                          onChange={(e) => handleStatusChange(order._id, e.target.value)}
                          className={`text-xs uppercase font-medium tracking-wider px-2.5 py-1 rounded border-0 focus:outline-none cursor-pointer ${
                            statusColors[statusUpper] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <option value="pending">PENDING</option>
                          <option value="processing">PROCESSING</option>
                          <option value="shipped">SHIPPED</option>
                          <option value="delivered">DELIVERED</option>
                          <option value="cancelled">CANCELLED</option>
                        </select>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#E8E8E8] hover:border-[#0A0A0A] hover:bg-white transition-colors"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl border border-[#E8E8E8] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-[#E8E8E8]">
              <div>
                <p className="text-xs tracking-[0.2em] uppercase text-[#666] mb-1">
                  Order Details
                </p>
                <h3 className="font-serif-display text-2xl font-mono">
                  #VL-{String(selectedOrder._id).slice(-6).toUpperCase()}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-[#666] hover:text-[#0A0A0A] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Customer & Shipping Summary */}
              <div className="grid grid-cols-2 gap-4 bg-[#F9F9F9] p-4 text-xs">
                <div>
                  <p className="uppercase text-[#888] tracking-wider mb-1 font-semibold">Recipient</p>
                  <p className="font-medium text-[#0A0A0A] text-sm">{selectedOrder.customerName || 'N/A'}</p>
                  <p className="text-[#666] mt-0.5">{selectedOrder.customerPhone || 'N/A'}</p>
                  <p className="text-[#666]">{selectedOrder.customerEmail || 'N/A'}</p>
                </div>
                <div>
                  <p className="uppercase text-[#888] tracking-wider mb-1 font-semibold">Destination</p>
                  <p className="font-medium text-[#0A0A0A] text-sm">{selectedOrder.wilaya || 'N/A'}{selectedOrder.commune ? `, ${selectedOrder.commune}` : ''}</p>
                  <p className="text-[#666] mt-0.5">{selectedOrder.shippingAddress || 'Address on file'}</p>
                  <p className="text-[#666] uppercase mt-1">Mode: <strong className="text-[#0A0A0A]">{selectedOrder.deliveryMethod || 'home'}</strong> (COD)</p>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="text-xs uppercase tracking-wider text-[#666] font-semibold mb-3">
                  Ordered Items ({selectedOrder.items?.length || 0})
                </h4>
                <div className="border border-[#E8E8E8] divide-y divide-[#E8E8E8]">
                  {(selectedOrder.items || []).map((it, idx) => {
                    const prodName = typeof it.product === 'object' ? it.product?.name : 'VÉLOR Collection Item';
                    const prodImg = typeof it.product === 'object' ? it.product?.image : null;
                    return (
                      <div key={idx} className="p-3 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          {prodImg && (
                            <img src={prodImg} alt="" className="w-10 h-12 object-cover bg-gray-100" />
                          )}
                          <div>
                            <p className="font-medium text-[#0A0A0A]">{prodName}</p>
                            <p className="text-xs text-[#666]">Size: {it.size || 'M'} · Qty: {it.quantity || 1}</p>
                          </div>
                        </div>
                        <p className="font-medium">{formatPrice(it.price * (it.quantity || 1))}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="border-t border-[#E8E8E8] pt-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-[#666]">
                  <span>Shipping Fee ({selectedOrder.wilaya}):</span>
                  <span>{formatPrice(selectedOrder.shippingFee || 500)}</span>
                </div>
                <div className="flex justify-between font-bold text-base text-[#0A0A0A] pt-2 border-t border-[#E8E8E8]">
                  <span>Total Order:</span>
                  <span>{formatPrice(selectedOrder.totalPrice || 0)}</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#E8E8E8] bg-[#FAFAFA] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase text-[#666]">Change Status:</span>
                <select
                  value={(selectedOrder.status || 'pending').toLowerCase()}
                  onChange={(e) => {
                    handleStatusChange(selectedOrder._id, e.target.value);
                    setSelectedOrder({ ...selectedOrder, status: e.target.value });
                  }}
                  className="text-xs uppercase tracking-wider font-semibold border border-[#D0D0D0] px-3 py-1.5 bg-white focus:outline-none"
                >
                  <option value="pending">PENDING</option>
                  <option value="processing">PROCESSING</option>
                  <option value="shipped">SHIPPED</option>
                  <option value="delivered">DELIVERED</option>
                  <option value="cancelled">CANCELLED</option>
                </select>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="bg-[#0A0A0A] text-white px-5 py-2 text-xs uppercase tracking-wider hover:bg-[#333333] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
