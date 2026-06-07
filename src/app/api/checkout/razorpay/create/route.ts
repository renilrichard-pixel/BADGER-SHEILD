import { NextResponse } from 'next/server';
import { createClient } from 'next-sanity';
import { apiVersion, dataset, projectId } from '@/sanity/env';

const writeClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

interface CheckoutItem {
  productId: string;
  name: string;
  quantity: number;
}

export async function POST(request: Request) {
  try {
    const { items, orderId } = await request.json() as { items?: CheckoutItem[]; orderId?: string };

    if (!items || !Array.isArray(items) || items.length === 0 || !orderId) {
      return NextResponse.json({ error: 'Invalid checkout parameters.' }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json({ error: 'Payment gateway not configured.' }, { status: 503 });
    }

    // Fetch actual prices from Sanity
    const productIds = items.map((item) => item.productId);
    const dbProducts = await writeClient.fetch<Array<{ _id: string; price: number }>>(
      `*[_id in $productIds] { _id, price }`,
      { productIds }
    );

    let serverSubtotal = 0;
    for (const item of items) {
      const dbProduct = dbProducts.find((p) => p._id === item.productId);
      if (!dbProduct) {
        return NextResponse.json({ error: `Product ${item.name} no longer exists.` }, { status: 400 });
      }
      serverSubtotal += dbProduct.price * item.quantity;
    }

    const serverShipping = serverSubtotal > 5000 ? 0 : 250;
    const serverTotal = serverSubtotal + serverShipping;

    const Razorpay = (await import('razorpay')).default;
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const order = await rzp.orders.create({
      amount: Math.round(serverTotal * 100), // paise
      currency: 'INR',
      receipt: orderId,
    });

    return NextResponse.json({
      order,
      subtotal: serverSubtotal,
      shipping: serverShipping,
      total: serverTotal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create Razorpay order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

