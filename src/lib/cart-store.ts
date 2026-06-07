import { createClient } from '@/lib/supabase/client';

export interface CartItem {
  cartId: string;
  productId: string;
  name: string;
  slug: string;
  price: number;
  quantity: number;
  selectedSize: string;
  selectedColor: string;
  image: string;
  selected?: boolean;
}

let listeners: (() => void)[] = [];
let memoryCart: CartItem[] = [];
let initialized = false;

function notify() {
  listeners.forEach(l => l());
}

let isSyncing = false;
let needsSync = false;

async function syncToSupabase(cart: CartItem[]) {
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
      await supabase.from('carts').delete().eq('user_id', user.id);

      if (cart.length > 0) {
        const inserts = cart.map(item => ({
          user_id: user.id,
          cart_id: item.cartId,
          product_id: item.productId,
          name: item.name,
          slug: item.slug,
          price: item.price,
          quantity: item.quantity,
          selected_size: item.selectedSize,
          selected_color: item.selectedColor,
          image: item.image,
        }));
        await supabase.from('carts').insert(inserts);
      }
    }
  } finally {
    isSyncing = false;
    if (needsSync) {
      needsSync = false;
      syncToSupabase(memoryCart);
    }
  }
}

let lastUserId: string | null = null;
let isFetching = false;

export const cartStore = {
  getItems(): CartItem[] {
    return [...memoryCart];
  },

  isInitialized(): boolean {
    return initialized;
  },

  async handleAuthChange(user: any) {
    if (typeof window === 'undefined') return;

    const currentUserId = user?.id || null;

    if (currentUserId !== lastUserId) {
      lastUserId = currentUserId;
      initialized = false;
      notify();

      if (currentUserId) {
        if (isFetching) return;
        isFetching = true;
        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from('carts')
            .select('*')
            .eq('user_id', currentUserId);

          if (error) throw error;

          const dbCart: CartItem[] = [];
          if (data && data.length > 0) {
            data.forEach(d => {
              const existing = dbCart.find(i => i.cartId === d.cart_id);
              if (existing) {
                existing.quantity += d.quantity;
              } else {
                dbCart.push({
                  cartId: d.cart_id,
                  productId: d.product_id,
                  name: d.name,
                  slug: d.slug,
                  price: Number(d.price),
                  quantity: d.quantity,
                  selectedSize: d.selected_size,
                  selectedColor: d.selected_color,
                  image: d.image,
                  selected: true,
                });
              }
            });
          }

          // Merge guest memoryCart into dbCart
          const merged = [...dbCart];
          memoryCart.forEach(localItem => {
            const existing = merged.find(i => i.cartId === localItem.cartId);
            if (existing) {
              existing.quantity = Number(existing.quantity) + Number(localItem.quantity);
            } else {
              merged.push(localItem);
            }
          });

          memoryCart = merged;
          initialized = true;
          notify();

          // Sync merged cart back to Supabase
          if (memoryCart.length > 0) {
            await syncToSupabase(memoryCart);
          }
        } catch (err) {
          console.error('Error fetching cart in handleAuthChange:', err);
          initialized = true;
          notify();
        } finally {
          isFetching = false;
        }
      } else {
        // User logged out
        memoryCart = [];
        initialized = true;
        notify();
      }
    } else {
      if (!initialized) {
        initialized = true;
        notify();
      }
    }
  },

  addItem(item: Omit<CartItem, 'cartId'>) {
    if (!initialized) {
      initialized = true;
    }
    const cartId = `${item.productId}-${item.selectedSize}-${item.selectedColor}`;
    const existing = memoryCart.find(i => i.cartId === cartId);
    if (existing) {
      existing.quantity = Number(existing.quantity) + Number(item.quantity);
    } else {
      memoryCart.push({ ...item, cartId, quantity: Number(item.quantity), selected: true });
    }
    notify();
    return syncToSupabase(memoryCart);
  },

  updateQuantity(cartId: string, quantity: number) {
    const existing = memoryCart.find(i => i.cartId === cartId);
    if (existing) {
      existing.quantity = Math.max(1, Number(quantity));
      notify();
      return syncToSupabase(memoryCart);
    }
    return Promise.resolve();
  },

  removeItem(cartId: string) {
    memoryCart = [...memoryCart.filter(i => i.cartId !== cartId)];
    notify();
    return syncToSupabase(memoryCart);
  },

  removeMultiple(cartIds: string[]) {
    memoryCart = [...memoryCart.filter(i => !cartIds.includes(i.cartId))];
    notify();
    return syncToSupabase(memoryCart);
  },

  toggleSelection(cartId: string) {
    const existing = memoryCart.find(i => i.cartId === cartId);
    if (existing) {
      existing.selected = existing.selected === false ? true : false;
      notify();
    }
  },

  clearCart() {
    memoryCart = [];
    initialized = false;
    notify();
    return syncToSupabase(memoryCart);
  },

  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }
};
