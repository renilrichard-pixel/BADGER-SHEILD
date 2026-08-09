'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { getSafeRedirectPath } from '@/lib/safe-redirect'

function normalizeEmail(value: FormDataEntryValue | null) {
  return String(value || '').trim().toLowerCase()
}

function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL

  if (!configuredUrl) {
    throw new Error('NEXT_PUBLIC_SITE_URL must be configured')
  }

  let siteUrl: URL
  try {
    siteUrl = new URL(configuredUrl)
  } catch {
    throw new Error('NEXT_PUBLIC_SITE_URL must be a valid absolute URL')
  }

  if (
    !['http:', 'https:'].includes(siteUrl.protocol) ||
    siteUrl.username ||
    siteUrl.password ||
    siteUrl.pathname !== '/' ||
    siteUrl.search ||
    siteUrl.hash
  ) {
    throw new Error('NEXT_PUBLIC_SITE_URL must be an HTTP(S) origin without a path, query, or fragment')
  }

  return siteUrl
}

export async function login(formData: FormData) {
  const requestHeaders = await headers()
  const rateLimit = await checkRateLimit({
    scope: 'auth:login',
    identifier: getClientIp(requestHeaders),
    limit: 5,
    windowSeconds: 60,
  })
  if (!rateLimit.allowed) {
    redirect(`/login?error=${encodeURIComponent('Too many login attempts. Please try again shortly.')}`)
  }

  const supabase = await createClient()
  const next = getSafeRedirectPath(formData.get('next'))

  const data = {
    email: normalizeEmail(formData.get('email')),
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message || 'Could not authenticate user')}&next=${encodeURIComponent(next)}`)
  }

  revalidatePath('/', 'layout')
  redirect(next)
}

export async function signup(formData: FormData) {
  const requestHeaders = await headers()
  const rateLimit = await checkRateLimit({
    scope: 'auth:signup',
    identifier: getClientIp(requestHeaders),
    limit: 3,
    windowSeconds: 3600,
  })
  if (!rateLimit.allowed) {
    redirect(`/register?error=${encodeURIComponent('Too many registration attempts. Please try again later.')}`)
  }

  const supabase = await createClient()
  const next = getSafeRedirectPath(formData.get('next'))
  const fullName = String(formData.get('fullName') || '').trim()

  const data = {
    email: normalizeEmail(formData.get('email')),
    password: formData.get('password') as string,
  }

  const { data: authData, error } = await supabase.auth.signUp(data)

  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message || 'Could not create user')}&next=${encodeURIComponent(next)}`)
  }

  if (authData?.user) {
    await supabase.from('users').insert({
      id: authData.user.id,
      display_name: fullName,
      email: data.email,
    });
    
    await supabase.from('profiles').insert({
      id: authData.user.id,
      display_name: fullName,
      full_name: fullName,
      email: data.email,
    });
  }

  redirect(`/login?message=${encodeURIComponent('Registration successful! Please check your email to confirm your account before logging in.')}&next=${encodeURIComponent(next)}`)
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function forgotPassword(formData: FormData) {
  const requestHeaders = await headers()
  const rateLimit = await checkRateLimit({
    scope: 'auth:password-reset',
    identifier: getClientIp(requestHeaders),
    limit: 3,
    windowSeconds: 3600,
  })
  if (!rateLimit.allowed) {
    redirect(`/forgot-password?error=${encodeURIComponent('Too many password-reset attempts. Please try again later.')}`)
  }

  const supabase = await createClient()
  const email = normalizeEmail(formData.get('email'))

  if (!email) {
    redirect(`/forgot-password?error=${encodeURIComponent('Email is required')}`)
  }

  const resetRedirectUrl = new URL('/api/auth/callback', getSiteUrl())
  resetRedirectUrl.searchParams.set('next', '/reset-password')

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: resetRedirectUrl.toString(),
  })

  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message || 'Could not send reset link')}`)
  }

  redirect(`/forgot-password?message=${encodeURIComponent('Check your email for password recovery instructions.')}`)
}

export async function resetPassword(formData: FormData) {
  const requestHeaders = await headers()
  const rateLimit = await checkRateLimit({
    scope: 'auth:password-update',
    identifier: getClientIp(requestHeaders),
    limit: 5,
    windowSeconds: 3600,
  })
  if (!rateLimit.allowed) {
    redirect(`/reset-password?error=${encodeURIComponent('Too many password-update attempts. Please try again later.')}`)
  }

  const supabase = await createClient()
  const password = formData.get('password') as string

  if (!password) {
    redirect(`/reset-password?error=${encodeURIComponent('Password is required')}`)
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message || 'Could not update password')}`)
  }

  await supabase.auth.signOut()
  redirect(`/login?message=${encodeURIComponent('Password updated successfully. Please log in.')}`)
}
