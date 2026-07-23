import { unstable_cache } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export interface ProductReviewAggregate {
  averageRating: number;
  reviewCount: number;
}

export type ReviewSummaryMap = Record<string, ProductReviewAggregate>;

/**
 * Fetch and cache aggregated reviews for all products (bulk).
 * Cache tag 'reviews:list' allows mutating actions to invalidate the cache instantly.
 */
export const getCachedReviewAggregates = unstable_cache(
  async (): Promise<ReviewSummaryMap> => {
    const supabaseAdmin = getSupabaseAdmin();
    const map: ReviewSummaryMap = {};

    try {
      // 1. Database-Level: Query AVG(rating) and COUNT(*) grouped by product_id from reviews_summary view
      const { data, error } = await supabaseAdmin
        .from('reviews_summary')
        .select('product_id, average_rating, review_count');

      if (!error && data) {
        data.forEach((row: any) => {
          map[row.product_id] = {
            averageRating: Number(row.average_rating) || 0,
            reviewCount: Number(row.review_count) || 0,
          };
        });
        return map;
      }

      // Log database view miss and proceed to fallback
      console.warn('[REVIEWS AGGREGATION FALLBACK]', error?.message || 'Database view not found. Running in-memory fallback.');
    } catch (err) {
      console.error('[REVIEWS AGGREGATION VIEW EXCEPTION]', err);
    }

    // 2. Fallback: If view is missing, fetch only necessary fields (product_id, rating) and group in JavaScript
    try {
      const { data, error } = await supabaseAdmin
        .from('reviews')
        .select('product_id, rating');

      if (error) {
        console.error('Fallback query to reviews table failed:', error.message);
        return map;
      }

      if (data) {
        const totals: Record<string, { sum: number; count: number }> = {};
        data.forEach((row: any) => {
          const pid = row.product_id;
          const rating = Number(row.rating) || 0;
          if (!totals[pid]) {
            totals[pid] = { sum: 0, count: 0 };
          }
          totals[pid].sum += rating;
          totals[pid].count += 1;
        });

        for (const pid in totals) {
          const t = totals[pid];
          map[pid] = {
            averageRating: t.count > 0 ? t.sum / t.count : 0,
            reviewCount: t.count,
          };
        }
      }
    } catch (fallbackErr) {
      console.error('Fallback in-memory aggregation failed:', fallbackErr);
    }

    return map;
  },
  ['reviews-list-aggregates'],
  {
    revalidate: 300, // Fallback TTL of 5 minutes
    tags: ['reviews:list'],
  }
);

/**
 * Fetch and cache aggregated reviews for a specific product ID (PDP).
 * Cache tag 'reviews:product:{productId}' allows targeted invalidation.
 */
export const getCachedProductReviewAggregate = (productId: string) => unstable_cache(
  async (pid: string): Promise<ProductReviewAggregate> => {
    const supabaseAdmin = getSupabaseAdmin();
    const defaultVal = { averageRating: 0, reviewCount: 0 };

    try {
      // 1. Database-Level: Fetch single aggregated row from reviews_summary
      const { data, error } = await (supabaseAdmin
        .from('reviews_summary')
        .select('average_rating, review_count')
        .eq('product_id', pid)
        .maybeSingle() as any);

      if (!error && data) {
        return {
          averageRating: Number(data.average_rating) || 0,
          reviewCount: Number(data.review_count) || 0,
        };
      }
    } catch (err) {
      console.error('[PRODUCT REVIEWS AGGREGATION VIEW EXCEPTION]', err);
    }

    // 2. Fallback: Fetch reviews only for this product and calculate rating metrics
    try {
      const { data, error } = await supabaseAdmin
        .from('reviews')
        .select('rating')
        .eq('product_id', pid);

      if (error) {
        console.error('Fallback query to reviews table failed:', error.message);
        return defaultVal;
      }

      if (data && data.length > 0) {
        const sum = data.reduce((acc, row: any) => acc + (Number(row.rating) || 0), 0);
        return {
          averageRating: sum / data.length,
          reviewCount: data.length,
        };
      }
    } catch (fallbackErr) {
      console.error('Fallback single product in-memory aggregation failed:', fallbackErr);
    }

    return defaultVal;
  },
  [`reviews-product-${productId}`],
  {
    revalidate: 300, // Fallback TTL of 5 minutes
    tags: [`reviews:product:${productId}`],
  }
)(productId);
