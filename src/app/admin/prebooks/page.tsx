'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Truck,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  ArrowRight,
  PackageCheck,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface OrderItem {
  cartId?: string;
  productId?: string;
  name: string;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
  price: number;
  image?: string;
  isPrebook?: boolean;
  prebookAdvanceAmount?: number;
  fullPrice?: number;
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

const money = (v: number) =>
  `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function AdminPrebooksPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
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
    } catch (err: any) {
      setError(err?.message || 'Error loading pre-book orders.');
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

  // Pre-book detection & financial metrics extractor
  const isPrebookOrder = (order: Order) => {
    const ci = order.customer_info || order.customerInfo || {};
    if (ci.is_prebook || ci.advance_amount !== undefined || ci.advance_paid !== undefined) return true;
    if (Array.isArray(order.items) && order.items.some((i: any) => i.isPrebook || i.prebookAdvanceAmount)) return true;
    return false;
  };

  const getFinancials = (order: Order) => {
    const ci = order.customer_info || order.customerInfo || {};
    let advance = Number(ci.advance_paid ?? ci.advance_amount ?? 0);
    let balance = Number(ci.balance_due ?? 0);
    let fullValue = Number(ci.full_order_value ?? 0);

    if (!advance && Array.isArray(order.items)) {
      advance = order.items.reduce((acc: number, i: any) => {
        if (i.isPrebook && i.prebookAdvanceAmount) {
          return acc + Number(i.prebookAdvanceAmount) * (i.quantity || 1);
        }
        return acc + (i.price || 0) * (i.quantity || 1);
      }, 0);
    }

    if (!fullValue && Array.isArray(order.items)) {
      fullValue = order.items.reduce((acc: number, i: any) => {
        const p = i.fullPrice || i.price || 0;
        return acc + p * (i.quantity || 1);
      }, 0);
    }

    if (!balance && fullValue > advance) {
      balance = fullValue - advance;
    }

    if (!advance && order.total) {
      advance = order.total;
    }

    return {
      advance: advance || Number(order.total || 0),
      balance: Math.max(0, balance),
      fullValue: fullValue || (advance + balance),
    };
  };

  // Filter to pre-book orders only
  const prebookOrders = orders.filter(isPrebookOrder);

  // Financial aggregates for Pre-Books
  const totalPrebooksCount = prebookOrders.length;
  const advanceCollectedTotal = prebookOrders.reduce((acc, o) => {
    const isPaid = ['confirmed', 'shipped', 'delivered'].includes(o.status);
    return isPaid ? acc + getFinancials(o).advance : acc;
  }, 0);
  const balancePendingTotal = prebookOrders.reduce((acc, o) => {
    const notCompleted = ['pending', 'confirmed', 'shipped'].includes(o.status);
    return notCompleted ? acc + getFinancials(o).balance : acc;
  }, 0);
  const readyOrShippedCount = prebookOrders.filter((o) => ['confirmed', 'shipped'].includes(o.status)).length;

  // Search & Status filter
  const filteredPrebooks = prebookOrders.filter((order) => {
    const ci = order.customer_info || order.customerInfo || {};
    const name = `${ci.first_name || ''} ${ci.last_name || ''}`.toLowerCase();
    const phone = (ci.phone || '').toLowerCase();
    const orderId = (order.order_id || '').toLowerCase();
    const itemNames = (order.items || []).map((i) => (i.name || '').toLowerCase()).join(' ');
    const q = searchQuery.toLowerCase().trim();

    const matchesSearch =
      !q || orderId.includes(q) || name.includes(q) || phone.includes(q) || itemNames.includes(q);
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-[0.35em] text-amber-400">
              Advance Reservation Desk
            </span>
            <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-sm">
              <Sparkles className="w-2.5 h-2.5" /> Pre-Books Active
            </span>
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-white mt-1">
            Pre-Book Orders & Balances
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Track online advance deposits paid via Razorpay and remaining balances to collect upon delivery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border border-white/15 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white hover:border-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <Link
            href="/admin/products"
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-black font-black text-xs uppercase tracking-wider hover:bg-amber-400 transition-colors shadow-sm"
          >
            Configure Product Pre-Books
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Advance Collected */}
        <div className="bg-zinc-950 p-5 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Advance Collected (Paid)
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono mt-2">
            {money(advanceCollectedTotal)}
          </p>
          <p className="text-[10px] text-emerald-400 mt-1 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Captured via Razorpay online
          </p>
        </div>

        {/* Balance Due to Collect */}
        <div className="bg-zinc-950 p-5 border border-amber-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
              Balance Pending Collection
            </span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-300 font-mono mt-2">
            {money(balancePendingTotal)}
          </p>
          <p className="text-[10px] text-zinc-400 mt-1 font-semibold">
            To collect at dispatch / door delivery
          </p>
        </div>

        {/* Total Pre-Book Orders */}
        <div className="bg-zinc-950 p-5 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Total Pre-Book Orders
            </span>
            <Clock className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono mt-2">
            {totalPrebooksCount}
          </p>
          <p className="text-[10px] text-zinc-400 mt-1 font-semibold">
            Customers awaiting reservation
          </p>
        </div>

        {/* Fulfillment Pipeline */}
        <div className="bg-zinc-950 p-5 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Active Fulfillment
            </span>
            <Truck className="w-4 h-4 text-zinc-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono mt-2">
            {readyOrShippedCount}
          </p>
          <p className="text-[10px] text-blue-400 mt-1 font-semibold">
            Confirmed & in production / transit
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-zinc-950 p-4 border border-white/10">
        <div className="flex-1 relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order ID, customer name, phone number, item..."
            className="w-full bg-zinc-900 border border-white/10 pl-9 pr-4 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          {['all', 'confirmed', 'shipped', 'delivered', 'pending'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors border ${
                statusFilter === st
                  ? 'bg-white text-black border-white'
                  : 'bg-zinc-900 text-zinc-400 border-white/10 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="border border-white/10 bg-zinc-950 overflow-x-auto">
        {loading ? (
          <div className="py-20 text-center text-zinc-500 text-xs font-mono">
            Loading pre-book orders…
          </div>
        ) : filteredPrebooks.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Clock className="w-8 h-8 mx-auto text-zinc-600" />
            <p className="text-zinc-400 text-sm font-bold">No Pre-Book Orders Found</p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              When customers pre-book items by paying advance deposits, their orders and balance records will automatically show up here.
            </p>
            <div className="pt-2">
              <Link
                href="/admin/products"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-zinc-200 transition-colors"
              >
                Enable Pre-Book on a Product →
              </Link>
            </div>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-zinc-900/50 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
                <th className="py-3.5 px-4">Order & Date</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Reserved Item(s)</th>
                <th className="py-3.5 px-4">Advance Paid</th>
                <th className="py-3.5 px-4">Balance Due</th>
                <th className="py-3.5 px-4">Fulfillment Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPrebooks.map((order) => {
                const ci = order.customer_info || order.customerInfo || {};
                const financials = getFinancials(order);
                const dateStr = order.created_at
                  ? new Date(order.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—';

                return (
                  <tr key={order.order_id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Order ID & Date */}
                    <td className="py-4 px-4 align-top font-mono">
                      <span className="font-bold text-white block">{order.order_id}</span>
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" /> {dateStr}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="py-4 px-4 align-top">
                      <p className="font-bold text-white">
                        {ci.first_name} {ci.last_name || ''}
                      </p>
                      {ci.phone && (
                        <p className="text-[11px] text-zinc-400 font-mono mt-0.5 flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5 text-zinc-500" /> {ci.phone}
                        </p>
                      )}
                      {ci.city && (
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          {ci.city}, {ci.state}
                        </p>
                      )}
                    </td>

                    {/* Reserved Items */}
                    <td className="py-4 px-4 align-top">
                      <div className="space-y-1">
                        {(order.items || []).map((item, idx) => (
                          <div key={idx} className="text-zinc-300">
                            <span className="font-bold text-white">{item.name}</span>
                            <span className="text-[10px] text-zinc-400 ml-1">
                              (Size: {item.selectedSize || 'Standard'}, Qty: {item.quantity})
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Advance Paid */}
                    <td className="py-4 px-4 align-top font-mono">
                      <span className="text-emerald-400 font-bold block text-sm">
                        {money(financials.advance)}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-emerald-500/80 font-sans font-bold">
                        Paid Online
                      </span>
                    </td>

                    {/* Balance Due */}
                    <td className="py-4 px-4 align-top font-mono">
                      <span className="text-amber-400 font-bold block text-sm">
                        {money(financials.balance)}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-amber-500/80 font-sans font-bold">
                        Due on Delivery
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 align-top">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.order_id, e.target.value)}
                        disabled={updatingId === order.order_id}
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 border bg-zinc-900 cursor-pointer focus:outline-none ${
                          order.status === 'confirmed'
                            ? 'border-emerald-500/40 text-emerald-400'
                            : order.status === 'shipped'
                            ? 'border-blue-500/40 text-blue-400'
                            : order.status === 'delivered'
                            ? 'border-purple-500/40 text-purple-400'
                            : 'border-yellow-500/40 text-yellow-400'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed (Adv. Paid)</option>
                        <option value="shipped">Dispatched / Shipped</option>
                        <option value="delivered">Completed / Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>

                    {/* Action */}
                    <td className="py-4 px-4 align-top text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:text-white px-2.5 py-1 bg-zinc-900 border border-white/10 hover:border-white/30 transition-colors"
                      >
                        Details <ChevronRight className="w-3 h-3" />
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
          <div className="bg-zinc-950 border border-white/20 max-w-xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto relative">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-400">
                  Pre-Book Order Overview
                </span>
                <h2 className="text-xl font-black text-white font-mono mt-0.5">
                  {selectedOrder.order_id}
                </h2>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-zinc-400 hover:text-white font-mono text-lg"
              >
                ✕
              </button>
            </div>

            {/* Financial Status Banner */}
            {(() => {
              const fin = getFinancials(selectedOrder);
              return (
                <div className="p-4 bg-zinc-900 border border-amber-500/30 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-zinc-400 block">
                      Full Product Value
                    </span>
                    <span className="text-base font-bold font-mono text-white mt-0.5 block">
                      {money(fin.fullValue)}
                    </span>
                  </div>
                  <div className="border-x border-white/10">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-400 block">
                      Advance Collected
                    </span>
                    <span className="text-base font-bold font-mono text-emerald-400 mt-0.5 block">
                      {money(fin.advance)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-amber-400 block">
                      Balance to Collect
                    </span>
                    <span className="text-base font-bold font-mono text-amber-300 mt-0.5 block">
                      {money(fin.balance)}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Customer Details */}
            <div className="space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Customer & Delivery Address
              </span>
              <div className="bg-zinc-900/60 p-4 border border-white/10 space-y-1.5">
                {(() => {
                  const ci = selectedOrder.customer_info || selectedOrder.customerInfo || {};
                  return (
                    <>
                      <p className="font-bold text-white text-sm">
                        {ci.first_name} {ci.last_name || ''}
                      </p>
                      <p className="text-zinc-400 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-zinc-500" /> {ci.phone || 'No phone provided'}
                      </p>
                      <p className="text-zinc-400 flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-zinc-500" /> {ci.email || 'No email provided'}
                      </p>
                      <p className="text-zinc-400 flex items-start gap-1.5 pt-1 border-t border-white/5">
                        <MapPin className="w-3 h-3 text-zinc-500 mt-0.5 shrink-0" />
                        <span>
                          {ci.address}, {ci.city}, {ci.state} – {ci.pincode}
                        </span>
                      </p>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Pre-Booked Items */}
            <div className="space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Pre-Booked Items
              </span>
              <div className="divide-y divide-white/5 border border-white/10 bg-zinc-900/60">
                {(selectedOrder.items || []).map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">{item.name}</p>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        Size: {item.selectedSize || 'Free'} · Qty: {item.quantity}
                      </p>
                    </div>
                    <span className="font-mono text-zinc-300 font-bold">
                      {money(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Razorpay Reference */}
            {selectedOrder.razorpay_payment_id && (
              <div className="p-3 bg-zinc-900/30 border border-white/10 text-xs font-mono text-zinc-400">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 block">
                  Razorpay Advance Transaction ID
                </span>
                <span className="text-white">{selectedOrder.razorpay_payment_id}</span>
              </div>
            )}

            {/* Quick Status Advance Button */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 border border-white/15 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white"
              >
                Close
              </button>

              {selectedOrder.status !== 'delivered' && (
                <button
                  onClick={() => handleStatusChange(selectedOrder.order_id, 'delivered')}
                  className="px-5 py-2 bg-emerald-500 text-black font-black text-xs uppercase tracking-wider hover:bg-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <PackageCheck className="w-4 h-4" /> Mark Balance Collected & Delivered
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
