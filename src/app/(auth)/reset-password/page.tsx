'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, LockKeyhole, Quote, Shirt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resetPassword } from '../actions';

export default function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = React.use(searchParams);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (password !== confirmPassword) {
      e.preventDefault();
      setValidationError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      e.preventDefault();
      setValidationError('Password must be at least 6 characters');
      return;
    }
    setValidationError('');
  };

  const displayError = validationError || params?.error;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-muted/20 p-4 text-foreground sm:p-8">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden border border-border/10 bg-background shadow-2xl md:min-h-[620px] lg:w-[72%] lg:grid-cols-[1.08fr_0.92fr]">
        <section className="hidden bg-[#151311] px-8 py-8 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center border border-white/25 bg-white text-xl font-black text-[#151311]">B</span>
              <span className="leading-none">
                <span className="block text-sm font-black uppercase tracking-[0.28em]">Badger</span>
                <span className="block text-sm font-black uppercase tracking-[0.28em]">Sheild</span>
              </span>
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
              <Link href="/" className="text-sm font-black uppercase tracking-[0.28em]">Badger Sheild</Link>
            </div>

            <div className="mb-8 space-y-4">
              <div className="inline-flex items-center gap-2 border border-border bg-background/55 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-foreground">
                <LockKeyhole className="h-3.5 w-3.5" />
                Reset Password
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-black uppercase leading-none tracking-tight sm:text-4xl">New credentials</h2>
                <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                  Enter your new password below. It must be at least 6 characters long.
                </p>
              </div>
            </div>

            <form className="space-y-5" action={resetPassword} onSubmit={handleSubmit}>
              {params?.message && (
                <div className="border border-emerald-200 bg-emerald-50/10 px-4 py-3 text-xs font-semibold text-emerald-600">
                  {params.message}
                </div>
              )}
              {displayError && (
                <div className="border border-red-200 bg-red-50/10 px-4 py-3 text-xs font-semibold text-red-600">
                  {displayError}
                </div>
              )}

              <label className="block space-y-2" htmlFor="password">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">New Password</span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 w-full border border-border bg-background px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground text-foreground"
                  placeholder="Enter new password"
                />
              </label>

              <label className="block space-y-2" htmlFor="confirmPassword">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Confirm Password</span>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 w-full border border-border bg-background px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground text-foreground"
                  placeholder="Confirm new password"
                />
              </label>

              <Button type="submit" className="h-12 w-full rounded-none bg-primary text-[11px] font-black uppercase tracking-[0.24em] text-primary-foreground hover:bg-primary/90">
                UPDATE PASSWORD <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
