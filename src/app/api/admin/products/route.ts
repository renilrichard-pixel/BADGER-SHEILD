import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequestAuth } from '@/lib/adminAuth';
import {
  getAllAdminProducts,
  updateProductPriceAndStock,
  createAdminProduct,
} from '@/lib/adminProducts';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!checkAdminRequestAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const products = await getAllAdminProducts();
    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    console.error('Error fetching admin products:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!checkAdminRequestAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { productId, price, salePrice, stockQty, sizeStock, name } = body;

    if (!productId) {
      return NextResponse.json({ success: false, error: 'productId is required.' }, { status: 400 });
    }

    const updated = await updateProductPriceAndStock(productId, {
      price: price !== undefined ? Number(price) : undefined,
      salePrice: salePrice !== undefined ? (salePrice ? Number(salePrice) : undefined) : undefined,
      stockQty: stockQty !== undefined ? Number(stockQty) : undefined,
      sizeStock,
      name,
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!checkAdminRequestAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, categorySlug, categoryName, price, salePrice, description, imageUrl, sizes, sizeStock } = body;

    if (!name || !price) {
      return NextResponse.json(
        { success: false, error: 'Product name and price are required.' },
        { status: 400 }
      );
    }

    const newProduct = await createAdminProduct({
      name,
      categorySlug: categorySlug || 't-shirts',
      categoryName: categoryName || 'T-Shirts',
      price: Number(price),
      salePrice: salePrice ? Number(salePrice) : undefined,
      description,
      imageUrl,
      sizes: sizes || ['S', 'M', 'L', 'XL'],
      sizeStock: sizeStock || [],
    });

    return NextResponse.json({ success: true, product: newProduct });
  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create product' },
      { status: 500 }
    );
  }
}
