import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { amount, orderId } = await request.json();

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json({ error: 'Payment gateway not configured.' }, { status: 503 });
    }

    const Razorpay = (await import('razorpay')).default;
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const order = await rzp.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receipt: orderId,
    });

    return NextResponse.json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create Razorpay order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
