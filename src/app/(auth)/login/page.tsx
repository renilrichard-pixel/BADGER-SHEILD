import Link from 'next/link';
import { login } from '../actions';
import { AuthSubmitButton, AuthFormBody } from '@/components/auth-form';
import { PasswordInput } from '@/components/password-input';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; next?: string }> }) {
  const params = await searchParams;

  return (
    <main className="flex justify-center bg-muted/20 px-4 py-8 text-foreground sm:px-8 sm:py-10">
      <section className="w-full max-w-md border border-border bg-background p-6 shadow-sm lg:max-w-2xl sm:p-8">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-black uppercase tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground">Enter your account details to continue.</p>
        </div>

        <form action={login}>
          <AuthFormBody>
            {params?.message && <div className="border border-emerald-200 bg-emerald-50/10 px-4 py-3 text-xs font-semibold text-emerald-600">{params.message}</div>}
            {params?.error && <div className="border border-red-200 bg-red-50/10 px-4 py-3 text-xs font-semibold text-red-600">{params.error}</div>}
            <input type="hidden" name="next" value={params?.next || ''} />

            <label className="block space-y-2" htmlFor="email">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Email address</span>
              <input id="email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required className="h-12 w-full border border-border bg-background px-4 text-sm lowercase text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground" placeholder="you@example.com" />
            </label>

            <label className="block space-y-2" htmlFor="password">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Password</span>
              <PasswordInput id="password" name="password" autoComplete="current-password" required placeholder="Enter password" />
            </label>

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground hover:underline underline-offset-4">Forgot password?</Link>
            </div>
            <AuthSubmitButton defaultText="Sign in" loadingText="Logging in..." />
          </AuthFormBody>
        </form>

        <p className="mt-6 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          New here?{' '}
          <Link href={params?.next ? `/register?next=${encodeURIComponent(params.next)}` : '/register'} className="font-bold text-foreground hover:underline underline-offset-4">Create account</Link>
        </p>
      </section>
    </main>
  );
}
