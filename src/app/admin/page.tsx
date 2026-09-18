'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  ArrowUpRight,
  Filter,
} from 'lucide-react';

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
  image?: string;
}

interface Order {
  id: number;
  order_id: string;
  status: string;
  total: number;
  subtotal?: number;
  shipping_fee?: number;
  items: OrderItem[];
  customer_info?: any;
  customerInfo?: any;
  payment_method?: string;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  created_at: string;
}

interface Metrics {
  totalRevenue: number;
  todayRevenue: number;
  totalOrders: number;
  todayOrdersCount: number;
  confirmedCount: number;
  shippedCount: number;
  deliveredCount: number;
  pendingCount: number;
}

const money = (v: number) =>
  `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/orders');
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch orders');
      }
      setOrders(data.orders || []);
      setMetrics(data.metrics || null);
    } catch (err: any) {
      setError(err?.message || 'Error loading orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to update order status.');
        return;
      }

      // Update local state
      setOrders((prev) =>
        prev.map((o) => (o.order_id === orderId ? { ...o, status: newStatus } : o))
      );
      if (selectedOrder && selectedOrder.order_id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Filtering
  const filteredOrders = orders.filter((order) => {
    const ci = order.customer_info || order.customerInfo || {};
    const name = `${ci.first_name || ''} ${ci.last_name || ''}`.toLowerCase();
    const phone = (ci.phone || '').toLowerCase();
    const orderId = (order.order_id || '').toLowerCase();
    const q = searchQuery.toLowerCase().trim();

    const matchesSearch =
      !q || orderId.includes(q) || name.includes(q) || phone.includes(q);
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
            <CheckCircle2 className="w-3 h-3" /> Confirmed
          </span>
        );
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-blue-950/60 text-blue-300 border border-blue-800/60">
            <Truck className="w-3 h-3" /> Shipped
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-purple-950/60 text-purple-300 border border-purple-800/60">
            <CheckCircle2 className="w-3 h-3" /> Delivered
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-amber-950/60 text-amber-300 border border-amber-800/60">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-zinc-900 text-zinc-400 border border-white/10">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Title & Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-[9px] font-black uppercase tracking-[0.35em] text-zinc-400">
            Orders & Revenue Dashboard
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight text-white mt-1">
            Store Orders & Cash
          </h1>
        </div>

        <button
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-white/15 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white hover:border-white transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI Cards ("Cash & Revenue") */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border border-white/10 bg-zinc-950 p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest">Total Revenue</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white">{money(metrics.totalRevenue)}</p>
            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">
              {metrics.confirmedCount + metrics.shippedCount + metrics.deliveredCount} paid orders
            </p>
          </div>

          <div className="border border-white/10 bg-zinc-950 p-5 relative overflow-hidden">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest">Today's Cash</span>
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white">{money(metrics.todayRevenue)}</p>
            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">
              {metrics.todayOrdersCount} orders placed today
            </p>
          </div>

          <div className="border border-white/10 bg-zinc-950 p-5">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest">Confirmed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white">{metrics.confirmedCount}</p>
            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">Ready for packing</p>
          </div>

          <div className="border border-white/10 bg-zinc-950 p-5">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest">Shipped / Out</span>
              <Truck className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white">{metrics.shippedCount}</p>
            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">In transit to buyers</p>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-zinc-950 p-3 border border-white/10">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order ID, customer name, phone number..."
            className="w-full bg-zinc-900 border border-white/10 pl-10 pr-4 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-900 border border-white/10 px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-white transition-colors"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed (Paid)</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="border border-white/10 bg-zinc-950 overflow-x-auto">
        {loading ? (
          <div className="py-20 text-center text-zinc-500 text-xs font-mono">
            Loading orders & transactions…
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 text-xs font-mono">
            No orders match your search or filter criteria.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-zinc-900/50 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
                <th className="py-3.5 px-4">Order ID & Date</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Items</th>
                <th className="py-3.5 px-4">Total Amount</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4">Status & Action</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredOrders.map((order) => {
                const ci = order.customer_info || order.customerInfo || {};
                const fullName = `${ci.first_name || ''} ${ci.last_name || ''}`.trim() || 'Guest';
                const itemsCount = (order.items || []).reduce(
                  (acc, it) => acc + (it.quantity || 1),
                  0
                );
                const isUpdating = updatingId === order.order_id;

                return (
                  <tr key={order.order_id || order.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Order ID & Date */}
                    <td className="py-4 px-4 align-top">
                      <p className="font-mono font-bold text-white text-xs">
                        #{order.id || order.order_id}
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        {order.created_at
                          ? new Date(order.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </p>
                    </td>

                    {/* Customer */}
                    <td className="py-4 px-4 align-top">
                      <p className="font-semibold text-white">{fullName}</p>
                      {ci.phone && (
                        <p className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-2.5 h-2.5 text-zinc-500" />
                          {ci.phone}
                        </p>
                      )}
                      {ci.city && (
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          {ci.city}, {ci.state}
                        </p>
                      )}
                    </td>

                    {/* Items */}
                    <td className="py-4 px-4 align-top">
                      <p className="text-zinc-300 font-medium">
                        {(order.items || [])[0]?.name || 'Product'}
                        {(order.items || []).length > 1 && ` +${(order.items || []).length - 1} more`}
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        {itemsCount} item{itemsCount > 1 ? 's' : ''} (Size:{' '}
                        {(order.items || [])[0]?.selectedSize || 'Standard'})
                      </p>
                    </td>

                    {/* Total */}
                    <td className="py-4 px-4 align-top">
                      <p className="font-bold text-white font-mono">{money(order.total)}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        Ship: {order.shipping_fee === 0 ? 'Free' : money(order.shipping_fee || 0)}
                      </p>
                    </td>

                    {/* Payment */}
                    <td className="py-4 px-4 align-top">
                      <span className="text-[10px] font-mono text-zinc-400 block truncate max-w-[120px]">
                        {order.razorpay_payment_id || '—'}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-zinc-500 mt-0.5 block">
                        {order.payment_method || 'Online'}
                      </span>
                    </td>

                    {/* Status with Quick Transition Selector */}
                    <td className="py-4 px-4 align-top">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(order.status)}
                        <select
                          disabled={isUpdating}
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.order_id, e.target.value)}
                          className="bg-zinc-900 border border-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300 focus:outline-none focus:border-white transition-colors cursor-pointer"
                        >
                          <option value="confirmed">Set Confirmed</option>
                          <option value="shipped">Set Shipped</option>
                          <option value="delivered">Set Delivered</option>
                          <option value="pending">Set Pending</option>
                          <option value="cancelled">Set Cancelled</option>
                        </select>
                      </div>
                    </td>

                    {/* View Details */}
                    <td className="py-4 px-4 align-top text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-2.5 py-1 border border-white/20 text-[10px] font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Order Details Drawer / Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 relative">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">
                  Order Details
                </span>
                <h2 className="text-xl font-black text-white mt-1">
                  #{selectedOrder.id || selectedOrder.order_id}
                </h2>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">
                  Razorpay Payment ID: {selectedOrder.razorpay_payment_id || '—'}
                </p>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="text-zinc-400 hover:text-white text-lg font-mono p-1"
              >
                ✕
              </button>
            </div>

            {/* Customer & Shipping Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-zinc-900/50 p-4 border border-white/10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                  Customer Information
                </p>
                <p className="font-bold text-white text-sm">
                  {selectedOrder.customer_info?.first_name || selectedOrder.customerInfo?.first_name}{' '}
                  {selectedOrder.customer_info?.last_name || selectedOrder.customerInfo?.last_name}
                </p>
                <p className="text-zinc-400 mt-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-zinc-500" />
                  {selectedOrder.customer_info?.phone || selectedOrder.customerInfo?.phone || 'N/A'}
                </p>
                <p className="text-zinc-400 mt-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-zinc-500" />
                  {selectedOrder.customer_info?.email || selectedOrder.customerInfo?.email || 'N/A'}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                  Delivery Address
                </p>
                <p className="text-zinc-300 leading-relaxed">
                  {selectedOrder.customer_info?.address || selectedOrder.customerInfo?.address}
                  <br />
                  {selectedOrder.customer_info?.city || selectedOrder.customerInfo?.city},{' '}
                  {selectedOrder.customer_info?.state || selectedOrder.customerInfo?.state} –{' '}
                  {selectedOrder.customer_info?.pincode || selectedOrder.customerInfo?.pincode}
                </p>
              </div>
            </div>

            {/* Items List */}
            <div className="border border-white/10">
              <div className="px-4 py-2.5 bg-zinc-900 text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-white/10">
                Purchased Items
              </div>
              <div className="divide-y divide-white/5">
                {(selectedOrder.items || []).map((item, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-white">{item.name}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
                        Size: {item.selectedSize || 'S'} | Color: {item.selectedColor || 'Default'} |
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="font-mono font-bold text-white">
                      {money(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-zinc-900/40 border-t border-white/10 flex justify-between items-center text-sm font-bold">
                <span>Total Amount Paid:</span>
                <span className="font-mono text-emerald-400 text-base">{money(selectedOrder.total)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Update Status:</span>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleStatusChange(selectedOrder.order_id, e.target.value)}
                  className="bg-zinc-900 border border-white/20 px-3 py-1.5 text-xs text-white"
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 bg-white text-black font-black text-xs uppercase tracking-wider hover:bg-zinc-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
