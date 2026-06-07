import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { confirmOrderWithStock } from '@/lib/orderFulfillment';
import { sendOrderEmails } from '@/lib/orderEmail';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSanityClient } from 'next-sanity';
import { apiVersion, dataset, projectId } from '@/sanity/env';

const sanityClient = createSanityClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ verified: false, error: 'Missing payment fields.' }, { status: 400 });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ verified: false, error: 'Server configuration error.' }, { status: 500 });
    }

    // Verify HMAC signature
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return NextResponse.json({ verified: false, error: 'Signature mismatch.' }, { status: 400 });
    }

    if (!orderId) return NextResponse.json({ verified: true });

    let supabaseClient;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      supabaseClient = getSupabaseAdmin();
    } else {
      console.warn('SUPABASE_SERVICE_ROLE_KEY is not defined. Falling back to cookies-authenticated server client.');
      supabaseClient = await createClient();
    }

    const { data: order, error: fetchError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .eq('razorpay_order_id', razorpay_order_id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ verified: false, error: 'Order not found.' }, { status: 404 });
    }

    // 1. Recalculate true order total from official Sanity prices
    const items = order.items || [];
    const productIds = items.map((item: any) => item.productId);
    const dbProducts = await sanityClient.fetch<Array<{ _id: string; price: number; salePrice?: number }>>(
      `*[_id in $productIds] { _id, price, salePrice }`,
      { productIds }
    );

    let serverSubtotal = 0;
    for (const item of items) {
      const dbProduct = dbProducts.find((p: any) => p._id === item.productId);
      if (!dbProduct) {
        return NextResponse.json({ verified: false, error: 'Product in order no longer exists.' }, { status: 400 });
      }
      const activePrice = (dbProduct.salePrice !== undefined && dbProduct.salePrice !== null) ? dbProduct.salePrice : dbProduct.price;
      serverSubtotal += activePrice * item.quantity;
    }
    const serverShipping = serverSubtotal > 5000 ? 0 : 250;
    const serverTotal = serverSubtotal + serverShipping;

    // 2. Verify database order total
    if (Math.round(order.total) !== Math.round(serverTotal)) {
      return NextResponse.json({ verified: false, error: 'Order total mismatch.' }, { status: 400 });
    }

    // 3. Verify actual payment amount from Razorpay API
    const Razorpay = (await import('razorpay')).default;
    const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID!, key_secret: process.env.RAZORPAY_KEY_SECRET! });
    try {
      const payment = await rzp.payments.fetch(razorpay_payment_id);
      if (payment.amount !== Math.round(serverTotal * 100)) {
        return NextResponse.json({ verified: false, error: 'Payment amount mismatch.' }, { status: 400 });
      }
    } catch (paymentErr: any) {
      console.error('Failed to fetch Razorpay payment details:', paymentErr);
      return NextResponse.json({ verified: false, error: 'Failed to verify payment details with gateway.' }, { status: 400 });
    }

    let confirmedOrder;
    try {
      confirmedOrder = await confirmOrderWithStock(supabaseClient, order, razorpay_payment_id);
    } catch (err: any) {
      if (err?.code === 'ORDER_CONFIRMING') {
        return NextResponse.json({ verified: true, pending: true }, { status: 202 });
      }
      throw err;
    }

    // Send emails (non-blocking — don't fail the response if email fails)
    sendOrderEmails({ order: confirmedOrder }).catch(e =>
      console.error('Email send failed:', e.message)
    );

    return NextResponse.json({ verified: true, order: confirmedOrder });
  } catch (err: any) {
    console.error('Verify payment error:', err);
    return NextResponse.json({ verified: false, error: err.message || 'Verification error.' }, { status: 500 });
  }
}

