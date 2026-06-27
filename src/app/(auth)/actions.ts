'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

function normalizeEmail(value: FormDataEntryValue | null) {
  return String(value || '').trim().toLowerCase()
}

export async function login(formData: FormData) {
  const supabase = await createClient()
  const next = formData.get('next') as string || '/'

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
  const supabase = await createClient()
  const next = formData.get('next') as string || '/'
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
  const supabase = await createClient()
  const email = normalizeEmail(formData.get('email'))

  if (!email) {
    redirect(`/forgot-password?error=${encodeURIComponent('Email is required')}`)
  }

  const host = (await headers()).get('host')
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const origin = `${protocol}://${host}`

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/api/auth/callback?next=/reset-password`,
  })

  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message || 'Could not send reset link')}`)
  }

  redirect(`/forgot-password?message=${encodeURIComponent('Check your email for password recovery instructions.')}`)
}

export async function resetPassword(formData: FormData) {
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
