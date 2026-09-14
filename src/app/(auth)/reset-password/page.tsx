'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, X, ShieldAlert, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/password-input';
import { createClient } from '@/lib/supabase/client';
import { resetPassword } from '../actions';

export default function ResetPasswordPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = props.searchParams ? React.use(props.searchParams) : undefined;
  const serverError = typeof searchParams?.error === 'string' ? searchParams.error : undefined;
  const serverMessage = typeof searchParams?.message === 'string' ? searchParams.message : undefined;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password evaluation (clean, friendly - no heavy arbitrary blocks)
  const isMinLength = password.length >= 6;
  const isMatching = confirmPassword.length > 0 && password === confirmPassword;
  const isMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  // Strength calculation (informative only - does NOT block reset)
  const strengthInfo = useMemo(() => {
    if (!password) return { label: '', percent: 0, color: 'bg-muted' };
    if (password.length < 6) return { label: 'Too short', percent: 20, color: 'bg-red-500' };

    let score = 1;
    if (password.length >= 8) score += 1;
    if (password.length >= 10) score += 1;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;

    switch (score) {
      case 1:
        return { label: 'Fair', percent: 40, color: 'bg-amber-500' };
      case 2:
        return { label: 'Good', percent: 70, color: 'bg-blue-500' };
      case 3:
      case 4:
      default:
        return { label: 'Strong', percent: 100, color: 'bg-emerald-500' };
    }
  }, [password]);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    const verifySession = async () => {
      try {
        const hash = typeof window !== 'undefined' ? window.location.hash : '';
        const hasRecoveryHash = hash.includes('access_token=') || hash.includes('type=recovery');

        const { data: { session } } = await supabase.auth.getSession();

        if (session || hasRecoveryHash) {
          if (mounted) {
            setHasValidSession(true);
            setIsCheckingSession(false);
          }
          return;
        }

        // Give a brief window for browser client to process hash token if present
        setTimeout(async () => {
          if (!mounted) return;
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          setHasValidSession(!!retrySession);
          setIsCheckingSession(false);
        }, 600);
      } catch (err) {
        console.error('Session verification error:', err);
        if (mounted) {
          setHasValidSession(false);
          setIsCheckingSession(false);
        }
      }
    };

    verifySession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || !!session) {
        if (mounted) {
          setHasValidSession(true);
          setIsCheckingSession(false);
        }
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (password.length < 6) {
      event.preventDefault();
      setValidationError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      event.preventDefault();
      setValidationError('Passwords do not match. Please check your confirmation.');
      return;
    }
    setValidationError('');
    setIsSubmitting(true);
  };

  const displayError = validationError || serverError;

  return (
    <main className="flex justify-center bg-muted/20 px-4 py-8 text-foreground sm:px-8 sm:py-10">
      <section className="w-full max-w-md border border-border bg-background p-6 shadow-sm lg:max-w-2xl sm:p-8">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-black uppercase tracking-tight">Set new password</h1>
          <p className="text-sm text-muted-foreground">
            Create a secure password with at least 6 characters.
          </p>
        </div>

        {isCheckingSession ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Verifying recovery session...</p>
          </div>
        ) : !hasValidSession ? (
          <div className="space-y-6">
            <div className="flex items-start gap-3 border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-300">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="space-y-1">
                <p className="font-semibold text-sm text-foreground">
                  Reset link invalid or expired
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  For your security, password reset links expire after a short time or can only be used once. Please request a new link to set your password.
                </p>
              </div>
            </div>

            <Link
              href="/forgot-password"
              className="flex h-12 w-full items-center justify-center rounded-none bg-primary text-[11px] font-black uppercase tracking-[0.24em] text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Request New Reset Link <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        ) : (
          <form className="space-y-5" action={resetPassword} onSubmit={handleSubmit}>
            {serverMessage && (
              <div className="border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {serverMessage}
              </div>
            )}
            {displayError && (
              <div className="flex items-start gap-2 border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-600 dark:text-red-400">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{displayError}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="block space-y-2" htmlFor="password">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                  New password
                </span>
                <PasswordInput
                  id="password"
                  name="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  maxLength={72}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (validationError) setValidationError('');
                  }}
                  placeholder="Enter new password (min. 6 characters)"
                />
              </label>

              {/* Real-time feedback bar */}
              {password.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Password strength:</span>
                    <span className="font-semibold text-foreground">{strengthInfo.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strengthInfo.color}`}
                      style={{ width: `${strengthInfo.percent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block space-y-2" htmlFor="confirmPassword">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                  Confirm new password
                </span>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  maxLength={72}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    if (validationError) setValidationError('');
                  }}
                  placeholder="Confirm new password"
                />
              </label>

              {/* Matching status indicator */}
              {confirmPassword.length > 0 && (
                <div className="flex items-center gap-1.5 pt-0.5 text-xs">
                  {isMatching ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Passwords match
                      </span>
                    </>
                  ) : isMismatch ? (
                    <>
                      <X className="h-3.5 w-3.5 text-red-500" />
                      <span className="text-red-500 font-medium">
                        Passwords do not match
                      </span>
                    </>
                  ) : null}
                </div>
              )}
            </div>

            {/* Live requirements checklist */}
            <div className="border border-border/50 bg-muted/30 p-3 text-[11px] text-muted-foreground space-y-1">
              <div className="flex items-center gap-1.5">
                <Check
                  className={`h-3.5 w-3.5 ${
                    isMinLength ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/40'
                  }`}
                />
                <span className={isMinLength ? 'text-foreground font-medium' : ''}>
                  At least 6 characters
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check
                  className={`h-3.5 w-3.5 ${
                    isMatching ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/40'
                  }`}
                />
                <span className={isMatching ? 'text-foreground font-medium' : ''}>
                  Confirm password matches
                </span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full rounded-none bg-primary text-[11px] font-black uppercase tracking-[0.24em] text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating password...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  Update password <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
        )}

        <p className="mt-6 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          <Link href="/login" className="font-bold text-foreground hover:underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
