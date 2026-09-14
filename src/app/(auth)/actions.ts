'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { getSafeRedirectPath } from '@/lib/safe-redirect'
import { createMailTransporter, escapeHtml } from '@/lib/email'

function normalizeEmail(value: FormDataEntryValue | null) {
  return String(value || '').trim().toLowerCase()
}

function validatePassword(password: unknown, confirmPassword?: unknown): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required.' }
  }
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters.' }
  }
  if (password.length > 72) {
    return { valid: false, error: 'Password is too long (maximum 72 characters).' }
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match.' }
  }
  return { valid: true }
}

function getSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  let siteUrl: URL;
  try {
    siteUrl = new URL(configuredUrl);
  } catch {
    siteUrl = new URL('http://localhost:3000');
  }

  return new URL(siteUrl.origin);
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
    limit: 5,
    windowSeconds: 3600,
  })
  if (!rateLimit.allowed) {
    redirect(`/register?error=${encodeURIComponent('Too many registration attempts. Please try again later.')}`)
  }

  const supabase = await createClient()
  const next = getSafeRedirectPath(formData.get('next'))
  const fullName = String(formData.get('fullName') || '').trim()
  const email = normalizeEmail(formData.get('email'))
  const password = String(formData.get('password') || '')
  const confirmPassword = String(formData.get('confirmPassword') || '')

  if (!fullName || fullName.length < 2) {
    redirect(`/register?error=${encodeURIComponent('Please enter your full name (at least 2 characters).')}&next=${encodeURIComponent(next)}`)
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || !emailRegex.test(email)) {
    redirect(`/register?error=${encodeURIComponent('Please enter a valid email address.')}&next=${encodeURIComponent(next)}`)
  }

  const passwordCheck = validatePassword(password, confirmPassword)
  if (!passwordCheck.valid) {
    redirect(`/register?error=${encodeURIComponent(passwordCheck.error || 'Invalid password.')}&next=${encodeURIComponent(next)}`)
  }

  const adminClient = createAdminClient()
  let authUserId: string | null = null

  if (adminClient) {
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        display_name: fullName,
      },
    })

    if (createError) {
      const msg = createError.message?.toLowerCase() || ''
      if (msg.includes('already') || msg.includes('exists') || msg.includes('registered')) {
        redirect(`/register?error=${encodeURIComponent('An account with this email already exists. Please sign in instead.')}&next=${encodeURIComponent(next)}`)
      }
      redirect(`/register?error=${encodeURIComponent(createError.message || 'Could not create user.')}&next=${encodeURIComponent(next)}`)
    }

    authUserId = createData.user?.id || null
  } else {
    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          display_name: fullName,
        },
      },
    })

    if (error) {
      redirect(`/register?error=${encodeURIComponent(error.message || 'Could not create user.')}&next=${encodeURIComponent(next)}`)
    }

    authUserId = authData.user?.id || null
  }

  if (authUserId) {
    try {
      const admin = createAdminClient()
      const db = admin || supabase
      await db.from('profiles').upsert({
        id: authUserId,
        display_name: fullName,
        full_name: fullName,
        email: email,
        updated_at: new Date().toISOString(),
      })
    } catch (profileErr) {
      console.error('Non-blocking profile upsert notice during registration:', profileErr)
    }
  }

  // Automatically sign in the user session
  const { data: sessionData } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (sessionData?.session) {
    revalidatePath('/', 'layout')
    redirect(next || '/')
  }

  redirect(`/login?message=${encodeURIComponent('Registration successful! Please sign in with your email and password.')}&next=${encodeURIComponent(next)}`)
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
    limit: 5,
    windowSeconds: 3600,
  })
  if (!rateLimit.allowed) {
    redirect(`/forgot-password?error=${encodeURIComponent('Too many password-reset attempts. Please try again later.')}`)
  }

  const supabase = await createClient()
  const email = normalizeEmail(formData.get('email'))

  if (!email) {
    redirect(`/forgot-password?error=${encodeURIComponent('Email is required.')}`)
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    redirect(`/forgot-password?error=${encodeURIComponent('Please enter a valid email address.')}`)
  }

  const resetRedirectUrl = new URL('/api/auth/callback', getSiteUrl())
  resetRedirectUrl.searchParams.set('next', '/reset-password')

  const adminClient = createAdminClient()

  if (adminClient) {
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: resetRedirectUrl.toString(),
      },
    })

    if (linkError) {
      const msg = linkError.message?.toLowerCase() || ''
      if (msg.includes('not found') || msg.includes('user')) {
        redirect(`/forgot-password?error=${encodeURIComponent('No account found with this email address. Please check your spelling or sign up.')}`)
      }
      redirect(`/forgot-password?error=${encodeURIComponent(linkError.message || 'Could not generate reset link.')}`)
    }

    const actionLink = linkData?.properties?.action_link
    if (actionLink) {
      try {
        const transporter = createMailTransporter()
        const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'badgersheild@gmail.com'

        await transporter.sendMail({
          from: `"BADGER SHEILD" <${fromEmail}>`,
          to: email,
          subject: 'Reset Your Password - BADGER SHEILD',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0c0c0c; color: #f0f0f0; margin: 0; padding: 40px 20px; }
                .container { max-width: 520px; margin: 0 auto; background-color: #141414; border: 1px solid #262626; padding: 40px; }
                .logo { font-size: 20px; font-weight: 900; letter-spacing: 0.15em; text-transform: uppercase; color: #ffffff; margin-bottom: 24px; }
                h1 { font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.02em; margin-bottom: 16px; color: #ffffff; }
                p { font-size: 14px; line-height: 1.6; color: #a3a3a3; margin-bottom: 24px; }
                .button { display: inline-block; background-color: #ffffff; color: #000000; text-decoration: none; font-weight: 800; font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; padding: 14px 28px; }
                .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #262626; font-size: 12px; color: #737373; line-height: 1.5; }
                .link-alt { word-break: break-all; color: #737373; font-size: 11px; margin-top: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="logo">BADGER SHEILD</div>
                <h1>Reset Your Password</h1>
                <p>We received a request to reset the password for your account (<strong>${escapeHtml(email)}</strong>). Click the button below to choose a new password:</p>
                <div style="margin: 32px 0;">
                  <a href="${actionLink}" class="button" target="_blank">Reset Password</a>
                </div>
                <p>If you did not request this, you can safely ignore this email. Your password will remain unchanged.</p>
                <div class="footer">
                  This reset link will expire in 24 hours.<br>
                  If the button above doesn't work, copy and paste this link into your browser:
                  <div class="link-alt">${actionLink}</div>
                </div>
              </div>
            </body>
            </html>
          `,
          text: `Reset Your BADGER SHEILD Password\n\nClick the link below to choose a new password:\n${actionLink}\n\nIf you did not request this, please ignore this email.`
        })

        redirect(`/forgot-password?message=${encodeURIComponent('We have sent password reset instructions to your email! Please check your inbox.')}`)
      } catch (mailErr: unknown) {
        console.error('Failed to send reset email via SMTP:', mailErr)
      }
    }
  }

  // Fallback to standard Supabase email if admin link generation or SMTP failed
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: resetRedirectUrl.toString(),
  })

  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message || 'Could not send reset link.')}`)
  }

  redirect(`/forgot-password?message=${encodeURIComponent('We have sent password reset instructions to your email. Please check your inbox and spam folder.')}`)
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
  const password = String(formData.get('password') || '')
  const confirmPassword = formData.get('confirmPassword') ? String(formData.get('confirmPassword')) : undefined

  const passwordCheck = validatePassword(password, confirmPassword)
  if (!passwordCheck.valid) {
    redirect(`/reset-password?error=${encodeURIComponent(passwordCheck.error || 'Invalid password.')}`)
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    const isSessionIssue =
      error.message?.toLowerCase().includes('session') ||
      error.message?.toLowerCase().includes('not logged in') ||
      error.message?.toLowerCase().includes('jwt');

    if (isSessionIssue) {
      redirect(`/forgot-password?error=${encodeURIComponent('Your password reset session has expired or is invalid. Please request a new link.')}`)
    }

    redirect(`/reset-password?error=${encodeURIComponent(error.message || 'Could not update password.')}`)
  }

  await supabase.auth.signOut()
  redirect(`/login?message=${encodeURIComponent('Password updated successfully! Please log in with your new password.')}`)
}

