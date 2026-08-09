import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export interface RateLimitOptions {
  scope: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function getClientIp(headers: Pick<Headers, 'get'>): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || headers.get('x-real-ip')
    || 'unknown';
}

export async function checkRateLimit({
  scope,
  identifier,
  limit,
  windowSeconds,
}: RateLimitOptions): Promise<RateLimitResult> {
  const bucketKey = crypto
    .createHash('sha256')
    .update(`${scope}:${identifier}`)
    .digest('hex');

  const { data, error } = await (getSupabaseAdmin() as any)
    .rpc('check_rate_limit', {
      p_bucket_key: bucketKey,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Rate limiter unavailable.');
  }

  return {
    allowed: Boolean(data.allowed),
    retryAfterSeconds: Number(data.retry_after_seconds) || windowSeconds,
  };
}
