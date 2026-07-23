import { createClient } from '@/lib/supabase/server';

export interface AdminAuthResult {
  user?: any;
  error?: string;
  status?: number;
}

/**
 * PRODUCTION SECURITY HELPER:
 * Authenticates the user session and validates that they have administrator privileges
 * based on the server-configured ADMIN_EMAIL environment variable.
 */
export async function verifyAdminSession(): Promise<AdminAuthResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail || !user.email || user.email.toLowerCase() !== adminEmail.toLowerCase()) {
      return { error: 'Forbidden', status: 403, user };
    }

    return { user };
  } catch (err: any) {
    return { error: err.message || 'Internal Server Error', status: 500 };
  }
}
