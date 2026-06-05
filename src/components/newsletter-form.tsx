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
    <form className="flex flex-col sm:flex-row gap-4" onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="ENTER YOUR EMAIL"
        className="flex-1 bg-transparent border-b border-background/30 px-0 py-3 text-background placeholder:text-background/50 focus:outline-none focus:border-background transition-colors uppercase tracking-widest text-sm"
        required
      />
      <Button type="submit" variant="secondary" className="rounded-none uppercase tracking-widest">
        Subscribe
      </Button>
    </form>
  );
}
