'use client';

import * as React from 'react';
import { useState, useEffect, useRef, useTransition, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, User, Heart, LogOut, LogIn, UserCircle, ShoppingBag, Sun, Moon, Laptop } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/hooks/use-cart';
import { createClient } from '@/lib/supabase/client';
import { cartStore } from '@/lib/cart-store';
import { wishlistStore } from '@/lib/wishlist-store';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

interface NavbarCategory {
  _id: string;
  name: string;
  slug?: { current?: string };
}

interface NavbarLinksProps {
  categories: NavbarCategory[];
  onClose?: () => void;
}

function NavbarLinksInner({ categories, onClose }: NavbarLinksProps) {
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category');

  return (
    <>
      {categories.map((category) => {
        const isActive = currentCategory === category.slug?.current;
        return (
          <Link
            key={category._id}
            href={`/products?category=${category.slug?.current}`}
            onClick={onClose}
            className={`text-xs uppercase tracking-widest font-semibold transition-colors duration-200 border-b-2 py-1 ${
              isActive 
                ? 'text-foreground border-foreground' 
                : 'text-muted-foreground hover:text-foreground border-transparent'
            }`}
          >
            {category.name}
          </Link>
        );
      })}
    </>
  );
}

function MobileNavbarLinksInner({ categories, onClose }: NavbarLinksProps) {
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category');

  return (
    <>
      {categories.map((category) => {
        const isActive = currentCategory === category.slug?.current;
        return (
          <Link
            key={category._id}
            href={`/products?category=${category.slug?.current}`}
            onClick={onClose}
            className={`block px-3 py-2.5 text-base font-semibold uppercase tracking-wider transition-colors border-l-2 ${
              isActive 
                ? 'text-foreground border-foreground bg-muted/30 pl-4' 
                : 'text-muted-foreground hover:text-foreground border-transparent pl-4 hover:bg-muted/10'
            }`}
          >
            {category.name}
          </Link>
        );
      })}
    </>
  );
}

export function NavbarLinks({ categories }: { categories: NavbarCategory[] }) {
  return (
    <Suspense fallback={
      <nav className="hidden md:flex items-center gap-6 ml-6">
        {categories.map((category) => (
          <span key={category._id} className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
            {category.name}
          </span>
        ))}
      </nav>
    }>
      <nav className="hidden md:flex items-center gap-6 ml-6">
        <NavbarLinksInner categories={categories} />
      </nav>
    </Suspense>
  );
}

export function MobileNavbarLinks({ categories, onClose }: NavbarLinksProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Suspense fallback={
      <nav className="flex flex-col gap-4 mt-8">
        {categories.map((category) => (
          <span key={category._id} className="block px-3 py-2.5 text-base font-semibold text-muted-foreground">
            {category.name}
          </span>
        ))}
      </nav>
    }>
      <nav className="flex flex-col gap-4 mt-6">
        <div className="px-3 pb-4 mb-2 border-b border-border/40">
          <Link href="/" onClick={onClose} className="inline-block focus-visible:outline-none rounded-sm">
            <Image
              src="/assets/images/logo-dark.png"
              alt="BADGER SHEILD Logo"
              width={1264}
              height={96}
              className="h-5 sm:h-6 w-auto object-contain dark:hidden"
            />
            <Image
              src="/assets/images/logo-light.png"
              alt="BADGER SHEILD Logo"
              width={1264}
              height={96}
              className="h-5 sm:h-6 w-auto object-contain hidden dark:block"
            />
          </Link>
        </div>
        <MobileNavbarLinksInner categories={categories} onClose={onClose} />
        
        {mounted && (
          <div className="border-t border-border/60 mt-8 pt-6 px-3">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground mb-4">
              Theme
            </p>
            <div className="grid grid-cols-3 gap-1 bg-muted/40 p-1 border border-border/50 rounded-sm">
              {[
                { id: 'light', label: 'Light', Icon: Sun },
                { id: 'dark', label: 'Dark', Icon: Moon },
                { id: 'system', label: 'System', Icon: Laptop },
              ].map(({ id, label, Icon }) => {
                const isActive = theme === id;
                return (
                  <button
                    key={id}
                    onClick={() => setTheme(id)}
                    className={`flex flex-col items-center justify-center py-2.5 gap-1.5 transition-all relative font-bold text-[9px] uppercase tracking-widest rounded-sm cursor-pointer
                      ${isActive
                        ? 'bg-background text-foreground shadow-xs border border-border/30'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/20 border border-transparent'
                      }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>
    </Suspense>
  );
}

function NavbarSearchInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [isOpen, setIsOpen] = useState(!!searchParams.get('q'));
  const [, startTransition] = useTransition();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOpen) {
      setIsOpen(true);
      setTimeout(() => document.querySelector<HTMLInputElement>('input[type="search"]')?.focus(), 50);
      return;
    }
    const trimmed = query.trim();
    startTransition(() => {
      if (trimmed) {
        router.push(`/products?q=${encodeURIComponent(trimmed)}`);
      } else {
        router.push('/products');
      }
    });
  };

  return (
    <form onSubmit={handleSearch} className={`relative flex items-center h-9 transition-all duration-300 ${isOpen ? 'w-36 sm:w-48 md:w-56 lg:w-64' : 'w-9'}`}>
      <Input
        type="search"
        placeholder="Search..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => { if (!query.trim()) setIsOpen(false); }}
        className={`absolute right-0 h-full pl-9 pr-3 text-xs bg-muted/40 focus:bg-background border-border rounded-none transition-all duration-300 ${isOpen ? 'w-full opacity-100 pointer-events-auto' : 'w-9 opacity-0 pointer-events-none'}`}
      />
      <button 
        type={isOpen ? 'submit' : 'button'} 
        onClick={(e) => {
          if (!isOpen) {
            e.preventDefault();
            setIsOpen(true);
            setTimeout(() => document.querySelector<HTMLInputElement>('input[type="search"]')?.focus(), 50);
          }
        }}
        className="absolute left-0 top-0 z-10 h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none"
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
      </button>
    </form>
  );
}

export function NavbarSearch() {
  return (
    <Suspense fallback={
      <div className="relative flex items-center h-9 w-9">
        <div className="absolute left-0 top-0 z-10 h-9 w-9 flex items-center justify-center text-muted-foreground/40 bg-transparent">
          <Search className="h-4 w-4" />
        </div>
      </div>
    }>
      <NavbarSearchInner />
    </Suspense>
  );
}

export function CartButton() {
  const { totalCount } = useCart();

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="relative" 
      render={<Link href="/cart" />} 
      nativeButton={false}
    >
      <ShoppingBag className="h-5 w-5" />
      {totalCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-in scale-in duration-300">
          {totalCount}
        </span>
      )}
      <span className="sr-only">Cart</span>
    </Button>
  );
}

interface UserDropdownProps {
  email: string | null;
}

export function UserDropdown({ email }: UserDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error(error.message); return; }
    cartStore.clearCart();
    wishlistStore.clear();
    toast.success('Successfully logged out');
    router.push('/');
    router.refresh();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 h-9 w-9 justify-center rounded-md hover:bg-muted transition-colors"
        aria-label="Account menu"
      >
        <User className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 border border-border bg-background shadow-xl z-60 animate-in fade-in slide-in-from-top-2 duration-150">
          {email ? (
            <>
              <div className="px-4 py-3 border-b border-border/60">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Signed in as</p>
                <p className="text-xs font-semibold text-foreground truncate mt-0.5">{email}</p>
              </div>

              <div className="py-1">
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-[11px] uppercase tracking-widest font-bold text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
                >
                  <UserCircle className="w-4 h-4" />
                  Profile
                </Link>

                <Link
                  href="/wishlist"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-[11px] uppercase tracking-widest font-bold text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Heart className="w-4 h-4" />
                  Wishlist
                </Link>

                <div className="border-t border-border/60 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-2.5 text-[11px] uppercase tracking-widest font-bold text-red-500 hover:bg-red-50/60 dark:hover:bg-red-900/20 transition-colors w-full text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border/60">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Not signed in</p>
              </div>
              <div className="py-1">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-[11px] uppercase tracking-widest font-bold text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-[11px] uppercase tracking-widest font-bold text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
                >
                  <UserCircle className="w-4 h-4" />
                  Create Account
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
