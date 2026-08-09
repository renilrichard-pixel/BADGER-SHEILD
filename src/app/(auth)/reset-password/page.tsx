'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/password-input';
import { resetPassword } from '../actions';

export default function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = React.use(searchParams);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (password !== confirmPassword) {
      event.preventDefault();
      setValidationError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      event.preventDefault();
      setValidationError('Password must be at least 6 characters');
      return;
    }
    setValidationError('');
  };

  const displayError = validationError || params?.error;

  return (
    <main className="flex justify-center bg-muted/20 px-4 py-8 text-foreground sm:px-8 sm:py-10">
      <section className="w-full max-w-md border border-border bg-background p-6 shadow-sm lg:max-w-2xl sm:p-8">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-black uppercase tracking-tight">Set new password</h1>
          <p className="text-sm text-muted-foreground">Choose a password with at least 6 characters.</p>
        </div>

        <form className="space-y-5" action={resetPassword} onSubmit={handleSubmit}>
          {params?.message && <div className="border border-emerald-200 bg-emerald-50/10 px-4 py-3 text-xs font-semibold text-emerald-600">{params.message}</div>}
          {displayError && <div className="border border-red-200 bg-red-50/10 px-4 py-3 text-xs font-semibold text-red-600">{displayError}</div>}

          <label className="block space-y-2" htmlFor="password">
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">New password</span>
            <PasswordInput id="password" name="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter new password" />
          </label>

          <label className="block space-y-2" htmlFor="confirmPassword">
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Confirm password</span>
            <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm new password" />
          </label>

          <Button type="submit" className="h-12 w-full rounded-none bg-primary text-[11px] font-black uppercase tracking-[0.24em] text-primary-foreground hover:bg-primary/90">
            Update password <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>

        <p className="mt-6 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          <Link href="/login" className="font-bold text-foreground hover:underline underline-offset-4">Back to sign in</Link>
        </p>
      </section>
    </main>
  );
}
