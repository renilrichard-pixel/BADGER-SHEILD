import { NextResponse } from 'next/server';
import { createClient as createSanityClient } from 'next-sanity';
import { apiVersion, dataset, projectId } from '@/sanity/env';
import { createClient as createSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getSizeStockQuantity, normalizeSize, type SizeStockEntry } from '@/lib/sizeStock';
import { BRAND_POLICIES } from '@/lib/policies';
import crypto from 'crypto';

const writeClient = createSanityClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

interface CheckoutItem {
  cartId?: string;
  productId: string;
  name: string;
  quantity: number;
  selectedSize: string;
  selectedColor?: string;
}

const DEFAULT_SELECTED_COLOR = 'Default';
const DEFAULT_SELECTED_COLOR_KEY = DEFAULT_SELECTED_COLOR.toLowerCase();

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

function validateCreatePayload(body: any): string | null {
  if (typeof body !== 'object' || body === null) {
    return 'Payload must be a JSON object';
  }
  
  const allowedKeys = ['items', 'addressId', 'paymentMethod'];
  const bodyKeys = Object.keys(body);
  for (const key of bodyKeys) {
    if (!allowedKeys.includes(key)) {
      return `Unexpected key: ${key}`;
    }
  }

  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return 'Missing or empty items array';
  }

  for (let i = 0; i < body.items.length; i++) {
    const item = body.items[i];
    if (typeof item !== 'object' || item === null) {
      return `Item at index ${i} must be a JSON object`;
    }
    
    const allowedItemKeys = ['cartId', 'productId', 'name', 'quantity', 'selectedSize', 'selectedColor'];
    const itemKeys = Object.keys(item);
    for (const key of itemKeys) {
      if (!allowedItemKeys.includes(key)) {
        return `Unexpected key in item at index ${i}: ${key}`;
      }
    }

    if (typeof item.productId !== 'string' || item.productId.trim() === '') {
      return `Invalid or missing productId in item at index ${i}`;
    }
    if (item.cartId !== undefined && (typeof item.cartId !== 'string' || item.cartId.trim() === '')) {
      return `Invalid cartId in item at index ${i}`;
    }
    if (typeof item.name !== 'string' || item.name.trim() === '') {
      return `Invalid or missing name in item at index ${i}`;
    }
    if (typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity <= 0) {
      return `Invalid or missing quantity in item at index ${i} (must be integer > 0)`;
    }
    if (typeof item.selectedSize !== 'string' || item.selectedSize.trim() === '') {
      return `Invalid or missing selectedSize in item at index ${i}`;
    }
    if (item.selectedColor !== undefined && typeof item.selectedColor !== 'string') {
      return `Invalid selectedColor in item at index ${i}`;
    }
  }

  if (typeof body.addressId !== 'string' || body.addressId.trim() === '') {
    return 'Invalid or missing addressId';
  }

  if (body.paymentMethod !== 'upi' && body.paymentMethod !== 'netbanking') {
    return 'Invalid or missing paymentMethod (must be upi or netbanking)';
  }

  return null;
}

function itemsAreEquivalent(itemsA: any[], itemsB: any[]): boolean {
  if (!Array.isArray(itemsA) || !Array.isArray(itemsB)) return false;
  if (itemsA.length !== itemsB.length) return false;

  const sortedA = [...itemsA].sort((a, b) => (a.productId || '').localeCompare(b.productId || ''));
  const sortedB = [...itemsB].sort((a, b) => (a.productId || '').localeCompare(b.productId || ''));

  for (let i = 0; i < sortedA.length; i++) {
    const a = sortedA[i];
    const b = sortedB[i];
    if (a.productId !== b.productId) return false;
    if (a.quantity !== b.quantity) return false;
    if (a.selectedSize !== b.selectedSize) return false;
    if (a.selectedColor !== b.selectedColor) return false;
  }
  return true;
}

function generateOrderId(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `BS-${yyyy}${mm}${dd}-${hex}`;
}

function isRazorpayAuthError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const gatewayError = error as { statusCode?: unknown; status_code?: unknown };
  return gatewayError.statusCode === 401 || gatewayError.status_code === 401;
}

function resolveSelectedColor(
  rawSelectedColor: string | undefined,
  availableColors: string[]
): { selectedColor: string; wasInferred: boolean } {
  const trimmedColor = rawSelectedColor?.trim() ?? '';

  if (availableColors.length === 0) {
    return {
      selectedColor: trimmedColor || DEFAULT_SELECTED_COLOR,
      wasInferred: !trimmedColor,
    };
  }

  if (!trimmedColor || trimmedColor.toLowerCase() === DEFAULT_SELECTED_COLOR_KEY) {
    return {
      selectedColor: availableColors[0],
      wasInferred: true,
    };
  }

  const canonicalColor = availableColors.find(
    (color) => color.toLowerCase() === trimmedColor.toLowerCase()
  );

  return {
    selectedColor: canonicalColor ?? trimmedColor,
    wasInferred: false,
  };
}

export async function POST(request: Request) {
  let requestBody: any;
  try {
    requestBody = await request.json();
  } catch (err) {
    logEvent('WARN', 'Invalid Client Payload', { reason: 'Malformed JSON payload' });
    return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }

  const validationError = validateCreatePayload(requestBody);
  if (validationError) {
    logEvent('WARN', 'Invalid Client Payload', { reason: validationError });
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const { items, addressId, paymentMethod } = requestBody as {
    items: CheckoutItem[];
    addressId: string;
    paymentMethod: 'upi' | 'netbanking';
  };

  try {
    // 1. Authenticate user
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logEvent('WARN', 'Authorization Failure', { reason: authError?.message || 'No active user session' });
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // 2. Validate customer address ownership
    const { data: address, error: addressError } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('id', addressId)
      .eq('user_id', user.id)
      .single();

    if (addressError || !address) {
      logEvent('WARN', 'Invalid Client Payload', { reason: 'Address not found or ownership mismatch', addressId, userId: user.id });
      return NextResponse.json({ error: 'Delivery address invalid or does not belong to your account.' }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      logEvent('ERROR', 'Unexpected Exception', { reason: 'Razorpay keys not configured' });
      return NextResponse.json({ error: 'Payment gateway not configured.' }, { status: 503 });
    }

    // 3. Fetch products and perform Stage 1 stock, active status, size, and color checks
    const productIds = items.map((item) => item.productId);
    const dbProducts = await writeClient.fetch<Array<{
      _id: string;
      name: string;
      price: number;
      salePrice?: number;
      sizes: string[];
      colors?: Array<{ name: string }>;
      active?: boolean;
      stock?: number;
      sizeStock?: SizeStockEntry[];
    }>>(
      `*[_id in $productIds] { _id, name, price, salePrice, sizes, colors, active, stock, sizeStock[] { size, quantity } }`,
      { productIds }
    );

    let serverSubtotal = 0;
    const itemsDetail: any[] = [];

    for (const item of items) {
      const dbProduct = dbProducts.find((p) => p._id === item.productId);
      if (!dbProduct) {
        logEvent('ERROR', 'Stock Validation Failure', { reason: 'Product no longer exists', productId: item.productId });
        return NextResponse.json({ error: `Product "${item.name}" no longer exists.` }, { status: 400 });
      }

      if (dbProduct.active === false) {
        logEvent('ERROR', 'Price Validation Failure', { reason: 'Product is inactive', productId: item.productId });
        return NextResponse.json({ error: `Product "${dbProduct.name}" is not currently available.` }, { status: 400 });
      }

      const selectedSize = normalizeSize(item.selectedSize);
      const canonicalSize = dbProduct.sizes?.find((size) => normalizeSize(size) === selectedSize);
      if (!canonicalSize) {
        logEvent('WARN', 'Invalid Client Payload', { reason: 'Size not available', productId: item.productId, size: item.selectedSize });
        return NextResponse.json({ error: `Size "${item.selectedSize}" is not available for product "${dbProduct.name}".` }, { status: 400 });
      }

      const availableColors = (dbProduct.colors ?? [])
        .map((color) => color.name)
        .filter((name): name is string => typeof name === 'string' && name.trim() !== '');
      const { selectedColor, wasInferred: colorWasInferred } = resolveSelectedColor(item.selectedColor, availableColors);

      if (availableColors.length > 0) {
        const colorExists = availableColors.some((color) => color === selectedColor);
        if (!colorExists) {
          logEvent('WARN', 'Invalid Client Payload', { reason: 'Color not available', productId: item.productId, color: selectedColor });
          return NextResponse.json({ error: `Color "${selectedColor}" is not available for product "${dbProduct.name}".` }, { status: 400 });
        }

        if (colorWasInferred) {
          logEvent('INFO', 'Legacy Cart Color Normalized', {
            productId: item.productId,
            selectedColor,
          });
        }
      }

      const availableStock = getSizeStockQuantity(dbProduct.sizeStock, canonicalSize, dbProduct.stock);
      if (availableStock < item.quantity) {
        logEvent('ERROR', 'Stock Validation Failure', { reason: 'Insufficient stock', productId: item.productId, requested: item.quantity, available: availableStock });
        return NextResponse.json({ error: `Insufficient stock for product "${dbProduct.name}" in size "${canonicalSize}". Available: ${availableStock}.` }, { status: 400 });
      }

      const activePrice = (dbProduct.salePrice !== undefined && dbProduct.salePrice !== null) ? dbProduct.salePrice : dbProduct.price;
      serverSubtotal += activePrice * item.quantity;

      itemsDetail.push({
        cartId: item.cartId || `${item.productId}-${canonicalSize}-${selectedColor}`,
        productId: item.productId,
        name: dbProduct.name,
        quantity: item.quantity,
        selectedSize: canonicalSize,
        selectedColor,
        price: activePrice,
      });
    }

    const serverShipping = BRAND_POLICIES.SHIPPING.FEE;
    const serverTotal = serverSubtotal + serverShipping;
    const amountInPaise = Math.round(serverTotal * 100);

    if (amountInPaise < 100) {
      logEvent('WARN', 'Invalid Client Payload', { reason: 'Order amount below Razorpay minimum', amountInPaise });
      return NextResponse.json({ error: 'Order amount must be at least ₹1.00.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 4. Implement Order Creation Idempotency
    const { data: existingOrders, error: fetchOrdersError } = await (supabaseAdmin as any)
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (fetchOrdersError) {
      logEvent('ERROR', 'Database Failure', { error: fetchOrdersError.message });
      return NextResponse.json({ error: 'Database verification failed.' }, { status: 500 });
    }

    let matchedOrder: any = null;
    const ordersList = existingOrders as any[] | null;
    if (ordersList && ordersList.length > 0) {
      for (const ord of ordersList) {
        if (
          ord.payment_method === paymentMethod &&
          Math.round(ord.total) === Math.round(serverTotal) &&
          ord.customer_info?.address === address.address &&
          ord.customer_info?.phone === address.phone &&
          itemsAreEquivalent(ord.items, itemsDetail)
        ) {
          matchedOrder = ord;
          break;
        }
      }
    }

    const Razorpay = (await import('razorpay')).default;
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });

    if (matchedOrder && matchedOrder.razorpay_order_id) {
      try {
        const rzpOrder = await rzp.orders.fetch(matchedOrder.razorpay_order_id);
        if (rzpOrder && rzpOrder.status === 'created') {
          logEvent('INFO', 'Pending Order Reused', { orderId: matchedOrder.order_id, razorpayOrderId: matchedOrder.razorpay_order_id });
          return NextResponse.json({
            order: rzpOrder,
            order_id: rzpOrder.id,
            amount: rzpOrder.amount,
            currency: rzpOrder.currency,
            orderId: matchedOrder.order_id,
            subtotal: matchedOrder.subtotal,
            shipping: matchedOrder.shipping_fee,
            total: matchedOrder.total,
          });
        }
      } catch (err: any) {
        logEvent('WARN', 'Razorpay Failure', { reason: 'Could not fetch existing Razorpay order. Creating new one.', error: err?.message, razorpayOrderId: matchedOrder.razorpay_order_id });
      }
    }

    // 5. Generate server-side order ID and insert pending record (fails fast on database error)
    const orderId = matchedOrder?.order_id ?? generateOrderId();
    
    if (!matchedOrder) {
      logEvent('INFO', 'Checkout Started', { orderId });
      const { data: newOrder, error: insertError } = await (supabaseAdmin as any)
        .from('orders')
        .insert({
          order_id: orderId,
          user_id: user.id,
          status: 'pending',
          items: itemsDetail,
          subtotal: serverSubtotal,
          shipping_fee: serverShipping,
          tax: 0,
          total: serverTotal,
          payment_method: paymentMethod,
          customer_info: {
            first_name: address.first_name,
            last_name: address.last_name,
            phone: address.phone,
            address: address.address,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            email: user.email ?? '',
          },
          razorpay_order_id: null,
          razorpay_payment_id: null,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError || !newOrder) {
        logEvent('ERROR', 'Database Failure', { error: insertError?.message || 'Empty result on insert', orderId });
        return NextResponse.json({ error: 'Failed to create order record.' }, { status: 500 });
      }
      logEvent('INFO', 'Pending Order Created', { orderId });
    }

    // 6. Create Razorpay order
    let rzpOrder;
    try {
      rzpOrder = await rzp.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: orderId,
      });
      logEvent('INFO', 'Razorpay Order Created', { orderId, razorpayOrderId: rzpOrder.id });
    } catch (rzpErr: any) {
      logEvent('ERROR', 'Razorpay Failure', { error: rzpErr?.message || 'Razorpay creation failed', orderId });
      // Rollback database insertion if Razorpay order creation fails
      await (supabaseAdmin as any).from('orders').delete().eq('order_id', orderId);
      const status = isRazorpayAuthError(rzpErr) ? 401 : 500;
      const message = status === 401
        ? 'Payment gateway authentication failed.'
        : 'Payment gateway order creation failed. Checkout rolled back.';
      return NextResponse.json({ error: message }, { status });
    }

    // 7. Update pending database order with Razorpay order ID
    const { error: updateError } = await (supabaseAdmin as any)
      .from('orders')
      .update({
        razorpay_order_id: rzpOrder.id,
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId);

    if (updateError) {
      logEvent('ERROR', 'Database Failure', { error: updateError.message, orderId, razorpayOrderId: rzpOrder.id });
      // Rollback database record
      await (supabaseAdmin as any).from('orders').delete().eq('order_id', orderId);
      return NextResponse.json({ error: 'Failed to complete order linkage.' }, { status: 500 });
    }

    return NextResponse.json({
      order: rzpOrder,
      order_id: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      orderId,
      subtotal: serverSubtotal,
      shipping: serverShipping,
      total: serverTotal,
    });
  } catch (error: any) {
    logEvent('ERROR', 'Unexpected Exception', { error: error?.message || String(error) });
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
