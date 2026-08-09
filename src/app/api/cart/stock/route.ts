import { NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';
import { getSizeStockQuantity, normalizeSize, type SizeStockEntry } from '@/lib/sizeStock';

interface StockCheckItem {
  productId: string;
  cartId: string;
  selectedSize: string;
  quantity: number;
}

interface SanityStockProduct {
  _id: string;
  stock?: number;
  sizeStock?: SizeStockEntry[];
}

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch (_) {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    if (!body || !Array.isArray(body.items)) {
      return NextResponse.json({ error: 'Missing items array' }, { status: 400 });
    }

    const items: StockCheckItem[] = body.items.filter(
      (item: any) =>
        item &&
        typeof item.productId === 'string' &&
        typeof item.cartId === 'string' &&
        typeof item.selectedSize === 'string' &&
        typeof item.quantity === 'number' &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0
    );

    if (items.length === 0) {
      return NextResponse.json({ success: true, stockLimits: {} });
    }

    const productIds = Array.from(new Set(items.map((item) => item.productId)));

    const dbProducts = await client.fetch<SanityStockProduct[]>(
      `*[_id in $productIds] { _id, stock, sizeStock[] { size, quantity } }`,
      { productIds }
    );

    const stockLimits: Record<string, number> = {};

    const requestedStock = new Map<string, { items: StockCheckItem[]; quantity: number }>();

    for (const item of items) {
      const dbProduct = dbProducts.find((p) => p._id === item.productId);
      if (!dbProduct) {
        stockLimits[item.cartId] = 0;
        continue;
      }

      const stockKey = `${item.productId}\u0000${normalizeSize(item.selectedSize)}`;
      const existingRequest = requestedStock.get(stockKey);
      requestedStock.set(stockKey, {
        items: [...(existingRequest?.items ?? []), item],
        quantity: (existingRequest?.quantity ?? 0) + item.quantity,
      });
    }

    for (const request of requestedStock.values()) {
      const representative = request.items[0];
      const dbProduct = dbProducts.find((product) => product._id === representative.productId);
      const availableStock = getSizeStockQuantity(
        dbProduct?.sizeStock,
        representative.selectedSize,
        dbProduct?.stock
      );

      for (const item of request.items) {
        // Reserve the quantities already requested by sibling cart lines when
        // computing this line's selectable maximum.
        stockLimits[item.cartId] = Math.max(0, availableStock - (request.quantity - item.quantity));
      }
    }

    return NextResponse.json({ success: true, stockLimits });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
