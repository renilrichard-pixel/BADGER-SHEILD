'use server';

import { revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/**
 * PRODUCTION ARCHITECTURE NOTE:
 * Cache invalidation occurs here in the mutation layer (on the server) instead of RatingsProvider.
 * This guarantees that cache tags are only revalidated after successful database writes/deletes.
 * If a database operation fails, the cache remains intact, preventing unnecessary cache churn.
 */

export async function submitReviewAction(productId: string, rating: number, experience?: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    const newReview = {
      user_id: user.id,
      product_id: productId,
      rating,
      experience: experience?.trim() || null,
      reviewer_email: user.email || null,
    };

    let { error: upsertError } = await supabase
      .from('reviews')
      .upsert(newReview, { onConflict: 'user_id,product_id' });

    // Handle legacy schema constraints or PGRST204 errors
    if (
      upsertError &&
      (upsertError.message?.includes("reviewer_email") || upsertError.code === "PGRST204")
    ) {
      const reviewWithoutEmail: Record<string, any> = { ...newReview };
      delete reviewWithoutEmail.reviewer_email;
      const retry = await supabase
        .from('reviews')
        .upsert(reviewWithoutEmail, { onConflict: 'user_id,product_id' });
      upsertError = retry.error;
    }

    if (upsertError) {
      return { error: upsertError.message || 'Failed to save review in database' };
    }

    // Trigger immediate server cache tag revalidation
    try {
      revalidateTag('reviews:list', 'max');
      revalidateTag(`reviews:product:${productId}`, 'max');
    } catch (revalError) {
      // Graceful Invalidation Failure: log as warning and proceed returning success
      console.warn('[REVALIDATION WARNING]', {
        event: 'revalidate_failed',
        productId,
        userId: user.id,
        timestamp: new Date().toISOString(),
        error: String(revalError)
      });
    }

    // Structured server-side logging without PII or sensitive comment bodies
    console.log('[REVIEW SUCCESS]', {
      event: 'review_submitted',
      productId,
      userId: user.id,
      timestamp: new Date().toISOString()
    });

    // Retrieve the newly upserted row to update client-side context state
    const { data: reviewData, error: fetchError } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .single();

    if (fetchError || !reviewData) {
      return { error: fetchError?.message || 'Failed to retrieve saved review' };
    }

    return { success: true, data: reviewData };
  } catch (err: any) {
    console.error('[REVIEW SUBMIT EXCEPTION]', err);
    return { error: err.message || 'Internal server error during review submission' };
  }
}

export async function deleteReviewAction(productId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);

    if (error) {
      return { error: error.message || 'Failed to delete review from database' };
    }

    // Trigger immediate server cache tag revalidation
    try {
      revalidateTag('reviews:list', 'max');
      revalidateTag(`reviews:product:${productId}`, 'max');
    } catch (revalError) {
      // Graceful Invalidation Failure: log as warning and proceed returning success
      console.warn('[REVALIDATION WARNING]', {
        event: 'revalidate_failed_on_delete',
        productId,
        userId: user.id,
        timestamp: new Date().toISOString(),
        error: String(revalError)
      });
    }

    // Structured server-side logging
    console.log('[REVIEW SUCCESS]', {
      event: 'review_deleted',
      productId,
      userId: user.id,
      timestamp: new Date().toISOString()
    });

    return { success: true };
  } catch (err: any) {
    console.error('[REVIEW DELETE EXCEPTION]', err);
    return { error: err.message || 'Internal server error during review deletion' };
  }
}
