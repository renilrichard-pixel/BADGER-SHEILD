import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Package, ShoppingBag, Image as ImageIcon, ExternalLink, LogOut } from 'lucide-react';
import AdminNav from '@/components/admin/AdminNav';

export const metadata = {
  title: 'Admin Portal | BADGER SHEILD',
  description: 'Manage store orders, products, cash revenue, and homepage hero banner.',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      {/* Admin Top Header */}
      <header className="border-b border-white/10 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-none border border-white/20 bg-white/5 flex items-center justify-center group-hover:border-white transition-colors">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-sm tracking-[0.25em] uppercase text-white">
                Badger Sheild <span className="text-[10px] text-zinc-400 font-mono font-normal">/ ADMIN</span>
              </span>
            </Link>
          </div>

          <AdminNav />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
