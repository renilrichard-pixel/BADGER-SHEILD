import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { completePaidRazorpayOrder, PaymentCompletionError } from '@/lib/razorpayOrderCompletion';
import { createClient as createSupabaseServer } from '@/lib/supabase/server';

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

function signaturesMatch(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(received, 'hex');

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function isRazorpayAuthError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const gatewayError = error as { statusCode?: unknown; status_code?: unknown };
  return gatewayError.statusCode === 401 || gatewayError.status_code === 401;
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

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      logEvent('ERROR', 'Unexpected Exception', { reason: 'Razorpay keys not configured' });
      return NextResponse.json({ verified: false, error: 'Server configuration error.' }, { status: 500 });
    }

    // 1. Verify HMAC signature
    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (!signaturesMatch(expected, razorpay_signature)) {
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

    // 4. Verify actual payment details from Razorpay API
    const Razorpay = (await import('razorpay')).default;
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    let payment: any;
    try {
      payment = await rzp.payments.fetch(razorpay_payment_id);
      if (!payment || payment.order_id !== order.razorpay_order_id) {
        logEvent('WARN', 'Replay Attempt', { reason: 'Payment order ID mismatch', orderId, paymentOrderId: payment?.order_id, orderRzpId: order.razorpay_order_id });
        return NextResponse.json({ verified: false, error: 'Payment details mismatch.' }, { status: 400 });
      }
      if (payment.status !== 'captured' && payment.captured !== true) {
        logEvent('WARN', 'Payment Not Captured', { orderId, razorpay_payment_id, status: payment.status });
        return NextResponse.json({ verified: false, error: 'Payment has not been captured yet.' }, { status: 400 });
      }
    } catch (paymentErr: any) {
      logEvent('ERROR', 'Razorpay Failure', { reason: 'Failed to fetch payment details from gateway', error: paymentErr?.message, razorpay_payment_id });
      const status = isRazorpayAuthError(paymentErr) ? 401 : 400;
      const message = status === 401
        ? 'Payment gateway authentication failed.'
        : 'Failed to verify payment with gateway.';
      return NextResponse.json({ verified: false, error: message }, { status });
    }

    // 5. Confirm order, remove purchased cart rows, and send emails.
    try {
      const completion = await completePaidRazorpayOrder({
        supabaseAdmin,
        order,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        amountInPaise: Number(payment.amount),
      });

      if (completion.confirmedNow) {
        logEvent('INFO', 'Payment Verified', { orderId, emailsSent: completion.emailsSent, cartCleared: completion.cartCleared });
        logEvent('INFO', 'Order Confirmed', { orderId });
      } else {
        logEvent('WARN', 'Duplicate Verification', { orderId, razorpay_payment_id });
      }

      return NextResponse.json({ verified: true, order: completion.order });
    } catch (err: any) {
      if (err instanceof PaymentCompletionError) {
        logEvent('WARN', 'Payment Completion Failed', { orderId, reason: err.message });
        return NextResponse.json({ verified: false, error: err.message }, { status: err.status });
      }

      logEvent('ERROR', 'Database Failure', { error: err?.message || String(err), orderId });
      return NextResponse.json({ verified: false, error: 'Database write failed during order confirmation.' }, { status: 500 });
    }
  } catch (err: any) {
    logEvent('ERROR', 'Unexpected Exception', { error: err.message || String(err), orderId });
    return NextResponse.json({ verified: false, error: err.message || 'Verification error.' }, { status: 500 });
  }
}
