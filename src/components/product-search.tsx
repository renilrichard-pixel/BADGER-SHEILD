'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { useRouter, useSearchParams } from 'next/navigation';

export function ProductSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = React.useState(searchParams.get('q') || '');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  React.useEffect(() => {
    if (searchParams.get('focus') === 'true') {
      inputRef.current?.focus();
      const params = new URLSearchParams(searchParams.toString());
      params.delete('focus');
      const newUrl = params.toString() ? `/products?${params.toString()}` : '/products';
      router.replace(newUrl);
    }
  }, [searchParams, router]);

  const handleSearch = () => {
    const trimmed = query.trim();
    const currentQ = searchParams.get('q') || '';
    if (trimmed === currentQ.trim()) {
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    if (trimmed) {
      params.set('q', trimmed);
    } else {
      params.delete('q');
    }
    params.delete('focus');
    router.push(`/products?${params.toString()}`);
  };

  return (
    <Input
      ref={inputRef}
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleSearch();
        }
      }}
      placeholder="Search products..."
      className="w-full sm:w-[200px] md:w-[250px] rounded-none uppercase tracking-widest text-xs h-10"
    />
  );
}
