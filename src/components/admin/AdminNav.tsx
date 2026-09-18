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
    <div className="flex items-center gap-6">
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

      <div className="flex items-center gap-3 border-l border-white/10 pl-4">
        <Link
          href="/"
          target="_blank"
          className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          Store <ExternalLink className="w-3 h-3" />
        </Link>
        <button
          onClick={handleLogout}
          className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors ml-2"
          title="Log out"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </div>
  );
}
