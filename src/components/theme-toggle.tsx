'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Toggle theme">
        <div className="h-4 w-4 animate-pulse bg-muted/40 rounded-full" />
      </Button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-muted transition-colors relative"
        aria-label="Select theme"
      >
        <Sun className="h-[18px] w-[18px] rotate-0 scale-100 transition-transform duration-300 dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[18px] w-[18px] rotate-90 scale-0 transition-transform duration-300 dark:rotate-0 dark:scale-100" />
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-36 border border-border bg-background shadow-xl z-[60] animate-in fade-in slide-in-from-top-2 duration-150 rounded-sm">
          <div className="py-1">
            <button
              onClick={() => { setTheme('light'); setOpen(false); }}
              className="flex items-center justify-between px-3 py-2.5 text-[10px] uppercase tracking-widest font-bold text-foreground/80 hover:text-foreground hover:bg-muted transition-colors w-full text-left"
            >
              <span className="flex items-center gap-2">
                <Sun className="w-3.5 h-3.5" /> Light
              </span>
              {theme === 'light' && <Check className="w-3 h-3 text-foreground" />}
            </button>
            <button
              onClick={() => { setTheme('dark'); setOpen(false); }}
              className="flex items-center justify-between px-3 py-2.5 text-[10px] uppercase tracking-widest font-bold text-foreground/80 hover:text-foreground hover:bg-muted transition-colors w-full text-left"
            >
              <span className="flex items-center gap-2">
                <Moon className="w-3.5 h-3.5" /> Dark
              </span>
              {theme === 'dark' && <Check className="w-3 h-3 text-foreground" />}
            </button>
            <button
              onClick={() => { setTheme('system'); setOpen(false); }}
              className="flex items-center justify-between px-3 py-2.5 text-[10px] uppercase tracking-widest font-bold text-foreground/80 hover:text-foreground hover:bg-muted transition-colors w-full text-left"
            >
              <span className="flex items-center gap-2">
                <Laptop className="w-3.5 h-3.5" /> System
              </span>
              {theme === 'system' && <Check className="w-3 h-3 text-foreground" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
