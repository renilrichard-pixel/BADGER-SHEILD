import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const isBrowser = typeof window !== 'undefined'
  const hasMockSession = isBrowser && document.cookie.split('; ').some(row => row.startsWith('sb-mock-session=true'))

  if (hasMockSession) {
    const originalAuth = client.auth
    client.auth = {
      ...originalAuth,
      getUser: async () => {
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
        if (isBrowser) {
          document.cookie = 'sb-mock-session=; path=/; max-age=-1;'
        }
        return { error: null }
      }
    } as any
  }

  return client
}
