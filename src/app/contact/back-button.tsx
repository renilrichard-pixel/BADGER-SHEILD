'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import * as React from 'react';

export default function BackButton() {
  const router = useRouter();

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <Link
      href="/"
      onClick={handleBack}
      className="inline-flex items-center text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground mb-12 transition-colors group cursor-pointer font-sans"
    >
      <ArrowLeft className="w-3.5 h-3.5 mr-2 group-hover:-translate-x-1 transition-transform" />
      Back
    </Link>
  );
}
