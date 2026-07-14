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
let state: 'uninitialized' | 'guest' | 'authenticated' | 'transitioning' = 'uninitialized';

const GUEST_CART_KEY = 'badger_shield_guest_cart';
let lastSavedCartJson = '';

function notify() {
  listeners.forEach(l => l());
}

let isSyncing = false;
let needsSync = false;

function isValidCartItem(item: any): item is CartItem {
  return (
    item &&
    typeof item.cartId === 'string' &&
    typeof item.productId === 'string' &&
    typeof item.name === 'string' &&
    typeof item.slug === 'string' &&
    typeof item.price === 'number' &&
    typeof item.quantity === 'number' &&
    typeof item.selectedSize === 'string' &&
    typeof item.selectedColor === 'string' &&
    typeof item.image === 'string' &&
    (item.selected === undefined || typeof item.selected === 'boolean')
  );
}

function loadGuestCartFromLocalStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(GUEST_CART_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed.filter(isValidCartItem);
    }
  } catch (err) {
    console.error('Error loading guest cart from localStorage:', err);
    try {
      localStorage.removeItem(GUEST_CART_KEY);
    } catch (_) {}
  }
  return [];
}

function saveGuestCartToLocalStorage(cart: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    const json = JSON.stringify(cart);
    if (json === lastSavedCartJson) return;
    localStorage.setItem(GUEST_CART_KEY, json);
    lastSavedCartJson = json;
  } catch (err) {
    console.error('Error saving guest cart to localStorage:', err);
  }
}

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

    // Defer transition logic execution to the end of the microtask queue
    queueMicrotask(async () => {
      if (currentUserId !== lastUserId || state === 'uninitialized') {
        const wasGuest = lastUserId === null;
        const isAuthed = currentUserId !== null;
        const transitioningToAuthed = wasGuest && isAuthed;

        lastUserId = currentUserId;
        state = 'transitioning';
        initialized = false;
        notify();

        if (currentUserId) {
          if (isFetching) return;
          isFetching = true;
          const preMergeGuestCart = loadGuestCartFromLocalStorage();
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

            const guestCart = transitioningToAuthed ? preMergeGuestCart : [];
            const hasGuestItems = guestCart.length > 0;

            const merged = [...dbCart];
            if (transitioningToAuthed && hasGuestItems) {
              guestCart.forEach(localItem => {
                const existing = merged.find(i => i.cartId === localItem.cartId);
                if (existing) {
                  existing.quantity = Number(existing.quantity) + Number(localItem.quantity);
                } else {
                  merged.push(localItem);
                }
              });
            }

            memoryCart = merged;
            state = 'authenticated';
            initialized = true;
            notify();

            // Sync merged cart back to Supabase
            if (memoryCart.length > 0) {
              await syncToSupabase(memoryCart);
            }

            // Immediately remove the guest cart from localStorage after successful merge
            if (transitioningToAuthed && hasGuestItems) {
              try {
                localStorage.removeItem(GUEST_CART_KEY);
                lastSavedCartJson = '';
              } catch (err) {
                console.error('Error removing guest cart from localStorage:', err);
              }
            }
          } catch (err) {
            console.error('Error fetching/merging cart in handleAuthChange:', err);
            // Rollback on failure:
            if (transitioningToAuthed) {
              memoryCart = preMergeGuestCart;
              state = 'guest';
              lastUserId = null;
            } else {
              memoryCart = [];
              state = 'authenticated';
            }
            initialized = true;
            notify();
          } finally {
            isFetching = false;
          }
        } else {
          // User logged out
          memoryCart = loadGuestCartFromLocalStorage();
          lastSavedCartJson = JSON.stringify(memoryCart);
          state = 'guest';
          initialized = true;
          notify();
        }
      }
    });
  },

  addItem(item: Omit<CartItem, 'cartId'>) {
    if (state === 'uninitialized' || state === 'transitioning') {
      state = lastUserId ? 'authenticated' : 'guest';
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
    if (lastUserId) {
      return syncToSupabase(memoryCart);
    } else {
      saveGuestCartToLocalStorage(memoryCart);
      return Promise.resolve();
    }
  },

  updateQuantity(cartId: string, quantity: number) {
    const existing = memoryCart.find(i => i.cartId === cartId);
    if (existing) {
      existing.quantity = Math.max(1, Number(quantity));
      notify();
      if (lastUserId) {
        return syncToSupabase(memoryCart);
      } else {
        saveGuestCartToLocalStorage(memoryCart);
        return Promise.resolve();
      }
    }
    return Promise.resolve();
  },

  removeItem(cartId: string) {
    memoryCart = [...memoryCart.filter(i => i.cartId !== cartId)];
    notify();
    if (lastUserId) {
      return syncToSupabase(memoryCart);
    } else {
      saveGuestCartToLocalStorage(memoryCart);
      return Promise.resolve();
    }
  },

  removeMultiple(cartIds: string[]) {
    memoryCart = [...memoryCart.filter(i => !cartIds.includes(i.cartId))];
    notify();
    if (lastUserId) {
      return syncToSupabase(memoryCart);
    } else {
      saveGuestCartToLocalStorage(memoryCart);
      return Promise.resolve();
    }
  },

  toggleSelection(cartId: string) {
    const existing = memoryCart.find(i => i.cartId === cartId);
    if (existing) {
      existing.selected = existing.selected === false ? true : false;
      notify();
      if (!lastUserId) {
        saveGuestCartToLocalStorage(memoryCart);
      }
    }
  },

  clearCart() {
    memoryCart = [];
    initialized = false;
    notify();
    if (lastUserId) {
      return syncToSupabase(memoryCart);
    } else {
      saveGuestCartToLocalStorage(memoryCart);
      return Promise.resolve();
    }
  },

  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === GUEST_CART_KEY && !lastUserId) {
      const updatedCart = loadGuestCartFromLocalStorage();
      const currentJson = JSON.stringify(memoryCart);
      const updatedJson = JSON.stringify(updatedCart);
      if (currentJson !== updatedJson) {
        memoryCart = updatedCart;
        lastSavedCartJson = updatedJson;
        notify();
      }
    }
  });
}
