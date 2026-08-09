import Link from 'next/link';
import { forgotPassword } from '../actions';
import { AuthSubmitButton, AuthFormBody } from '@/components/auth-form';

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;

  return (
    <main className="flex justify-center bg-muted/20 px-4 py-8 text-foreground sm:px-8 sm:py-10">
      <section className="w-full max-w-md border border-border bg-background p-6 shadow-sm lg:max-w-2xl sm:p-8">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-black uppercase tracking-tight">Reset password</h1>
          <p className="text-sm text-muted-foreground">Enter your email and we’ll send a password reset link.</p>
        </div>

        <form action={forgotPassword}>
          <AuthFormBody>
            {params?.message && <div className="border border-emerald-200 bg-emerald-50/10 px-4 py-3 text-xs font-semibold text-emerald-600">{params.message}</div>}
            {params?.error && <div className="border border-red-200 bg-red-50/10 px-4 py-3 text-xs font-semibold text-red-600">{params.error}</div>}

            <label className="block space-y-2" htmlFor="email">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Email address</span>
              <input id="email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required className="h-12 w-full border border-border bg-background px-4 text-sm lowercase text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground" placeholder="you@example.com" />
            </label>
            <AuthSubmitButton defaultText="Send reset link" loadingText="Sending reset link..." />
          </AuthFormBody>
        </form>

        <p className="mt-6 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          Remembered your password?{' '}
          <Link href="/login" className="font-bold text-foreground hover:underline underline-offset-4">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
