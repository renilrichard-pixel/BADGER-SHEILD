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

type WebhookEventStatus = 'processing' | 'completed' | 'failed';

async function getWebhookEventStatus(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, eventId: string) {
  const { data, error } = await (supabaseAdmin as any)
    .from('razorpay_webhook_events')
    .select('status')
    .eq('event_id', eventId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message || 'Unable to read webhook event state.');
  }

  return data.status as WebhookEventStatus;
}

async function beginWebhookEvent(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  {
    eventId,
    eventName,
    razorpayOrderId,
    razorpayPaymentId,
  }: {
    eventId: string;
    eventName: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
  }
) {
  const { error: insertError } = await (supabaseAdmin as any)
    .from('razorpay_webhook_events')
    .insert(
      {
        event_id: eventId,
        event_name: eventName,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        status: 'processing',
      },
      { onConflict: 'event_id', ignoreDuplicates: true }
    );

  if (insertError) {
    throw new Error(`Unable to record webhook event: ${insertError.message}`);
  }

  const status = await getWebhookEventStatus(supabaseAdmin, eventId);
  if (status === 'completed') return 'completed';

  // A retry can resume an interrupted or transiently failed delivery. Order
  // completion itself is idempotent and has an optimistic status lock.
  const { error: updateError } = await (supabaseAdmin as any)
    .from('razorpay_webhook_events')
    .update({ status: 'processing', last_error: null, updated_at: new Date().toISOString() })
    .eq('event_id', eventId);

  if (updateError) {
    throw new Error(`Unable to start webhook event: ${updateError.message}`);
  }

  return 'processing';
}

async function finishWebhookEvent(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  eventId: string,
  status: Extract<WebhookEventStatus, 'completed' | 'failed'>,
  lastError?: string
) {
  const { error } = await (supabaseAdmin as any)
    .from('razorpay_webhook_events')
    .update({
      status,
      last_error: lastError || null,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('event_id', eventId);

  if (error) {
    throw new Error(`Unable to finish webhook event: ${error.message}`);
  }
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

  if (!eventId) {
    logEvent('WARN', 'Invalid Razorpay Webhook', { reason: 'Missing event ID' });
    return NextResponse.json({ received: false, error: 'Missing webhook event ID.' }, { status: 400 });
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
  try {
    const eventStatus = await beginWebhookEvent(supabaseAdmin, {
      eventId,
      eventName,
      razorpayOrderId,
      razorpayPaymentId,
    });

    if (eventStatus === 'completed') {
      logEvent('INFO', 'Razorpay Webhook Duplicate', { eventName, eventId, razorpayOrderId, razorpayPaymentId });
      return NextResponse.json({ received: true, duplicate: true });
    }
  } catch (error: any) {
    logEvent('ERROR', 'Razorpay Webhook Event Tracking Failed', {
      eventName,
      eventId,
      error: error?.message || String(error),
    });
    return NextResponse.json({ received: false, error: 'Webhook event tracking failed.' }, { status: 500 });
  }

  const { data: order, error: fetchError } = await (supabaseAdmin as any)
    .from('orders')
    .select('*')
    .eq('razorpay_order_id', razorpayOrderId)
    .single();

  if (fetchError || !order) {
    await finishWebhookEvent(supabaseAdmin, eventId, 'failed', fetchError?.message || 'Order not found.').catch((error) =>
      logEvent('ERROR', 'Razorpay Webhook Event Tracking Failed', { eventId, error: String(error) })
    );
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

    await finishWebhookEvent(supabaseAdmin, eventId, 'completed');

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

      if (error.status >= 500) {
        await finishWebhookEvent(supabaseAdmin, eventId, 'failed', error.message).catch((trackingError) =>
          logEvent('ERROR', 'Razorpay Webhook Event Tracking Failed', { eventId, error: String(trackingError) })
        );
        return NextResponse.json({ received: false, error: 'Webhook processing failed.' }, { status: 500 });
      }

      // The payment was authentic, but fulfillment cannot proceed (for example,
      // stock ran out). Mark this event handled and acknowledge it so Razorpay
      // does not retry it for 24 hours and eventually disable the webhook.
      await finishWebhookEvent(supabaseAdmin, eventId, 'completed', error.message);
      return NextResponse.json({ received: true, handled: false });
    }

    logEvent('ERROR', 'Razorpay Webhook Exception', {
      eventName,
      eventId,
      razorpayOrderId,
      razorpayPaymentId,
      error: error?.message || String(error),
    });
    await finishWebhookEvent(supabaseAdmin, eventId, 'failed', error?.message || String(error)).catch((trackingError) =>
      logEvent('ERROR', 'Razorpay Webhook Event Tracking Failed', { eventId, error: String(trackingError) })
    );
    return NextResponse.json({ received: false, error: 'Webhook processing failed.' }, { status: 500 });
  }
}
