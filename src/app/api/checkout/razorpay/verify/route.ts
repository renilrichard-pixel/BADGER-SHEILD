import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { confirmOrderWithStock } from '@/lib/orderFulfillment';
import { sendOrderEmails } from '@/lib/orderEmail';
import { createClient } from '@/lib/supabase/server';

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
