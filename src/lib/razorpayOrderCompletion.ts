import { SupabaseClient } from '@supabase/supabase-js';
import { createClient as createSanityClient } from 'next-sanity';
import { apiVersion, dataset, projectId } from '@/sanity/env';
import { confirmOrderWithStockResult } from '@/lib/orderFulfillment';
import { sendOrderEmails } from '@/lib/orderEmail';
import { getSizeStockQuantity, normalizeSize, type SizeStockEntry } from '@/lib/sizeStock';

const sanityClient = createSanityClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

interface CompletionOrder {
  order_id: string;
  user_id: string;
  status: string;
  items: any[];
  total: number;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
}

export class PaymentCompletionError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'PaymentCompletionError';
    this.status = status;
  }
}

function cartIdForItem(item: any): string | null {
  if (typeof item?.cartId === 'string' && item.cartId.trim()) return item.cartId;
  if (
    typeof item?.productId === 'string' &&
    typeof item?.selectedSize === 'string' &&
    typeof item?.selectedColor === 'string'
  ) {
    return `${item.productId}-${item.selectedSize}-${item.selectedColor}`;
  }
  return null;
}

async function removePurchasedItemsFromCart(
  supabaseAdmin: SupabaseClient,
  order: CompletionOrder
): Promise<boolean> {
  const cartIds = Array.from(
    new Set((order.items || []).map(cartIdForItem).filter(Boolean))
  ) as string[];

  if (!order.user_id || cartIds.length === 0) return false;

  const { error } = await supabaseAdmin
    .from('carts')
    .delete()
    .eq('user_id', order.user_id)
    .in('cart_id', cartIds);

  if (error) {
    console.error('Failed to remove purchased items from cart:', error.message);
    return false;
  }

  return true;
}

async function validateStock(order: CompletionOrder) {
  const items = order.items || [];
  const productIds = items.map((i: any) => i.productId);
  const dbProducts = await sanityClient.fetch<Array<{ _id: string; name: string; stock?: number; sizeStock?: SizeStockEntry[] }>>(
    `*[_id in $productIds] { _id, name, stock, sizeStock[] { size, quantity } }`,
    { productIds }
  );

  const requestedStock = new Map<string, {
    productId: string;
    productName: string;
    size: string;
    available: number;
    quantity: number;
  }>();

  for (const item of items) {
    const dbProduct = dbProducts.find((p: any) => p._id === item.productId);
    const availableStock = getSizeStockQuantity(dbProduct?.sizeStock, item.selectedSize, dbProduct?.stock);
    const size = normalizeSize(item.selectedSize);
    const stockKey = `${item.productId}\u0000${size}`;
    const existingRequest = requestedStock.get(stockKey);

    requestedStock.set(stockKey, {
      productId: item.productId,
      productName: dbProduct?.name || item.name,
      size: item.selectedSize,
      available: availableStock,
      quantity: (existingRequest?.quantity ?? 0) + Number(item.quantity || 0),
    });
  }

  for (const request of requestedStock.values()) {
    if (request.available < request.quantity) {
      throw new PaymentCompletionError(
        `Fulfillment failed: Insufficient stock for product "${request.productName}" in size "${request.size}".`,
        400
      );
    }
  }
}

export async function completePaidRazorpayOrder({
  supabaseAdmin,
  order,
  razorpayOrderId,
  razorpayPaymentId,
  amountInPaise,
}: {
  supabaseAdmin: SupabaseClient;
  order: CompletionOrder;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amountInPaise: number;
}) {
  if (order.razorpay_order_id !== razorpayOrderId) {
    throw new PaymentCompletionError('Payment details mismatch.', 400);
  }

  if (amountInPaise !== Math.round(order.total * 100)) {
    throw new PaymentCompletionError('Payment amount mismatch.', 400);
  }

  const cartClearedForExistingConfirmation =
    order.status === 'confirmed'
      ? await removePurchasedItemsFromCart(supabaseAdmin, order)
      : false;

  if (order.status === 'confirmed') {
    return {
      order,
      confirmedNow: false,
      cartCleared: cartClearedForExistingConfirmation,
      emailsSent: null,
    };
  }

  if (order.status !== 'pending') {
    throw new PaymentCompletionError(`Order is already in a terminal state: ${order.status}`, 400);
  }

  const { data: duplicatePaymentOrder, error: dupCheckError } = await supabaseAdmin
    .from('orders')
    .select('order_id')
    .eq('razorpay_payment_id', razorpayPaymentId)
    .neq('order_id', order.order_id)
    .maybeSingle();

  if (dupCheckError) {
    throw new PaymentCompletionError('Database check failed.', 500);
  }

  if (duplicatePaymentOrder) {
    throw new PaymentCompletionError('Payment has already been processed for another order.', 400);
  }

  try {
    await validateStock(order);
  } catch (error) {
    if (error instanceof PaymentCompletionError) {
      await supabaseAdmin
        .from('orders')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('order_id', order.order_id)
        .eq('status', 'pending');
    }
    throw error;
  }

  const confirmation = await confirmOrderWithStockResult(
    supabaseAdmin,
    order as any,
    razorpayPaymentId
  );

  const cartCleared = await removePurchasedItemsFromCart(supabaseAdmin, confirmation.order as any);
  let emailsSent: { customerSent: boolean; adminSent: boolean } | null = null;

  if (confirmation.confirmedNow) {
    try {
      emailsSent = await sendOrderEmails({ order: confirmation.order });
    } catch (error: any) {
      console.error('Order confirmed, but confirmation email failed:', error?.message || error);
    }
  }

  return {
    order: confirmation.order,
    confirmedNow: confirmation.confirmedNow,
    cartCleared,
    emailsSent,
  };
}
