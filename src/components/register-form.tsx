'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { PasswordInput } from '@/components/password-input';
import { AuthSubmitButton, AuthFormBody } from '@/components/auth-form';
import { Check, X, ShieldAlert } from 'lucide-react';

interface RegisterFormProps {
  action?: (formData: FormData) => void | Promise<void>;
  serverError?: string;
  next?: string;
}

export function RegisterForm({ action, serverError, next }: RegisterFormProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [clientError, setClientError] = useState('');

  // Password evaluation (clean, friendly - no heavy arbitrary blocks)
  const isMinLength = password.length >= 6;
  const isMatching = confirmPassword.length > 0 && password === confirmPassword;
  const isMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  // Strength calculation (informative only - does NOT block registration)
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (password.length < 6) {
      e.preventDefault();
      setClientError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      e.preventDefault();
      setClientError('Passwords do not match. Please re-check your password.');
      return;
    }
    setClientError('');
  };

  const activeError = clientError || serverError;

  return (
    <form action={action} onSubmit={handleSubmit}>
      <AuthFormBody>
        {activeError && (
          <div className="flex items-start gap-2 border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-400">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{activeError}</span>
          </div>
        )}

        <input type="hidden" name="next" value={next || ''} />

        <label className="block space-y-2" htmlFor="fullName">
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
            Full name
          </span>
          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            className="h-12 w-full border border-border bg-background px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground"
            placeholder="e.g. Renil Richard"
          />
        </label>

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

        <div className="space-y-2">
          <label className="block space-y-2" htmlFor="password">
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
              Password
            </span>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              minLength={6}
              maxLength={72}
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (clientError) setClientError('');
              }}
              placeholder="Create password (min. 6 characters)"
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
              Confirm Password
            </span>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              autoComplete="new-password"
              minLength={6}
              maxLength={72}
              required
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (clientError) setClientError('');
              }}
              placeholder="Re-enter your password"
            />
          </label>

          {/* Matching Status Indicator */}
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

        {/* Friendly requirements hint */}
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

        <AuthSubmitButton defaultText="Create account" loadingText="Creating account..." />
      </AuthFormBody>
    </form>
  );
}
