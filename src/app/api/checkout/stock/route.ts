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
  cartId: string;
  name: string;
  quantity: number;
}

interface StockProduct {
  _id: string;
  name: string;
  stock?: number;
}

interface StockError {
  productId: string;
  cartId: string;
  name: string;
  available: number;
  reason: string;
}

function logEvent(
  level: 'INFO' | 'WARN' | 'ERROR',
  event: string,
  details: Record<string, any> = {}
) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...details,
  }));
}

function validateStockPayload(body: any): string | null {
  if (typeof body !== 'object' || body === null) {
    return 'Payload must be a JSON object';
  }

  const allowedKeys = ['items'];
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

    const allowedItemKeys = ['productId', 'cartId', 'name', 'quantity'];
    const itemKeys = Object.keys(item);
    for (const key of itemKeys) {
      if (!allowedItemKeys.includes(key)) {
        return `Unexpected key in item at index ${i}: ${key}`;
      }
    }

    if (typeof item.productId !== 'string' || item.productId.trim() === '') {
      return `Invalid or missing productId in item at index ${i}`;
    }
    if (typeof item.cartId !== 'string' || item.cartId.trim() === '') {
      return `Invalid or missing cartId in item at index ${i}`;
    }
    if (typeof item.name !== 'string' || item.name.trim() === '') {
      return `Invalid or missing name in item at index ${i}`;
    }
    if (typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity <= 0) {
      return `Invalid or missing quantity in item at index ${i} (must be integer > 0)`;
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch (err) {
      logEvent('WARN', 'Invalid Client Payload', { reason: 'Malformed JSON payload' });
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    const validationError = validateStockPayload(body);
    if (validationError) {
      logEvent('WARN', 'Invalid Client Payload', { reason: validationError });
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { items } = body as { items: CheckoutItem[] };

    const productIds = items.map((item) => item.productId);

    const dbProducts = await writeClient.fetch<StockProduct[]>(
      `*[_id in $productIds] { _id, name, stock }`,
      { productIds }
    );

    const stockErrors: StockError[] = [];

    for (const item of items) {
      const dbProduct = dbProducts.find((p) => p._id === item.productId);
      if (!dbProduct) {
        stockErrors.push({
          productId: item.productId,
          cartId: item.cartId,
          name: item.name,
          available: 0,
          reason: 'Product no longer exists',
        });
      } else {
        const availableStock = typeof dbProduct.stock === 'number' ? dbProduct.stock : 0;
        if (availableStock < item.quantity) {
          stockErrors.push({
            productId: item.productId,
            cartId: item.cartId,
            name: dbProduct.name,
            available: availableStock,
            reason: availableStock === 0 ? 'Out of stock' : `Only ${availableStock} units left`,
          });
        }
      }
    }

    if (stockErrors.length > 0) {
      logEvent('ERROR', 'Stock Validation Failure', { count: stockErrors.length });
      return NextResponse.json({
        success: false,
        errors: stockErrors,
      }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    logEvent('ERROR', 'Unexpected Exception', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
