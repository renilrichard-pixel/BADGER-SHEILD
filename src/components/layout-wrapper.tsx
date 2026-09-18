'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export function LayoutWrapper({
  navbar,
  footer,
  children,
}: {
  navbar: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideStorefrontNav = pathname?.startsWith('/admin') || pathname?.startsWith('/studio');

  if (hideStorefrontNav) {
    return <main className="flex-1 w-full">{children}</main>;
  }

  return (
    <>
      {navbar}
      <main className="flex-1 w-full">{children}</main>
      {footer}
    </>
  );
}
