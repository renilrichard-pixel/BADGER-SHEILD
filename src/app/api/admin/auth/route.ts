import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
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
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: 'Supabase configuration missing.' },
        { status: 500 }
      );
    }

    const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: String(password),
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { success: false, error: authError?.message || 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const user = authData.user;

    // Check admin authorization:
    // 1. User email matches ADMIN_EMAIL
    // 2. User has role: 'admin' or is_admin: true in Supabase metadata
    // 3. Or if no ADMIN_EMAIL is configured in env, allow any verified Supabase user
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const isConfiguredEmail = adminEmail && cleanEmail === adminEmail;
    const hasAdminRole =
      user.user_metadata?.role === 'admin' ||
      user.app_metadata?.role === 'admin' ||
      user.user_metadata?.is_admin === true ||
      user.app_metadata?.is_admin === true;

    const isAuthorized = isConfiguredEmail || hasAdminRole || !adminEmail;

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied. This Supabase user is not authorized as an admin.',
        },
        { status: 403 }
      );
    }

    const token = createAdminToken(cleanEmail);
    const response = NextResponse.json({
      success: true,
      message: 'Logged in successfully.',
      user: { email: cleanEmail },
    });

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
