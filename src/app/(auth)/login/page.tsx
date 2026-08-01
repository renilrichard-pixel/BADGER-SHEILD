import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, LockKeyhole, Quote, Shirt, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { login } from '../actions';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; next?: string }> }) {
  const params = await searchParams;
  
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-muted/20 p-4 text-foreground sm:p-8">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden border border-border/10 bg-background shadow-2xl md:min-h-[620px] lg:w-[72%] lg:grid-cols-[1.08fr_0.92fr]">
        <section className="hidden bg-[#151311] px-8 py-8 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center justify-between gap-6">
            <Link href="/" className="inline-block focus-visible:outline-none rounded-sm">
              <Image
                src="/assets/images/logo-light.png"
                alt="BADGER SHEILD Logo"
                width={1264}
                height={96}
                className="h-6 sm:h-7 w-auto object-contain"
                priority
              />
            </Link>
            <span className="border border-white/15 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/65">Menswear</span>
          </div>

          <div className="max-w-md space-y-8">
            <div className="inline-flex items-center gap-2 border border-white/15 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/75">
              <Shirt className="h-3.5 w-3.5" />
              Heavyweight essentials
            </div>
            <div className="space-y-5">
              <Quote className="h-9 w-9 text-white/30" />
              <p className="font-serif text-4xl italic leading-tight text-white">
                Clean silhouettes, strong fabric, quiet confidence.
              </p>
              <div className="h-px w-16 bg-white/25" />
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
                Built for modern T-shirt rotations
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-white/15 pt-6 text-[10px] uppercase tracking-[0.16em] text-white/60">
            <span>Premium cotton</span>
            <span>Modern cuts</span>
            <span>Fast checkout</span>
          </div>
        </section>

        <section className="flex items-center px-6 py-10 sm:px-10 lg:px-12">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-10 lg:hidden">
              <Link href="/" className="inline-block focus-visible:outline-none rounded-sm">
                <Image
                  src="/assets/images/logo-dark.png"
                  alt="BADGER SHEILD Logo"
                  width={1264}
                  height={96}
                  className="h-5 sm:h-6 w-auto object-contain dark:hidden"
                  priority
                />
                <Image
                  src="/assets/images/logo-light.png"
                  alt="BADGER SHEILD Logo"
                  width={1264}
                  height={96}
                  className="h-5 sm:h-6 w-auto object-contain hidden dark:block"
                  priority
                />
              </Link>
            </div>

            <div className="mb-8 space-y-4">
              <div className="inline-flex items-center gap-2 border border-border bg-background/55 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-foreground">
                <LockKeyhole className="h-3.5 w-3.5" />
                Member access
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-black uppercase leading-none tracking-tight sm:text-4xl">Sign in</h2>
                <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                  Access your bag, wishlist, and new tee drops from the Badger Sheild collection.
                </p>
              </div>
            </div>

            <form className="space-y-5" action={login}>
              {params?.message && (
                <div className="border border-emerald-200 bg-emerald-50/10 px-4 py-3 text-xs font-semibold text-emerald-600">
                  {params.message}
                </div>
              )}
              {params?.error && (
                <div className="border border-red-200 bg-red-50/10 px-4 py-3 text-xs font-semibold text-red-600">
                  {params.error}
                </div>
              )}

              <input type="hidden" name="next" value={params?.next || ''} />

              <label className="block space-y-2" htmlFor="email">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Email address</span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  className="h-12 w-full border border-border bg-background px-4 text-sm lowercase outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground text-foreground"
                  placeholder="you@example.com"
                />
              </label>

              <label className="block space-y-2" htmlFor="password">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Password</span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="h-12 w-full border border-border bg-background px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground text-foreground"
                  placeholder="Enter password"
                />
              </label>

              <div className="flex justify-end mt-1">
                <Link
                  href="/forgot-password"
                  className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
                >
                  Forgot Password?
                </Link>
              </div>

              <Button type="submit" className="h-12 w-full rounded-none bg-primary text-[11px] font-black uppercase tracking-[0.24em] text-primary-foreground hover:bg-primary/90">
                Sign in <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>New to Badger Sheild?</span>
              <Link href={params?.next ? `/register?next=${encodeURIComponent(params.next)}` : '/register'} className="inline-flex items-center gap-2 font-black uppercase tracking-[0.16em] text-foreground hover:underline underline-offset-4">
                Create account <Sparkles className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
