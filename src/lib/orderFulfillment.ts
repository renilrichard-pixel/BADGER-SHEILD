import { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from 'next-sanity';
import { apiVersion, dataset, projectId } from '@/sanity/env';
import { hasSizeStock, normalizeSize, type SizeStockEntry } from '@/lib/sizeStock';

const writeClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

interface OrderRow {
  id: number;
  order_id: string;
  user_id: string;
  status: string;
  items: any[];
  subtotal: number;
  shipping_fee: number;
  tax: number;
  total: number;
  payment_method: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  customer_info: any;
  created_at: string;
  updated_at: string;
}

interface FulfillmentItem {
  productId?: string;
  quantity?: number;
  selectedSize?: string;
}

export interface OrderConfirmationResult {
  order: OrderRow;
  confirmedNow: boolean;
}

/**
 * Marks an order as confirmed and updates payment details.
 * Uses an optimistic lock via status check to prevent double-confirm.
 */
export async function confirmOrderWithStockResult(
  supabaseAdmin: SupabaseClient,
  order: OrderRow,
  razorpay_payment_id: string
): Promise<OrderConfirmationResult> {
  if (order.status === 'confirmed') {
    return { order, confirmedNow: false }; // Already confirmed — idempotent
  }
  // Update status directly from pending to confirmed.
  // Using .eq('status', 'pending') acts as an optimistic lock.
  const { data: confirmed, error: confirmError } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'confirmed',
      razorpay_payment_id,
      updated_at: new Date().toISOString(),
    })
    .eq('order_id', order.order_id)
    .eq('status', 'pending')
    .select()
    .single();

  if (confirmError) {
    // If the error is PGRST116 (0 rows returned / single constraint failed),
    // check if it was already updated concurrently.
    if (confirmError.code === 'PGRST116') {
      const { data: updatedOrder } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('order_id', order.order_id)
        .single();
      if (updatedOrder && updatedOrder.status === 'confirmed') {
        return { order: updatedOrder as OrderRow, confirmedNow: false };
      }
    }
    throw new Error(confirmError.message || 'Failed to confirm order');
  }

  if (!confirmed) {
    throw new Error('Failed to confirm order: order not found or already processed');
  }

  // Since order is now successfully confirmed in Supabase,
  // decrement the stock in Sanity
  if (confirmed.items && Array.isArray(confirmed.items)) {
    try {
      const confirmedItems = confirmed.items as FulfillmentItem[];
      const itemsWithProducts = confirmedItems.filter((item) => item.productId && item.quantity);
      const productIds = Array.from(new Set(itemsWithProducts.map((item) => item.productId)));
      const products = await writeClient.fetch<Array<{
        _id: string;
        stock?: number;
        sizeStock?: SizeStockEntry[];
      }>>(
        `*[_id in $productIds] { _id, stock, sizeStock[] { _key, size, quantity } }`,
        { productIds }
      );

      const transaction = writeClient.transaction();
      for (const product of products) {
        const productItems = itemsWithProducts.filter((item) => item.productId === product._id);
        const totalQuantity = productItems.reduce((total, item) => total + Number(item.quantity || 0), 0);

        if (totalQuantity <= 0) continue;

        transaction.patch(product._id, (p) => {
          if (hasSizeStock(product.sizeStock)) {
            const nextSizeStock = (product.sizeStock ?? []).map((entry) => {
              const sizeQuantity = productItems
                .filter((item) => normalizeSize(item.selectedSize) === normalizeSize(entry.size))
                .reduce((total, item) => total + Number(item.quantity || 0), 0);

              if (sizeQuantity <= 0) return entry;

              return {
                ...entry,
                quantity: Math.max(0, Number(entry.quantity || 0) - sizeQuantity),
              };
            });

            return p.set({ sizeStock: nextSizeStock });
          }

          return p.dec({ stock: totalQuantity });
        });
      }
      await transaction.commit();
    } catch (sanityErr: any) {
      console.error('Failed to decrement Sanity stock during order confirmation:', sanityErr?.message || sanityErr);

      // Do not leave a paid order marked as confirmed when inventory could not
      // be decremented. Returning it to pending lets the verified payment flow
      // retry fulfillment instead of silently allowing inventory to drift.
      const { error: rollbackError } = await supabaseAdmin
        .from('orders')
        .update({
          status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', confirmed.order_id)
        .eq('status', 'confirmed');

      if (rollbackError) {
        throw new Error(
          `Stock decrement failed and the order could not be returned to pending: ${rollbackError.message}`
        );
      }

      throw new Error(
        `Stock decrement failed; order was returned to pending for a safe retry: ${sanityErr?.message || String(sanityErr)}`
      );
    }
  }

  return { order: confirmed as OrderRow, confirmedNow: true };
}

export async function confirmOrderWithStock(
  supabaseAdmin: SupabaseClient,
  order: OrderRow,
  razorpay_payment_id: string
): Promise<OrderRow> {
  const result = await confirmOrderWithStockResult(supabaseAdmin, order, razorpay_payment_id);
  return result.order;
}
