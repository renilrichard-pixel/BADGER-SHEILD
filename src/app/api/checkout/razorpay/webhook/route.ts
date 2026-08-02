import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { completePaidRazorpayOrder, PaymentCompletionError } from '@/lib/razorpayOrderCompletion';

export const runtime = 'nodejs';

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

function signaturesMatch(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(received, 'hex');

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function verifyWebhookSignature(rawBody: string, receivedSignature: string, webhookSecret: string) {
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  return signaturesMatch(expectedSignature, receivedSignature);
}

export async function POST(request: Request) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logEvent('ERROR', 'Razorpay Webhook Misconfigured', { reason: 'RAZORPAY_WEBHOOK_SECRET missing' });
    return NextResponse.json({ received: false, error: 'Webhook secret not configured.' }, { status: 503 });
  }

  const signature = request.headers.get('x-razorpay-signature');
  const eventId = request.headers.get('x-razorpay-event-id');

  if (!signature) {
    logEvent('WARN', 'Invalid Razorpay Webhook', { reason: 'Missing signature', eventId });
    return NextResponse.json({ received: false, error: 'Missing webhook signature.' }, { status: 400 });
  }

  const rawBody = await request.text();

  if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
    logEvent('WARN', 'Invalid Razorpay Webhook', { reason: 'Signature mismatch', eventId });
    return NextResponse.json({ received: false, error: 'Invalid webhook signature.' }, { status: 400 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    logEvent('WARN', 'Invalid Razorpay Webhook', { reason: 'Malformed JSON', eventId });
    return NextResponse.json({ received: false, error: 'Malformed webhook payload.' }, { status: 400 });
  }

  const eventName = payload?.event;
  if (eventName !== 'payment.captured' && eventName !== 'order.paid') {
    logEvent('INFO', 'Razorpay Webhook Ignored', { eventName, eventId });
    return NextResponse.json({ received: true, ignored: true });
  }

  const payment = payload?.payload?.payment?.entity;
  const orderEntity = payload?.payload?.order?.entity;
  const razorpayOrderId = payment?.order_id || orderEntity?.id;
  const razorpayPaymentId = payment?.id;
  const amountInPaise = Number(payment?.amount ?? orderEntity?.amount_paid);

  if (!razorpayOrderId || !razorpayPaymentId || !Number.isFinite(amountInPaise)) {
    logEvent('WARN', 'Invalid Razorpay Webhook', {
      reason: 'Missing payment/order fields',
      eventName,
      eventId,
      razorpayOrderId,
      razorpayPaymentId,
    });
    return NextResponse.json({ received: false, error: 'Missing payment details.' }, { status: 400 });
  }

  if (eventName === 'payment.captured' && payment?.captured !== true && payment?.status !== 'captured') {
    logEvent('INFO', 'Razorpay Webhook Ignored', {
      reason: 'Payment is not captured',
      eventName,
      eventId,
      razorpayOrderId,
      razorpayPaymentId,
      status: payment?.status,
    });
    return NextResponse.json({ received: true, ignored: true });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: order, error: fetchError } = await (supabaseAdmin as any)
    .from('orders')
    .select('*')
    .eq('razorpay_order_id', razorpayOrderId)
    .single();

  if (fetchError || !order) {
    logEvent('ERROR', 'Razorpay Webhook Order Missing', {
      eventName,
      eventId,
      razorpayOrderId,
      razorpayPaymentId,
      error: fetchError?.message,
    });
    return NextResponse.json({ received: false, error: 'Order not found.' }, { status: 404 });
  }

  try {
    const completion = await completePaidRazorpayOrder({
      supabaseAdmin,
      order,
      razorpayOrderId,
      razorpayPaymentId,
      amountInPaise,
    });

    logEvent('INFO', 'Razorpay Webhook Processed', {
      eventName,
      eventId,
      orderId: completion.order.order_id,
      confirmedNow: completion.confirmedNow,
      cartCleared: completion.cartCleared,
      emailsSent: completion.emailsSent,
    });

    return NextResponse.json({
      received: true,
      orderId: completion.order.order_id,
      confirmed: completion.order.status === 'confirmed',
      confirmedNow: completion.confirmedNow,
    });
  } catch (error: any) {
    if (error instanceof PaymentCompletionError) {
      logEvent('WARN', 'Razorpay Webhook Completion Failed', {
        eventName,
        eventId,
        razorpayOrderId,
        razorpayPaymentId,
        reason: error.message,
      });
      return NextResponse.json({ received: false, error: error.message }, { status: error.status });
    }

    logEvent('ERROR', 'Razorpay Webhook Exception', {
      eventName,
      eventId,
      razorpayOrderId,
      razorpayPaymentId,
      error: error?.message || String(error),
    });
    return NextResponse.json({ received: false, error: 'Webhook processing failed.' }, { status: 500 });
  }
}
