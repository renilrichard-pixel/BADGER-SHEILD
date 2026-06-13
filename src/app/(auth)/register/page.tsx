import Link from 'next/link';
import { ArrowRight, Quote, ShieldCheck, Shirt, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signup } from '../actions';

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const params = await searchParams;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-muted/20 p-4 text-[#171412] sm:p-8">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden border border-border/10 bg-background shadow-2xl md:min-h-[620px] lg:w-[72%] lg:grid-cols-[0.92fr_1.08fr]">
        <section className="flex items-center px-6 py-10 sm:px-10 lg:px-12">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-10 lg:hidden">
              <Link href="/" className="text-sm font-black uppercase tracking-[0.28em]">Badger Sheild</Link>
            </div>

            <div className="mb-8 space-y-4">
              <div className="inline-flex items-center gap-2 border border-[#171412]/15 bg-white/55 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.22em]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Join the club
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-black uppercase leading-none tracking-tight sm:text-4xl">Create account</h1>
                <p className="max-w-sm text-sm leading-6 text-[#5f5850]">
                  Get first access to oversized tees, heavyweight basics, and member-only drops.
                </p>
              </div>
            </div>

            <form className="space-y-5" action={signup}>
              {params?.error && (
                <div className="border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">
                  {params.error}
                </div>
              )}

              <input type="hidden" name="next" value={params?.next || ''} />

              <label className="block space-y-2" htmlFor="fullName">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5f5850]">Full name</span>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  className="h-12 w-full border border-[#171412]/15 bg-white px-4 text-sm outline-none transition-colors placeholder:text-[#9c9287] focus:border-[#171412]"
                  placeholder="Your name"
                />
              </label>

              <label className="block space-y-2" htmlFor="email">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5f5850]">Email address</span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  className="h-12 w-full border border-[#171412]/15 bg-white px-4 text-sm lowercase outline-none transition-colors placeholder:text-[#9c9287] focus:border-[#171412]"
                  placeholder="you@example.com"
                />
              </label>

              <label className="block space-y-2" htmlFor="password">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5f5850]">Password</span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  className="h-12 w-full border border-[#171412]/15 bg-white px-4 text-sm outline-none transition-colors placeholder:text-[#9c9287] focus:border-[#171412]"
                  placeholder="Create password"
                />
              </label>

              <Button type="submit" className="h-12 w-full rounded-none bg-[#171412] text-[11px] font-black uppercase tracking-[0.24em] text-white hover:bg-[#2b2520]">
                Register <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="mt-8 flex flex-col gap-3 border-t border-[#171412]/10 pt-6 text-xs text-[#5f5850] sm:flex-row sm:items-center sm:justify-between">
              <span>Already have an account?</span>
              <Link href={params?.next ? `/login?next=${encodeURIComponent(params.next)}` : '/login'} className="inline-flex items-center gap-2 font-black uppercase tracking-[0.16em] text-[#171412] hover:underline underline-offset-4">
                Sign in <Sparkles className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        <section className="hidden bg-[#151311] px-8 py-8 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center border border-white/25 bg-white text-xl font-black text-[#151311]">B</span>
              <span className="leading-none">
                <span className="block text-sm font-black uppercase tracking-[0.28em]">Badger</span>
                <span className="block text-sm font-black uppercase tracking-[0.28em]">Sheild</span>
              </span>
            </Link>
            <span className="border border-white/15 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/65">Premium tees</span>
          </div>

          <div className="max-w-md space-y-8">
            <div className="inline-flex items-center gap-2 border border-white/15 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/75">
              <Shirt className="h-3.5 w-3.5" />
              Drop-ready wardrobe
            </div>
            <div className="space-y-5">
              <Quote className="h-9 w-9 text-white/30" />
              <p className="font-serif text-4xl italic leading-tight text-white">
                Modern tees for sharp everyday uniforms.
              </p>
              <div className="h-px w-16 bg-white/25" />
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
                Member access for future collections
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-white/15 pt-6 text-[10px] uppercase tracking-[0.16em] text-white/60">
            <span>Oversized fits</span>
            <span>Clean graphics</span>
            <span>Secure profile</span>
          </div>
        </section>
      </div>
    </main>
  );
}
