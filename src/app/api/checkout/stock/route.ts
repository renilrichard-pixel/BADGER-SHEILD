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

export async function POST(request: Request) {
  try {
    const { items } = await request.json() as { items?: CheckoutItem[] };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Invalid cart items' }, { status: 400 });
    }

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
      return NextResponse.json({
        success: false,
        errors: stockErrors,
      }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
