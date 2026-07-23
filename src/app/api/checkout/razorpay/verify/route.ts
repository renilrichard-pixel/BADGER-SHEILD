import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { confirmOrderWithStock } from '@/lib/orderFulfillment';
import { sendOrderEmails } from '@/lib/orderEmail';
import { createClient as createSupabaseServer } from '@/lib/supabase/server';
import { createClient as createSanityClient } from 'next-sanity';
import { apiVersion, dataset, projectId } from '@/sanity/env';

const sanityClient = createSanityClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

function logEvent(
  level: 'INFO' | 'WARN' | 'ERROR',
  event: string,
  details: Record<string, any> = {}
) {
  const safeDetails = { ...details };
  delete safeDetails.email;
  delete safeDetails.phone;
  delete safeDetails.customer_info;
  delete safeDetails.address;
  delete safeDetails.first_name;
  delete safeDetails.last_name;
  delete safeDetails.pincode;
  delete safeDetails.password;
  delete safeDetails.token;
  delete safeDetails.secret;

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...safeDetails,
  }));
}

function validateVerifyPayload(body: any): string | null {
  if (typeof body !== 'object' || body === null) {
    return 'Payload must be a JSON object';
  }

  const allowedKeys = ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature', 'orderId'];
  const bodyKeys = Object.keys(body);
  for (const key of bodyKeys) {
    if (!allowedKeys.includes(key)) {
      return `Unexpected key: ${key}`;
    }
  }

  if (typeof body.razorpay_order_id !== 'string' || body.razorpay_order_id.trim() === '') {
    return 'Invalid or missing razorpay_order_id';
  }
  if (typeof body.razorpay_payment_id !== 'string' || body.razorpay_payment_id.trim() === '') {
    return 'Invalid or missing razorpay_payment_id';
  }
  if (typeof body.razorpay_signature !== 'string' || body.razorpay_signature.trim() === '') {
    return 'Invalid or missing razorpay_signature';
  }
  if (typeof body.orderId !== 'string' || body.orderId.trim() === '') {
    return 'Invalid or missing orderId';
  }

  return null;
}

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch (err) {
    logEvent('WARN', 'Invalid Client Payload', { reason: 'Malformed JSON payload' });
    return NextResponse.json({ verified: false, error: 'Malformed JSON payload' }, { status: 400 });
  }

  const validationError = validateVerifyPayload(body);
  if (validationError) {
    logEvent('WARN', 'Invalid Client Payload', { reason: validationError });
    return NextResponse.json({ verified: false, error: validationError }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = body;

  try {
    logEvent('INFO', 'Payment Verification Started', { orderId, razorpay_order_id, razorpay_payment_id });

    if (!process.env.RAZORPAY_KEY_SECRET) {
      logEvent('ERROR', 'Unexpected Exception', { reason: 'Razorpay secret key not configured' });
      return NextResponse.json({ verified: false, error: 'Server configuration error.' }, { status: 500 });
    }

    // 1. Verify HMAC signature
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      logEvent('WARN', 'Replay Attempt', { reason: 'Signature mismatch', orderId, razorpay_order_id, razorpay_payment_id });
      return NextResponse.json({ verified: false, error: 'Signature mismatch.' }, { status: 400 });
    }

    // 2. Authenticate user
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logEvent('WARN', 'Authorization Failure', { reason: authError?.message || 'No active user session', orderId });
      return NextResponse.json({ verified: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 3. Fetch order (confirming customer ownership)
    const { data: fetchedOrder, error: fetchError } = await (supabaseAdmin as any)
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .eq('user_id', user.id)
      .single();

    const order = fetchedOrder as any;

    if (fetchError || !order) {
      logEvent('WARN', 'Invalid Client Payload', { reason: 'Order not found or ownership mismatch', orderId, userId: user.id });
      return NextResponse.json({ verified: false, error: 'Order not found.' }, { status: 404 });
    }

    if (order.razorpay_order_id !== razorpay_order_id) {
      logEvent('WARN', 'Replay Attempt', { reason: 'Razorpay order ID mismatch', orderId, requested: razorpay_order_id, stored: order.razorpay_order_id });
      return NextResponse.json({ verified: false, error: 'Payment details mismatch.' }, { status: 400 });
    }

    // 4. Replay Protection: return success if already confirmed
    if (order.status === 'confirmed') {
      logEvent('WARN', 'Duplicate Verification', { orderId, razorpay_payment_id });
      return NextResponse.json({ verified: true, order });
    }

    if (order.status !== 'pending') {
      logEvent('WARN', 'Replay Attempt', { reason: 'Order in non-pending terminal state', orderId, status: order.status });
      return NextResponse.json({ verified: false, error: `Order is already in a terminal state: ${order.status}` }, { status: 400 });
    }

    // 5. Verify payment ID has not already been processed for another order
    const { data: duplicatePaymentOrder, error: dupCheckError } = await (supabaseAdmin as any)
      .from('orders')
      .select('order_id')
      .eq('razorpay_payment_id', razorpay_payment_id)
      .neq('order_id', orderId)
      .maybeSingle();

    if (dupCheckError) {
      logEvent('ERROR', 'Database Failure', { error: dupCheckError.message, orderId });
      return NextResponse.json({ verified: false, error: 'Database check failed.' }, { status: 500 });
    }
    if (duplicatePaymentOrder) {
      logEvent('WARN', 'Replay Attempt', { reason: 'Payment ID already used on another order', orderId, duplicateOrderId: duplicatePaymentOrder.order_id, razorpay_payment_id });
      return NextResponse.json({ verified: false, error: 'Payment has already been processed for another order.' }, { status: 400 });
    }

    // 6. Check order expiration (lazy expiration update)
    const orderCreatedAt = new Date(order.created_at).getTime();
    const now = Date.now();
    const expirationMinutes = Number(process.env.ORDER_EXPIRATION_MINUTES) || 30;
    const expirationMs = expirationMinutes * 60 * 1000;
    if (now - orderCreatedAt > expirationMs) {
      await (supabaseAdmin as any)
        .from('orders')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('order_id', orderId)
        .eq('status', 'pending');

      logEvent('WARN', 'Expired Order Verification', { orderId, expiredAt: order.created_at });
      return NextResponse.json({ verified: false, error: 'Order has expired.' }, { status: 400 });
    }

    // 7. Verify actual payment details from Razorpay API
    const Razorpay = (await import('razorpay')).default;
    const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID!, key_secret: process.env.RAZORPAY_KEY_SECRET! });
    try {
      const payment = await rzp.payments.fetch(razorpay_payment_id);
      if (!payment || payment.order_id !== order.razorpay_order_id) {
        logEvent('WARN', 'Replay Attempt', { reason: 'Payment order ID mismatch', orderId, paymentOrderId: payment?.order_id, orderRzpId: order.razorpay_order_id });
        return NextResponse.json({ verified: false, error: 'Payment details mismatch.' }, { status: 400 });
      }
      if (payment.amount !== Math.round(order.total * 100)) {
        logEvent('WARN', 'Invalid Client Payload', { reason: 'Payment amount mismatch', orderId, expected: Math.round(order.total * 100), received: payment.amount });
        return NextResponse.json({ verified: false, error: 'Payment amount mismatch.' }, { status: 400 });
      }
    } catch (paymentErr: any) {
      logEvent('ERROR', 'Razorpay Failure', { reason: 'Failed to fetch payment details from gateway', error: paymentErr?.message, razorpay_payment_id });
      return NextResponse.json({ verified: false, error: 'Failed to verify payment with gateway.' }, { status: 400 });
    }

    // 8. Stage 2 Stock Validation: verify stock immediately before confirmation
    const items = order.items || [];
    const productIds = items.map((i: any) => i.productId);
    const dbProducts = await sanityClient.fetch<Array<{ _id: string; name: string; stock?: number }>>(
      `*[_id in $productIds] { _id, name, stock }`,
      { productIds }
    );

    for (const item of items) {
      const dbProduct = dbProducts.find((p: any) => p._id === item.productId);
      const availableStock = typeof dbProduct?.stock === 'number' ? dbProduct.stock : 0;
      if (availableStock < item.quantity) {
        logEvent('ERROR', 'Stock Validation Failure', { reason: 'Insufficient stock during Stage 2 validation', orderId, productId: item.productId, requested: item.quantity, available: availableStock });
        
        await (supabaseAdmin as any)
          .from('orders')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('order_id', orderId)
          .eq('status', 'pending');

        logEvent('INFO', 'Order Failed', { orderId, reason: 'Stage 2 stock validation failed' });
        return NextResponse.json({ verified: false, error: `Fulfillment failed: Insufficient stock for product "${dbProduct?.name || item.name}".` }, { status: 400 });
      }
    }

    // 9. Confirm order with optimistic locking status transition
    let confirmedOrder;
    try {
      confirmedOrder = await confirmOrderWithStock(supabaseAdmin, order, razorpay_payment_id);
      logEvent('INFO', 'Payment Verified', { orderId });
      logEvent('INFO', 'Order Confirmed', { orderId });
    } catch (err: any) {
      if (err?.code === 'ORDER_CONFIRMING') {
        return NextResponse.json({ verified: true, pending: true }, { status: 202 });
      }
      logEvent('ERROR', 'Database Failure', { error: err?.message || String(err), orderId });
      return NextResponse.json({ verified: false, error: 'Database write failed during order confirmation.' }, { status: 500 });
    }

    // Send emails (non-blocking)
    sendOrderEmails({ order: confirmedOrder }).catch(e =>
      console.error('Email send failed:', e.message)
    );

    return NextResponse.json({ verified: true, order: confirmedOrder });
  } catch (err: any) {
    logEvent('ERROR', 'Unexpected Exception', { error: err.message || String(err), orderId });
    return NextResponse.json({ verified: false, error: err.message || 'Verification error.' }, { status: 500 });
  }
}
