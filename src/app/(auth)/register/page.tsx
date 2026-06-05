import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { signup } from '../actions';

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tighter uppercase">Create Account</h1>
          <p className="mt-2 text-sm text-muted-foreground uppercase tracking-widest">
            Join the Badger Shield Club
          </p>
        </div>

        <form className="mt-8 space-y-6" action={signup}>
          {params?.error && (
            <div className="bg-destructive/10 text-destructive p-3 text-sm text-center border border-destructive/20 font-medium">
              {params.error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="sr-only" htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                className="w-full bg-transparent border-b border-border px-0 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors uppercase tracking-wider text-sm"
                placeholder="FULL NAME"
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full bg-transparent border-b border-border px-0 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors uppercase tracking-wider text-sm"
                placeholder="EMAIL ADDRESS"
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="w-full bg-transparent border-b border-border px-0 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors uppercase tracking-wider text-sm"
                placeholder="PASSWORD"
              />
            </div>
          </div>

          <div>
            <Button type="submit" size="lg" className="w-full rounded-none uppercase tracking-widest h-12">
              Register
            </Button>
          </div>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            ALREADY HAVE AN ACCOUNT?{' '}
            <Link href="/login" className="font-medium text-foreground hover:underline underline-offset-4 uppercase tracking-widest">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
