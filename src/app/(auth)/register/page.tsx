import Link from 'next/link';
import { signup } from '../actions';
import { AuthSubmitButton, AuthFormBody } from '@/components/auth-form';
import { PasswordInput } from '@/components/password-input';

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const params = await searchParams;

  return (
    <main className="flex justify-center bg-muted/20 px-4 py-8 text-foreground sm:px-8 sm:py-10">
      <section className="w-full max-w-md border border-border bg-background p-6 shadow-sm lg:max-w-2xl sm:p-8">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-black uppercase tracking-tight">Create account</h1>
          <p className="text-sm text-muted-foreground">Fill in the details below to get started.</p>
        </div>

        <form action={signup}>
          <AuthFormBody>
            {params?.error && <div className="border border-red-200 bg-red-50/10 px-4 py-3 text-xs font-semibold text-red-600">{params.error}</div>}
            <input type="hidden" name="next" value={params?.next || ''} />

            <label className="block space-y-2" htmlFor="fullName">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Full name</span>
              <input id="fullName" name="fullName" type="text" autoComplete="name" required className="h-12 w-full border border-border bg-background px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground" placeholder="Your name" />
            </label>

            <label className="block space-y-2" htmlFor="email">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Email address</span>
              <input id="email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required className="h-12 w-full border border-border bg-background px-4 text-sm lowercase text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground" placeholder="you@example.com" />
            </label>

            <label className="block space-y-2" htmlFor="password">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Password</span>
              <PasswordInput id="password" name="password" autoComplete="new-password" minLength={6} required placeholder="Create password" />
            </label>
            <AuthSubmitButton defaultText="Create account" loadingText="Creating account..." />
          </AuthFormBody>
        </form>

        <p className="mt-6 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link href={params?.next ? `/login?next=${encodeURIComponent(params.next)}` : '/login'} className="font-bold text-foreground hover:underline underline-offset-4">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
