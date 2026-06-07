'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { CheckCircle2, Package, ArrowRight, Download, Printer } from 'lucide-react';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  selectedSize?: string;
  selectedColor?: string;
}

interface OrderData {
  id?: string;
  order_id?: string;
  items?: OrderItem[];
  subtotal?: number;
  shipping_fee?: number;
  shippingFee?: number;
  total?: number;
  payment_method?: string;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  customer_info?: any;
  customerInfo?: any;
  created_at?: string;
}

const money = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function OrderConfirmationPage() {
  const [order, setOrder] = useState<OrderData | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('lastOrder');
      if (stored) setOrder(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const orderId   = order?.id || order?.order_id || '—';
  const ci        = order?.customer_info || order?.customerInfo || {};
  const firstName = ci.first_name || ci.firstName || '';
  const lastName  = ci.last_name  || ci.lastName  || '';
  const fullName  = `${firstName} ${lastName}`.trim() || 'Customer';
  const items     = order?.items || [];
  const subtotal  = Number(order?.subtotal || 0);
  const shipping  = Number(order?.shippingFee ?? order?.shipping_fee ?? 0);
  const total     = Number(order?.total || 0);
  const payId     = order?.razorpay_payment_id || '—';
  const date      = order?.created_at
    ? new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  // ── PDF generation using browser print ───────────────────────────────────
  const handleDownloadPDF = () => {
    const invoiceHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Invoice #${orderId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', Times, serif; color: #111; padding: 48px; font-size: 13px; }
    .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 20px; margin-bottom: 24px; }
    .header h1 { font-size: 28px; letter-spacing: -1px; font-weight: 900; }
    .header p { font-size: 9px; letter-spacing: 4px; text-transform: uppercase; color: #666; margin-top: 4px; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 28px; }
    .meta-block p { line-height: 1.8; }
    .meta-block .label { font-size: 9px; letter-spacing: 3px; text-transform: uppercase; color: #888; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
    thead tr { border-bottom: 2px solid #111; }
    th { padding: 10px 8px; text-align: left; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; }
    td { padding: 10px 8px; border-bottom: 1px solid #e8e8e8; }
    td:last-child, th:last-child { text-align: right; }
    td:nth-child(2), th:nth-child(2) { text-align: center; }
    .totals { margin-top: 0; }
    .totals tr td { border-bottom: none; font-size: 13px; }
    .totals .grand td { font-size: 16px; font-weight: bold; border-top: 2px solid #111; padding-top: 12px; }
    .payment-box { border: 1px solid #e0e0e0; padding: 16px; margin-top: 28px; }
    .payment-box .label { font-size: 9px; letter-spacing: 3px; text-transform: uppercase; color: #888; margin-bottom: 8px; }
    .address-box { border: 1px solid #e0e0e0; padding: 16px; margin-top: 16px; }
    .footer { text-align: center; margin-top: 48px; font-size: 10px; color: #aaa; border-top: 1px solid #e0e0e0; padding-top: 16px; }
    code { font-family: monospace; font-size: 11px; background: #f4f4f4; padding: 2px 4px; }
    .opt { font-size: 10px; color: #888; }
  </style>
</head>
<body>
  <div class="header">
    <h1>BADGER SHIELD</h1>
    <p>Tax Invoice</p>
  </div>

  <div class="meta">
    <div class="meta-block">
      <p class="label">Invoice To</p>
      <p><strong>${fullName}</strong></p>
      ${ci.address ? `<p>${ci.address}</p>` : ''}
      ${ci.city ? `<p>${ci.city}, ${ci.state || ''} – ${ci.pincode || ''}</p>` : ''}
      ${ci.phone ? `<p>${ci.phone}</p>` : ''}
      ${(ci.email || '') ? `<p>${ci.email}</p>` : ''}
    </div>
    <div class="meta-block" style="text-align:right;">
      <p class="label">Invoice Details</p>
      <p><strong>Order ID:</strong> #${orderId}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Status:</strong> <span style="color:green;">Paid</span></p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => `
      <tr>
        <td>
          ${item.name || 'Item'}
          ${item.selectedSize ? `<br/><span class="opt">Size: ${item.selectedSize}</span>` : ''}
          ${item.selectedColor ? `<span class="opt">${item.selectedSize ? ' / ' : '<br/>'}Color: ${item.selectedColor}</span>` : ''}
        </td>
        <td>${item.quantity}</td>
        <td>${money(item.price)}</td>
        <td>${money(item.price * item.quantity)}</td>
      </tr>`).join('')}
    </tbody>
    <tbody class="totals">
      <tr><td colspan="3" style="text-align:right;color:#888;padding-top:16px;">Subtotal</td><td style="padding-top:16px;">${money(subtotal)}</td></tr>
      <tr><td colspan="3" style="text-align:right;color:#888;">Shipping</td><td>${shipping === 0 ? 'Free' : money(shipping)}</td></tr>
      <tr class="grand"><td colspan="3" style="text-align:right;">Total</td><td>${money(total)}</td></tr>
    </tbody>
  </table>

  <div class="payment-box">
    <p class="label">Payment Information</p>
    <p>Payment ID: <code>${payId}</code></p>
    ${order?.razorpay_order_id ? `<p>Razorpay Order: <code>${order.razorpay_order_id}</code></p>` : ''}
    <p>Method: ${order?.payment_method ? order.payment_method.toUpperCase() : 'Online Payment'}</p>
  </div>

  <div class="footer">
    <p>Thank you for shopping with BADGER SHIELD.</p>
    <p style="margin-top:4px;">This is a computer-generated invoice and requires no signature.</p>
  </div>
</body>
</html>`;

    const blob = new Blob([invoiceHtml], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    if (win) {
      win.addEventListener('load', () => {
        win.print();
        URL.revokeObjectURL(url);
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <div className="border-b border-border/40 px-4 py-16 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-foreground mb-6">
          <CheckCircle2 className="w-7 h-7" strokeWidth={1.5} />
        </div>
        <p className="text-[9px] font-black uppercase tracking-[0.45em] text-muted-foreground mb-3">Order Confirmed</p>
        <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-tighter mb-4">Thank You</h1>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
          A confirmation email has been sent to your registered email address.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {order ? (
          <div className="space-y-8">

            {/* Order meta */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Order ID',  value: `#${orderId}` },
                { label: 'Date',      value: date },
                { label: 'Status',    value: 'Confirmed' },
                { label: 'Total',     value: money(total) },
              ].map(({ label, value }) => (
                <div key={label} className="border border-border/50 p-4">
                  <p className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground font-semibold mb-1">{label}</p>
                  <p className="text-sm font-bold">{value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6">
              {/* Items */}
              <div className="border border-border/50">
                <div className="px-5 py-3 border-b border-border/40">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Items Ordered</p>
                </div>
                <div className="divide-y divide-border/30">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-4">
                      <div className="w-12 h-14 bg-muted flex-shrink-0 flex items-center justify-center">
                        <Package className="w-4 h-4 text-muted-foreground/30" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{item.name}</p>
                        {(item.selectedSize || item.selectedColor) && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">
                            {[item.selectedSize && `Size: ${item.selectedSize}`, item.selectedColor && `Color: ${item.selectedColor}`].filter(Boolean).join(' / ')}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-0.5">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold shrink-0">{money(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-4 border-t border-border/40 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Subtotal</span><span>{money(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Shipping</span><span>{shipping === 0 ? 'Free' : money(shipping)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-2 border-t border-border/40">
                    <span>Total</span><span>{money(total)}</span>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Delivery */}
                {(ci.address || ci.city) && (
                  <div className="border border-border/50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-3">Delivery To</p>
                    <p className="text-sm font-semibold">{fullName}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {ci.address && <>{ci.address}<br/></>}
                      {ci.city}, {ci.state} – {ci.pincode}<br/>
                      {ci.phone}
                    </p>
                  </div>
                )}

                {/* Payment */}
                <div className="border border-border/50 p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-3">Payment</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-xs font-semibold text-green-700">Paid</span>
                    </div>
                    {payId !== '—' && (
                      <p className="text-[10px] text-muted-foreground font-mono break-all">{payId}</p>
                    )}
                    {order.payment_method && (
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{order.payment_method}</p>
                    )}
                  </div>
                </div>

                {/* Download invoice */}
                <button
                  onClick={handleDownloadPDF}
                  className="w-full flex items-center justify-center gap-2 border border-foreground px-4 py-3 text-[10px] font-black uppercase tracking-[0.25em] hover:bg-foreground hover:text-background transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Invoice
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Loading order details…
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-12 pt-8 border-t border-border/40">
          <Link
            href="/products"
            className="flex items-center justify-center gap-2 bg-foreground text-background px-8 py-3.5 text-[10px] font-black uppercase tracking-[0.3em] hover:opacity-80 transition-opacity"
          >
            Continue Shopping <ArrowRight className="w-3 h-3" />
          </Link>
          <Link
            href="/profile"
            className="flex items-center justify-center gap-2 border border-border px-8 py-3.5 text-[10px] font-black uppercase tracking-[0.3em] hover:border-foreground transition-colors"
          >
            <Package className="w-3 h-3" /> View Orders
          </Link>
        </div>
      </div>
    </div>
  );
}
