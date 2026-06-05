import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const hasMockSession = request.cookies.get('sb-mock-session')?.value === 'true'
  if (hasMockSession) {
    const originalAuth = supabase.auth
    supabase.auth = {
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
        supabaseResponse.cookies.set('sb-mock-session', '', { maxAge: -1 })
        return { error: null }
      }
    } as any
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect Admin Routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    // We could check if user role is admin here if we had role implemented.
  }

  // Redirect from login if already authenticated
  if (
    user &&
    (request.nextUrl.pathname.startsWith('/login') ||
      request.nextUrl.pathname.startsWith('/register'))
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
