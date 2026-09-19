'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Package, ShoppingBag, Image as ImageIcon, ExternalLink, LogOut, Clock } from 'lucide-react';

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  // If on login page, don't show navigation tabs
  if (pathname === '/admin/login') {
    return (
      <Link
        href="/"
        className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors"
      >
        Live Store <ExternalLink className="w-3 h-3" />
      </Link>
    );
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
      router.push('/admin/login');
      router.refresh();
    } catch {
      router.push('/admin/login');
    }
  };

  const navItems = [
    { href: '/admin', label: 'Orders & Cash', icon: Package },
    { href: '/admin/prebooks', label: 'Pre-Books', icon: Clock },
    { href: '/admin/products', label: 'Products & Pricing', icon: ShoppingBag },
    { href: '/admin/hero', label: 'Hero Section', icon: ImageIcon },
  ];

  return (
    <>
      <div className="flex items-center gap-2 sm:gap-6">
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-zinc-900/80 p-1 border border-white/10 rounded-sm">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all rounded-sm ${
                  isActive
                    ? 'bg-white text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Live Store & Logout controls */}
        <div className="flex items-center gap-2 sm:gap-3 sm:border-l border-white/10 sm:pl-4">
          <Link
            href="/"
            target="_blank"
            className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-1.5 bg-zinc-900/60 sm:bg-transparent border border-white/10 sm:border-0"
            title="Open Live Store"
          >
            <span className="hidden sm:inline">Store</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={handleLogout}
            className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors px-2 py-1.5 bg-red-950/30 sm:bg-transparent border border-red-500/20 sm:border-0"
            title="Log out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile Sticky Sub-Nav (Visible only on mobile/tablet) */}
      <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-white/10 px-2 py-1.5 overflow-x-auto flex items-center gap-1.5 shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap rounded-sm shrink-0 transition-all ${
                isActive
                  ? 'bg-white text-black font-black shadow-sm'
                  : 'text-zinc-400 hover:text-white bg-zinc-900/80 border border-white/10'
              }`}
            >
              <Icon className="w-3 h-3" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </>
  );
}
