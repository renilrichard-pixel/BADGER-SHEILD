'use client';

import React from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthSubmitButtonProps {
  defaultText: string;
  loadingText: string;
  className?: string;
  icon?: React.ReactNode;
}

export function AuthSubmitButton({
  defaultText,
  loadingText,
  className = "h-12 w-full rounded-none bg-primary text-[11px] font-black uppercase tracking-[0.24em] text-primary-foreground hover:bg-primary/90",
  icon = <ArrowRight className="ml-2 h-4 w-4" />,
}: AuthSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      aria-busy={pending}
      className={className}
    >
      {pending ? (
        <span className="flex items-center justify-center">
          <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />
          <span>{loadingText}</span>
        </span>
      ) : (
        <span className="flex items-center justify-center">
          <span>{defaultText}</span>
          {icon}
        </span>
      )}
    </Button>
  );
}

export function AuthFormBody({
  children,
  className = "space-y-5"
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <div className={`transition-opacity duration-200 ${pending ? 'opacity-60 pointer-events-none' : ''} ${className}`}>
      {children}
    </div>
  );
}
