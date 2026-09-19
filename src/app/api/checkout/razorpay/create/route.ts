import { NextResponse } from 'next/server';
import { createClient as createSanityClient } from 'next-sanity';
import { apiVersion, dataset, projectId } from '@/sanity/env';
import { createClient as createSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getSizeStockQuantity, normalizeSize, type SizeStockEntry } from '@/lib/sizeStock';
import { BRAND_POLICIES } from '@/lib/policies';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { getProductOverrides, getCustomProducts } from '@/lib/adminProducts';
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
  isPrebook?: boolean;
  prebookAdvanceAmount?: number;
  fullPrice?: number;
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
  
  const allowedKeys = ['items', 'addressId', 'guestAddress', 'paymentMethod', 'isPrebook', 'advanceAmount', 'balanceDue'];
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
    
    const allowedItemKeys = ['cartId', 'productId', 'name', 'quantity', 'selectedSize', 'selectedColor', 'isPrebook', 'prebookAdvanceAmount', 'fullPrice'];
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

  const hasAddressId = typeof body.addressId === 'string' && body.addressId.trim() !== '';
  const hasGuestAddress = typeof body.guestAddress === 'object' && body.guestAddress !== null;

  if (!hasAddressId && !hasGuestAddress) {
    return 'Either addressId or delivery address details must be provided';
  }

  if (hasGuestAddress) {
    const ga = body.guestAddress;
    if (typeof ga.first_name !== 'string' || !ga.first_name.trim()) return 'Invalid or missing first_name in delivery details';
    if (typeof ga.phone !== 'string' || ga.phone.trim().length < 8) return 'Please provide a valid phone number';
    if (typeof ga.address !== 'string' || !ga.address.trim()) return 'Invalid or missing address in delivery details';
    if (typeof ga.city !== 'string' || !ga.city.trim()) return 'Invalid or missing city in delivery details';
    if (typeof ga.state !== 'string' || !ga.state.trim()) return 'Invalid or missing state in delivery details';
    if (typeof ga.pincode !== 'string' || !ga.pincode.trim()) return 'Invalid or missing pincode in delivery details';
    if (typeof ga.email !== 'string' || !ga.email.includes('@')) return 'Please provide a valid email address';
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
  const rateLimit = await checkRateLimit({
    scope: 'checkout:create',
    identifier: getClientIp(request.headers),
    limit: 10,
    windowSeconds: 60,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many checkout attempts. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    );
  }

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

  const { items, addressId, guestAddress, paymentMethod, isPrebook, advanceAmount, balanceDue } = requestBody as {
    items: CheckoutItem[];
    addressId?: string;
    guestAddress?: {
      first_name: string;
      last_name?: string;
      email: string;
      phone: string;
      address: string;
      city: string;
      state: string;
      pincode: string;
    };
    paymentMethod: 'upi' | 'netbanking';
    isPrebook?: boolean;
    advanceAmount?: number;
    balanceDue?: number;
  };

  try {
    // 1. Authenticate user (optional for guest checkout)
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    // 2. Resolve delivery address
    let address: {
      first_name: string;
      last_name: string;
      phone: string;
      address: string;
      city: string;
      state: string;
      pincode: string;
      email: string;
    };

    if (addressId) {
      if (!user) {
        logEvent('WARN', 'Authorization Failure', { reason: 'User session required for saved address', addressId });
        return NextResponse.json({ error: 'Please sign in to use your saved address.' }, { status: 401 });
      }

      const { data: savedAddress, error: addressError } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('id', addressId)
        .eq('user_id', user.id)
        .single();

      if (addressError || !savedAddress) {
        logEvent('WARN', 'Invalid Client Payload', { reason: 'Address not found or ownership mismatch', addressId, userId: user.id });
        return NextResponse.json({ error: 'Delivery address invalid or does not belong to your account.' }, { status: 400 });
      }

      address = {
        first_name: savedAddress.first_name,
        last_name: savedAddress.last_name || '',
        phone: savedAddress.phone,
        address: savedAddress.address,
        city: savedAddress.city,
        state: savedAddress.state,
        pincode: savedAddress.pincode,
        email: user.email || '',
      };
    } else if (guestAddress) {
      address = {
        first_name: guestAddress.first_name.trim(),
        last_name: (guestAddress.last_name || '').trim(),
        phone: guestAddress.phone.trim(),
        address: guestAddress.address.trim(),
        city: guestAddress.city.trim(),
        state: guestAddress.state.trim(),
        pincode: guestAddress.pincode.trim(),
        email: (user?.email || guestAddress.email || '').trim().toLowerCase(),
      };
    } else {
      return NextResponse.json({ error: 'Delivery address details are required.' }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      logEvent('ERROR', 'Unexpected Exception', { reason: 'Razorpay keys not configured' });
      return NextResponse.json({ error: 'Payment gateway not configured.' }, { status: 503 });
    }

    // 3. Fetch products and perform Stage 1 stock, active status, size, and color checks
    const productIds = items.map((item) => item.productId);
    let dbProducts: Array<any> = [];
    try {
      dbProducts = await writeClient.fetch<Array<any>>(
        `*[_id in $productIds] { 
          _id, 
          name, 
          "slug": slug.current, 
          "image": coalesce(images[0].asset->url, image.asset->url), 
          price, 
          salePrice, 
          sizes, 
          colors, 
          active, 
          stock, 
          sizeStock[] { size, quantity } 
        }`,
        { productIds }
      );
    } catch {
      dbProducts = [];
    }

    const [overrides, customProducts] = await Promise.all([
      getProductOverrides(),
      getCustomProducts(),
    ]);

    // Include custom products
    for (const custom of customProducts) {
      if (productIds.includes(custom._id) && !dbProducts.some((p) => p._id === custom._id)) {
        dbProducts.push({
          _id: custom._id,
          name: custom.name,
          slug: custom.slug,
          image: custom.image || (custom.images && custom.images[0]) || '',
          price: custom.price,
          salePrice: custom.salePrice,
          sizes: custom.sizes || ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
          colors: [{ name: 'Default' }],
          active: true,
          stock: custom.stockQty,
          sizeStock: custom.sizeStock,
          isPrebook: custom.isPrebook,
          prebookAdvanceAmount: custom.prebookAdvanceAmount,
        });
      }
    }

    // Apply overrides to products
    dbProducts = dbProducts.map((p) => {
      const o = overrides[p._id];
      if (!o) return p;
      return {
        ...p,
        price: o.price !== undefined ? o.price : p.price,
        salePrice: o.salePrice !== undefined ? o.salePrice : p.salePrice,
        stock: o.stockQty !== undefined ? o.stockQty : p.stock,
        sizeStock: o.sizeStock !== undefined ? o.sizeStock : p.sizeStock,
        isPrebook: o.isPrebook !== undefined ? o.isPrebook : p.isPrebook,
        prebookAdvanceAmount: o.prebookAdvanceAmount !== undefined ? o.prebookAdvanceAmount : p.prebookAdvanceAmount,
      };
    });

    let serverSubtotal = 0;
    const itemsDetail: any[] = [];
    const requestedStock = new Map<string, {
      productId: string;
      productName: string;
      size: string;
      available: number;
      quantity: number;
    }>();

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
      const canonicalSize = dbProduct.sizes?.find((size: string) => normalizeSize(size) === selectedSize);
      if (!canonicalSize) {
        logEvent('WARN', 'Invalid Client Payload', { reason: 'Size not available', productId: item.productId, size: item.selectedSize });
        return NextResponse.json({ error: `Size "${item.selectedSize}" is not available for product "${dbProduct.name}".` }, { status: 400 });
      }

      const availableColors = (dbProduct.colors ?? [])
        .map((color: any) => color.name)
        .filter((name: any): name is string => typeof name === 'string' && name.trim() !== '');
      const { selectedColor, wasInferred: colorWasInferred } = resolveSelectedColor(item.selectedColor, availableColors);

      if (availableColors.length > 0) {
        const colorExists = availableColors.some((color: string) => color === selectedColor);
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
      const stockKey = `${item.productId}\u0000${canonicalSize}`;
      const existingRequest = requestedStock.get(stockKey);
      requestedStock.set(stockKey, {
        productId: item.productId,
        productName: dbProduct.name,
        size: canonicalSize,
        available: availableStock,
        quantity: (existingRequest?.quantity ?? 0) + item.quantity,
      });

      const isItemPrebook = Boolean(item.isPrebook || dbProduct.isPrebook);
      const itemAdvance = item.prebookAdvanceAmount || dbProduct.prebookAdvanceAmount;
      const activePrice = (dbProduct.salePrice !== undefined && dbProduct.salePrice !== null) ? dbProduct.salePrice : dbProduct.price;
      serverSubtotal += activePrice * item.quantity;

      itemsDetail.push({
        cartId: item.cartId || `${item.productId}-${canonicalSize}-${selectedColor}`,
        productId: item.productId,
        name: dbProduct.name,
        slug: dbProduct.slug || '',
        image: dbProduct.image || '',
        quantity: item.quantity,
        selectedSize: canonicalSize,
        selectedColor,
        price: activePrice,
        isPrebook: isItemPrebook,
        prebookAdvanceAmount: itemAdvance,
        fullPrice: activePrice,
      });
    }

    // A cart can contain duplicate lines for the same product and size. Check
    // their combined quantity so separate lines cannot exceed available stock.
    for (const request of requestedStock.values()) {
      if (request.available < request.quantity) {
        logEvent('ERROR', 'Stock Validation Failure', {
          reason: 'Insufficient stock',
          productId: request.productId,
          requested: request.quantity,
          available: request.available,
        });
        return NextResponse.json({
          error: `Insufficient stock for product "${request.productName}" in size "${request.size}". Available: ${request.available}.`,
        }, { status: 400 });
      }
    }

    const serverShipping = BRAND_POLICIES.SHIPPING.FEE;
    const serverTotal = serverSubtotal + serverShipping;

    // Determine if this is a pre-book transaction
    const isOrderPrebook = Boolean(isPrebook || itemsDetail.some((i) => i.isPrebook && i.prebookAdvanceAmount));
    const advancePayableTotal = isOrderPrebook
      ? itemsDetail.reduce(
          (sum, i) =>
            sum + (i.isPrebook && i.prebookAdvanceAmount ? i.prebookAdvanceAmount * i.quantity : i.price * i.quantity),
          0
        )
      : 0;
    const balanceDueTotal = isOrderPrebook ? Math.max(0, serverTotal - advancePayableTotal) : 0;

    const chargedAmount = isOrderPrebook ? advancePayableTotal : serverTotal;
    const amountInPaise = Math.round(chargedAmount * 100);

    if (amountInPaise < 100) {
      logEvent('WARN', 'Invalid Client Payload', { reason: 'Order amount below Razorpay minimum', amountInPaise });
      return NextResponse.json({ error: 'Order amount must be at least ₹1.00.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 4. Implement Order Creation Idempotency
    let matchedOrder: any = null;
    if (user?.id) {
      const { data: existingOrders, error: fetchOrdersError } = await (supabaseAdmin as any)
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (fetchOrdersError) {
        logEvent('ERROR', 'Database Failure', { error: fetchOrdersError.message });
        return NextResponse.json({ error: 'Database verification failed.' }, { status: 500 });
      }

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
          user_id: user?.id ?? null,
          status: 'pending',
          items: itemsDetail,
          subtotal: serverSubtotal,
          shipping_fee: serverShipping,
          tax: 0,
          total: chargedAmount,
          payment_method: paymentMethod,
          customer_info: {
            first_name: address.first_name,
            last_name: address.last_name,
            phone: address.phone,
            address: address.address,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            email: address.email || user?.email || '',
            is_prebook: isOrderPrebook,
            advance_paid: isOrderPrebook ? advancePayableTotal : undefined,
            balance_due: isOrderPrebook ? balanceDueTotal : undefined,
            full_order_value: isOrderPrebook ? serverTotal : undefined,
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
        payment_capture: true,
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
