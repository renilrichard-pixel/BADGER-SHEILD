import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const ADMIN_COOKIE_NAME = 'bs_admin_session';

function getSigningSecret(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.RAZORPAY_KEY_SECRET || 'badger-sheild-admin-key-2026';
}

export function createAdminToken(email?: string): string {
  const secret = getSigningSecret();
  const timestamp = Date.now().toString();
  const cleanEmail = (email || 'admin').trim().toLowerCase();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`admin|${cleanEmail}|${timestamp}`)
    .digest('hex');
  return `${timestamp}.${signature}.${Buffer.from(cleanEmail).toString('base64')}`;
}

export function verifyAdminToken(token?: string | null): boolean {
  try {
    if (!token || typeof token !== 'string' || !token.includes('.')) return false;

    const parts = token.split('.');
    if (parts.length < 2) return false;
    const [timestamp, signature, encodedEmail] = parts;
    if (!timestamp || !signature) return false;
    const time = parseInt(timestamp, 10);
    if (isNaN(time)) return false;

    // Session valid for 7 days
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - time > maxAge) return false;

    const secret = getSigningSecret();
    const email = encodedEmail ? Buffer.from(encodedEmail, 'base64').toString() : 'admin';

    const expectedNew = crypto
      .createHmac('sha256', secret)
      .update(`admin|${email}|${timestamp}`)
      .digest('hex');
    const expectedOld = crypto
      .createHmac('sha256', secret)
      .update(`admin|${timestamp}`)
      .digest('hex');

    const bufSig = Buffer.from(signature);
    const bufExpNew = Buffer.from(expectedNew);
    const bufExpOld = Buffer.from(expectedOld);

    if (bufSig.length === bufExpNew.length && crypto.timingSafeEqual(bufSig, bufExpNew)) {
      return true;
    }
    if (bufSig.length === bufExpOld.length && crypto.timingSafeEqual(bufSig, bufExpOld)) {
      return true;
    }

    return false;
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
