'use client';

import { createClient } from '@/lib/supabase/client';

export interface WishlistItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  slug: string;
}

let listeners: (() => void)[] = [];
let memoryWishlist: WishlistItem[] = [];
let initialized = false;

function notify() {
  listeners.forEach((l) => l());
}

let isSyncing = false;
let needsSync = false;

async function syncToSupabase(wishlist: WishlistItem[]) {
  if (typeof window === 'undefined') return;

  if (isSyncing) {
    needsSync = true;
    return;
  }

  isSyncing = true;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase.from('wishlists').delete().eq('user_id', user.id);

      if (wishlist.length > 0) {
        const inserts = wishlist.map(item => ({
          user_id: user.id,
          product_id: item.productId,
          name: item.name,
          price: item.price,
          image: item.image,
          slug: item.slug,
        }));
        await supabase.from('wishlists').insert(inserts);
      }
    }
  } finally {
    isSyncing = false;
    if (needsSync) {
      needsSync = false;
      syncToSupabase(memoryWishlist);
    }
  }
}

async function initWishlist() {
  if (typeof window === 'undefined' || initialized) return;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data } = await supabase.from('wishlists').select('*').eq('user_id', user.id);
    if (data && data.length > 0) {
      const loadedWishlist: WishlistItem[] = [];
      data.forEach(d => {
        const existing = loadedWishlist.find(i => i.productId === d.product_id);
        if (!existing) {
          loadedWishlist.push({
            productId: d.product_id,
            name: d.name,
            price: Number(d.price),
            image: d.image,
            slug: d.slug
          });
        }
      });
      memoryWishlist = loadedWishlist;
      notify();
    }
  }
  initialized = true;
}

if (typeof window !== 'undefined') {
  initWishlist();
}

export const wishlistStore = {
  getItems(): WishlistItem[] {
    return [...memoryWishlist];
  },

  hasItem(productId: string): boolean {
    return memoryWishlist.some((item) => item.productId === productId);
  },

  toggleItem(item: WishlistItem) {
    const index = memoryWishlist.findIndex((i) => i.productId === item.productId);
    if (index >= 0) {
      memoryWishlist.splice(index, 1);
    } else {
      memoryWishlist.push(item);
    }
    notify();
    syncToSupabase(memoryWishlist);
  },

  removeItem(productId: string) {
    memoryWishlist = memoryWishlist.filter((i) => i.productId !== productId);
    notify();
    syncToSupabase(memoryWishlist);
  },

  clear() {
    memoryWishlist = [];
    initialized = false;
    notify();
  },

  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },
};
