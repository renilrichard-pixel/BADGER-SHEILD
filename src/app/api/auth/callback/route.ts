import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSafeRedirectPath } from '@/lib/safe-redirect'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = getSafeRedirectPath(searchParams.get('next'))
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const isPasswordResetFlow = next.startsWith('/reset-password')
  const fallbackErrorUrl = isPasswordResetFlow ? `${origin}/forgot-password` : `${origin}/login`

  if (error || errorDescription) {
    const errorMsg = errorDescription || error || 'Authentication link is invalid or has expired.'
    return NextResponse.redirect(`${fallbackErrorUrl}?error=${encodeURIComponent(errorMsg)}`)
  }

  if (code) {
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (!exchangeError) {
      return NextResponse.redirect(new URL(next, origin))
    }

    return NextResponse.redirect(
      `${fallbackErrorUrl}?error=${encodeURIComponent(
        exchangeError.message || 'Authentication link is invalid or has expired. Please try again.'
      )}`
    )
  }

  return NextResponse.redirect(
    `${fallbackErrorUrl}?error=${encodeURIComponent('Invalid session link. Please request a new link.')}`
  )
}

