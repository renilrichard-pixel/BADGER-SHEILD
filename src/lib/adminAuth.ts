import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const ADMIN_COOKIE_NAME = 'bs_admin_session';

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || 'badger2026admin';
}

function getSigningSecret(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.RAZORPAY_KEY_SECRET || 'badger-sheild-admin-key-2026';
}

export function createAdminToken(): string {
  const secret = getSigningSecret();
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`admin|${timestamp}`)
    .digest('hex');
  return `${timestamp}.${signature}`;
}

export function verifyAdminToken(token?: string | null): boolean {
  try {
    if (!token || typeof token !== 'string' || !token.includes('.')) return false;

    const [timestamp, signature] = token.split('.');
    if (!timestamp || !signature) return false;
    const time = parseInt(timestamp, 10);
    if (isNaN(time)) return false;

    // Session valid for 7 days
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - time > maxAge) return false;

    const secret = getSigningSecret();
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`admin|${timestamp}`)
      .digest('hex');

    const bufSig = Buffer.from(signature);
    const bufExp = Buffer.from(expected);
    if (bufSig.length !== bufExp.length) return false;

    return crypto.timingSafeEqual(bufSig, bufExp);
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminToken(token);
}

export function checkAdminRequestAuth(request: NextRequest): boolean {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminToken(token);
}

export { ADMIN_COOKIE_NAME };
