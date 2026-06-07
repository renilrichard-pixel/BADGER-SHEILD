import { createClient } from '@/lib/supabase/client';

/**
 * Checks if the user is authenticated.
 * If not, redirects to /login?next=<current path> and returns false.
 * If yes, returns true.
 */
export async function requireAuth(redirectTo?: string): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return true;

  const next = redirectTo ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  window.location.href = `/login?next=${encodeURIComponent(next)}`;
  return false;
}
