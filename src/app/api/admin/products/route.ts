import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequestAuth } from '@/lib/adminAuth';
import {
  getAllAdminProducts,
  updateAdminProduct,
  createAdminProduct,
  deleteAdminProduct,
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
    const {
      productId,
      name,
      categorySlug,
      categoryName,
      description,
      imageUrl,
      images,
      sizes,
      price,
      salePrice,
      stockQty,
      sizeStock,
      isPrebook,
      prebookAdvanceAmount,
    } = body;

    if (!productId) {
      return NextResponse.json({ success: false, error: 'productId is required.' }, { status: 400 });
    }

    const updated = await updateAdminProduct(productId, {
      name,
      categorySlug,
      categoryName,
      description,
      imageUrl,
      images,
      sizes,
      price: price !== undefined ? Number(price) : undefined,
      salePrice: salePrice !== undefined ? (salePrice ? Number(salePrice) : undefined) : undefined,
      stockQty: stockQty !== undefined ? Number(stockQty) : undefined,
      sizeStock,
      isPrebook: isPrebook !== undefined ? Boolean(isPrebook) : undefined,
      prebookAdvanceAmount:
        prebookAdvanceAmount !== undefined
          ? prebookAdvanceAmount
            ? Number(prebookAdvanceAmount)
            : undefined
          : undefined,
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

export async function DELETE(request: NextRequest) {
  if (!checkAdminRequestAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    let productId = searchParams.get('productId');
    if (!productId) {
      const body = await request.json().catch(() => ({}));
      productId = body.productId;
    }

    if (!productId) {
      return NextResponse.json({ success: false, error: 'productId is required.' }, { status: 400 });
    }

    await deleteAdminProduct(productId);
    return NextResponse.json({ success: true, message: 'Product deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete product' },
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
    const {
      name,
      categorySlug,
      categoryName,
      price,
      salePrice,
      description,
      imageUrl,
      images,
      sizes,
      sizeStock,
      isPrebook,
      prebookAdvanceAmount,
    } = body;

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
      images,
      sizes: sizes || ['S', 'M', 'L', 'XL'],
      sizeStock: sizeStock || [],
      isPrebook: isPrebook !== undefined ? Boolean(isPrebook) : false,
      prebookAdvanceAmount: prebookAdvanceAmount ? Number(prebookAdvanceAmount) : undefined,
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
