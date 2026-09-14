import * as React from 'react';
import Link from 'next/link';
import { forgotPassword } from '../actions';
import { AuthSubmitButton, AuthFormBody } from '@/components/auth-form';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

export default async function ForgotPasswordPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const message = typeof searchParams?.message === 'string' ? searchParams.message : undefined;
  const error = typeof searchParams?.error === 'string' ? searchParams.error : undefined;

  return (
    <main className="flex justify-center bg-muted/20 px-4 py-8 text-foreground sm:px-8 sm:py-10">
      <section className="w-full max-w-md border border-border bg-background p-6 shadow-sm lg:max-w-2xl sm:p-8">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-black uppercase tracking-tight">Reset password</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we’ll send a password recovery link.
          </p>
        </div>

        <form action={forgotPassword}>
          <AuthFormBody>
            {message && (
              <div className="flex items-start gap-2 border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{message}</span>
              </div>
            )}
            {error && (
              <div className="flex items-start gap-2 border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-600 dark:text-red-400">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <label className="block space-y-2" htmlFor="email">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                Email address
              </span>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                className="h-12 w-full border border-border bg-background px-4 text-sm lowercase text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground"
                placeholder="you@example.com"
              />
            </label>
            <AuthSubmitButton defaultText="Send reset link" loadingText="Sending reset link..." />
          </AuthFormBody>
        </form>

        <p className="mt-6 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          Remembered your password?{' '}
          <Link
            href="/login"
            className="font-bold text-foreground hover:underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
