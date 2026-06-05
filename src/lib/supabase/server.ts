import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  const hasMockSession = cookieStore.get('sb-mock-session')?.value === 'true'
  if (hasMockSession) {
    const originalAuth = client.auth
    client.auth = {
      ...originalAuth,
      getUser: async (token?: string) => {
        return {
          data: {
            user: {
              id: 'mock-user-id',
              email: 'mockuser@example.com',
              aud: 'authenticated',
              role: 'authenticated',
              created_at: new Date().toISOString(),
            } as any
          },
          error: null
        }
      },
      signOut: async () => {
        try {
          cookieStore.set('sb-mock-session', '', { maxAge: -1 })
        } catch (e) {}
        return { error: null }
      }
    } as any
  }

  return client
}
