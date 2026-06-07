import {
  createMailTransporter,
  escapeHtml,
  getAdminEmail,
  isValidEmail,
  normalizeEmail,
} from '@/lib/email';
import { getItemOptionLabels, normalizeOrderItemOptions } from '@/lib/orderOptions';

const money = (v: any) => `₹${Number(v || 0).toFixed(2)}`;

const optionsHtml = (item: any) => {
  const opts = getItemOptionLabels(item).map(escapeHtml);
  return opts.length
    ? `<br/><span style="font-size:11px;color:#888;">${opts.join(' / ')}</span>`
    : '';
};

export const toEmailOrder = (order: any = {}) => {
  const customerInfo = order.customerInfo || order.customer_info || {};
  return {
    ...order,
    id: order.id || order.order_id,
    status: order.status,
    items: (order.items || []).map(normalizeOrderItemOptions),
    subtotal: Number(order.subtotal || 0),
    shippingFee: Number(order.shippingFee ?? order.shipping_fee ?? 0),
    tax: Number(order.tax || 0),
    total: Number(order.total || 0),
    paymentMethod: order.paymentMethod || order.payment_method,
    customerInfo,
    razorpay_order_id: order.razorpay_order_id || null,
    razorpay_payment_id: order.razorpay_payment_id || null,
  };
};

export async function sendOrderEmails({ order, email }: { order: any; email?: string }) {
  const o = toEmailOrder(order);
  const ci = o.customerInfo || {};
  const customerEmail = normalizeEmail(email || ci.email || '');
  const adminEmail = getAdminEmail();

  if (!o.id) throw new Error('Order id is required to send order email.');
  if (!isValidEmail(customerEmail) && !adminEmail)
    throw new Error('No valid customer or admin email configured.');

  const transporter = createMailTransporter();

  const firstName = escapeHtml(ci.first_name || ci.firstName || 'Customer');
  const lastName  = escapeHtml(ci.last_name  || ci.lastName  || '');
  const fullName  = `${firstName} ${lastName}`.trim();
  const orderId   = escapeHtml(String(o.id));
  const address   = escapeHtml(ci.address || '');
  const city      = escapeHtml(ci.city    || '');
  const state     = escapeHtml(ci.state   || '');
  const pincode   = escapeHtml(ci.pincode || '');
  const phone     = escapeHtml(ci.phone   || 'N/A');
  const safeEmail = escapeHtml(customerEmail || '');
  const payId     = escapeHtml(o.razorpay_payment_id || '—');
  const rzpOrdId  = escapeHtml(o.razorpay_order_id   || '—');

  const itemRows = o.items
    .map((item: any) => {
      const qty   = Number(item.quantity || 1);
      const price = Number(item.price    || 0);
      return `<tr>
        <td style="padding:10px;border-bottom:1px solid #eee;">${escapeHtml(item.name || 'Item')}${optionsHtml(item)}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">${qty}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">${money(price * qty)}</td>
      </tr>`;
    })
    .join('');

  // ── Customer email ────────────────────────────────────────────────────────
  const customerHtml = `
  <div style="font-family:'Times New Roman',serif;color:#111;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;padding:48px 40px;">
    <h1 style="font-size:30px;letter-spacing:-1px;text-align:center;margin:0 0 4px;">BADGER SHIELD</h1>
    <p style="text-align:center;font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#888;margin:0 0 40px;">Order Confirmed</p>

    <h2 style="font-size:18px;font-weight:normal;border-bottom:1px solid #111;padding-bottom:10px;margin-bottom:16px;">
      Thank you, ${firstName}.
    </h2>
    <p style="font-size:14px;line-height:1.7;color:#333;">
      Your order <strong>#${orderId}</strong> has been confirmed and is being prepared with care.
    </p>

    <table style="width:100%;border-collapse:collapse;font-size:13px;margin:32px 0;">
      <thead>
        <tr style="background:#f8f8f8;">
          <th style="padding:10px;text-align:left;">Item</th>
          <th style="padding:10px;text-align:center;">Qty</th>
          <th style="padding:10px;text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
      <tfoot>
        <tr><td colspan="2" style="padding:10px;text-align:right;font-size:12px;color:#888;">Shipping</td>
            <td style="padding:10px;text-align:right;font-size:12px;color:#888;">${o.shippingFee === 0 ? 'Free' : money(o.shippingFee)}</td></tr>
        <tr><td colspan="2" style="padding:10px;text-align:right;font-weight:bold;">Total</td>
            <td style="padding:10px;text-align:right;font-weight:bold;font-size:18px;">${money(o.total)}</td></tr>
      </tfoot>
    </table>

    <div style="background:#f8f8f8;padding:20px;margin-bottom:24px;">
      <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#888;margin:0 0 10px;">Delivery Address</p>
      <p style="font-size:14px;line-height:1.7;margin:0;">
        <strong>${fullName}</strong><br/>
        ${address}<br/>
        ${city}, ${state} – ${pincode}<br/>
        ${phone}
      </p>
    </div>

    <div style="background:#f8f8f8;padding:20px;margin-bottom:24px;">
      <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#888;margin:0 0 10px;">Payment Details</p>
      <p style="font-size:12px;color:#555;margin:0;line-height:1.8;">
        Payment ID: <code>${payId}</code><br/>
        Razorpay Order ID: <code>${rzpOrdId}</code>
      </p>
    </div>

    <p style="font-size:12px;color:#aaa;text-align:center;margin-top:40px;">
      &copy; ${new Date().getFullYear()} BADGER SHIELD. All rights reserved.
    </p>
  </div>`;

  // ── Admin email ───────────────────────────────────────────────────────────
  const adminHtml = `
  <div style="font-family:sans-serif;color:#222;max-width:600px;margin:0 auto;border:2px solid #111;padding:32px;">
    <h1 style="font-size:22px;border-bottom:2px solid #111;padding-bottom:8px;margin:0 0 16px;">
      🛍 New Order — #${orderId}
    </h1>
    <p style="font-size:15px;margin:0 0 20px;">
      <strong>${fullName}</strong> placed an order worth <strong>${money(o.total)}</strong>.
    </p>

    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;">
      <thead>
        <tr style="background:#f0f0f0;">
          <th style="padding:8px;text-align:left;">Product</th>
          <th style="padding:8px;text-align:center;">Qty</th>
          <th style="padding:8px;text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div style="background:#fafafa;padding:16px;margin-bottom:16px;">
      <strong>Shipping To:</strong><br/>
      ${fullName}<br/>
      ${address}, ${city}, ${state} – ${pincode}<br/>
      Phone: ${phone}<br/>
      Email: ${safeEmail}
    </div>

    <div style="background:#fafafa;padding:16px;">
      <strong>Payment:</strong><br/>
      Status: <span style="color:green;font-weight:bold;">Confirmed (Razorpay)</span><br/>
      Payment ID: <code>${payId}</code><br/>
      Razorpay Order ID: <code>${rzpOrdId}</code>
    </div>
  </div>`;

  const result = { customerSent: false, adminSent: false };

  if (isValidEmail(customerEmail)) {
    try {
      await transporter.sendMail({
        from: `"BADGER SHIELD" <${process.env.SMTP_FROM_EMAIL}>`,
        to: customerEmail,
        subject: `Order Confirmed — #${orderId}`,
        html: customerHtml,
      });
      result.customerSent = true;
    } catch (e: any) {
      console.error(`Failed to send order confirmation email to customer (${customerEmail}):`, e.message || e);
    }
  }

  if (adminEmail) {
    try {
      await transporter.sendMail({
        from: `"BADGER SHIELD System" <${process.env.SMTP_FROM_EMAIL}>`,
        to: adminEmail,
        subject: `NEW ORDER #${orderId} — ${money(o.total)} from ${firstName}`,
        html: adminHtml,
      });
      result.adminSent = true;
    } catch (e: any) {
      console.error(`Failed to send order confirmation email to admin (${adminEmail}):`, e.message || e);
    }
  }

  if (!result.customerSent && !result.adminSent) {
    throw new Error('Failed to send order emails to both customer and admin.');
  }

  return result;
}
