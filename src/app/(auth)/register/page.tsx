import * as React from 'react';
import Link from 'next/link';
import { signup } from '../actions';
import { RegisterForm } from '@/components/register-form';

export default async function RegisterPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const error = typeof searchParams?.error === 'string' ? searchParams.error : undefined;
  const next = typeof searchParams?.next === 'string' ? searchParams.next : undefined;

  return (
    <main className="flex justify-center bg-muted/20 px-4 py-8 text-foreground sm:px-8 sm:py-10">
      <section className="w-full max-w-md border border-border bg-background p-6 shadow-sm lg:max-w-2xl sm:p-8">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-black uppercase tracking-tight">Create account</h1>
          <p className="text-sm text-muted-foreground">Fill in the details below to get started.</p>
        </div>

        <RegisterForm action={signup} serverError={error} next={next} />

        <p className="mt-6 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
            className="font-bold text-foreground hover:underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
