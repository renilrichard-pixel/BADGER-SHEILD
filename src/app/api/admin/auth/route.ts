import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminPassword,
  createAdminToken,
  ADMIN_COOKIE_NAME,
  checkAdminRequestAuth,
} from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authenticated = checkAdminRequestAuth(request);
  return NextResponse.json({ authenticated });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    const expectedPassword = getAdminPassword();

    if (!password || password.trim() !== expectedPassword.trim()) {
      return NextResponse.json(
        { success: false, error: 'Incorrect admin password.' },
        { status: 401 }
      );
    }

    const token = createAdminToken();
    const response = NextResponse.json({ success: true, message: 'Logged in successfully.' });

    // Set HttpOnly cookie for 7 days
    response.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Authentication error.' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
  response.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
