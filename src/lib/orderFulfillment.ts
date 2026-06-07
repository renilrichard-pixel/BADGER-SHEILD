import { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from 'next-sanity';
import { apiVersion, dataset, projectId } from '@/sanity/env';

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

/**
 * Marks an order as confirmed and updates payment details.
 * Uses an optimistic lock via status check to prevent double-confirm.
 */
export async function confirmOrderWithStock(
  supabaseAdmin: SupabaseClient,
  order: OrderRow,
  razorpay_payment_id: string
): Promise<OrderRow> {
  if (order.status === 'confirmed') {
    return order; // Already confirmed — idempotent
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
        return updatedOrder as OrderRow;
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
      const transaction = writeClient.transaction();
      for (const item of confirmed.items) {
        if (item.productId && item.quantity) {
          transaction.patch(item.productId, (p) => p.dec({ stock: item.quantity }));
        }
      }
      await transaction.commit();
    } catch (sanityErr: any) {
      console.error('Failed to decrement Sanity stock during order confirmation:', sanityErr?.message || sanityErr);
    }
  }

  return confirmed as OrderRow;
}
