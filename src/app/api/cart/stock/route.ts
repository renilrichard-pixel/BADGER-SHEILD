import { NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';
import { getSizeStockQuantity, type SizeStockEntry } from '@/lib/sizeStock';

interface StockCheckItem {
  productId: string;
  cartId: string;
  selectedSize: string;
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
        typeof item.selectedSize === 'string'
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

    for (const item of items) {
      const dbProduct = dbProducts.find((p) => p._id === item.productId);
      if (!dbProduct) {
        stockLimits[item.cartId] = 0;
      } else {
        const availableStock = getSizeStockQuantity(dbProduct.sizeStock, item.selectedSize, dbProduct.stock);
        stockLimits[item.cartId] = Math.max(0, availableStock);
      }
    }

    return NextResponse.json({ success: true, stockLimits });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
