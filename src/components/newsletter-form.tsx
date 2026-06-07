'use client';

import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function NewsletterForm() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Subscribed!', {
      description: 'Welcome to the club.'
    });
  };

  return (
    <form className="flex flex-col sm:flex-row gap-3" onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Enter your email address"
        className="flex-1 bg-background border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors tracking-wide"
        required
      />
      <Button type="submit" className="rounded-none uppercase tracking-widest px-7 h-12 shrink-0">
        Subscribe
      </Button>
    </form>
  );
}
