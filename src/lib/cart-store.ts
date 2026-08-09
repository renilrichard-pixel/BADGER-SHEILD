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
const DEFAULT_SELECTED_COLOR = 'Default';

function normalizeSelectedColor(value: unknown): string {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : DEFAULT_SELECTED_COLOR;
}

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
    (item.selectedColor === undefined || item.selectedColor === null || typeof item.selectedColor === 'string') &&
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
      return parsed.filter(isValidCartItem).map(item => ({
        ...item,
        selectedColor: normalizeSelectedColor(item.selectedColor),
      }));
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

let stockLimits: Record<string, number> = {};
let stockRefreshPromise: Promise<Record<string, number>> | null = null;
let lastStockFetchTime = 0;
let lastStockFetchCartKey = '';

async function fetchStockLimitsFromApi(cart: CartItem[]): Promise<Record<string, number>> {
  if (typeof window === 'undefined' || cart.length === 0) {
    return {};
  }
  try {
    const payload = {
      items: cart.map(i => ({
        productId: i.productId,
        cartId: i.cartId,
        selectedSize: i.selectedSize,
        quantity: i.quantity,
      })),
    };
    const res = await fetch('/api/cart/stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.stockLimits) {
        return data.stockLimits;
      }
    }
  } catch (err) {
    console.error('Error fetching stock limits:', err);
  }
  return {};
}

export const cartStore = {
  getItems(): CartItem[] {
    return [...memoryCart];
  },

  getStockLimits(): Record<string, number> {
    return { ...stockLimits };
  },

  async refreshStockLimits(): Promise<Record<string, number>> {
    if (typeof window === 'undefined' || memoryCart.length === 0) {
      if (Object.keys(stockLimits).length > 0) {
        stockLimits = {};
        notify();
      }
      return stockLimits;
    }

    const currentCartKey = memoryCart.map(i => `${i.cartId}:${i.quantity}`).join('|');
    const now = Date.now();

    if (now - lastStockFetchTime < 5000 && currentCartKey === lastStockFetchCartKey) {
      return stockLimits;
    }

    if (stockRefreshPromise) {
      return stockRefreshPromise;
    }

    stockRefreshPromise = (async () => {
      try {
        const limits = await fetchStockLimitsFromApi(memoryCart);
        stockLimits = { ...stockLimits, ...limits };
        lastStockFetchTime = Date.now();
        lastStockFetchCartKey = currentCartKey;

        let updated = false;
        memoryCart.forEach(item => {
          const limit = stockLimits[item.cartId];
          if (limit !== undefined && limit > 0 && item.quantity > limit) {
            item.quantity = limit;
            updated = true;
          }
        });

        notify();
        if (updated && lastUserId) {
          await syncToSupabase(memoryCart);
        } else if (updated) {
          saveGuestCartToLocalStorage(memoryCart);
        }
        return stockLimits;
      } finally {
        stockRefreshPromise = null;
      }
    })();

    return stockRefreshPromise;
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
                    selectedColor: normalizeSelectedColor(d.selected_color),
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

  async addItem(item: Omit<CartItem, 'cartId'>): Promise<{ success: boolean; reason?: string }> {
    if (state === 'uninitialized' || state === 'transitioning') {
      state = lastUserId ? 'authenticated' : 'guest';
      initialized = true;
    }
    const normalizedItem = {
      ...item,
      selectedColor: normalizeSelectedColor(item.selectedColor),
    };
    const cartId = `${normalizedItem.productId}-${normalizedItem.selectedSize}-${normalizedItem.selectedColor}`;
    const existing = memoryCart.find(i => i.cartId === cartId);

    const addQty = Number(normalizedItem.quantity) || 1;
    const currentQty = existing ? Number(existing.quantity) : 0;
    const targetQty = currentQty + addQty;

    let limit = stockLimits[cartId];

    if (limit === undefined) {
      const apiLimits = await fetchStockLimitsFromApi([{ ...normalizedItem, cartId, quantity: targetQty }]);
      if (apiLimits[cartId] !== undefined) {
        limit = apiLimits[cartId];
        stockLimits[cartId] = limit;
      }
    }

    if (limit !== undefined) {
      if (targetQty > limit) {
        const msg = limit === 0
          ? `Size ${normalizedItem.selectedSize} is out of stock`
          : `Maximum available quantity reached (${limit} available in size ${normalizedItem.selectedSize})`;
        return { success: false, reason: msg };
      }
    }

    if (existing) {
      existing.quantity = targetQty;
    } else {
      memoryCart.push({ ...normalizedItem, cartId, quantity: targetQty, selected: true });
    }
    notify();
    if (lastUserId) {
      await syncToSupabase(memoryCart);
    } else {
      saveGuestCartToLocalStorage(memoryCart);
    }
    return { success: true };
  },

  async updateQuantity(cartId: string, quantity: number): Promise<{ success: boolean; reason?: string }> {
    const existing = memoryCart.find(i => i.cartId === cartId);
    if (!existing) {
      return { success: false, reason: 'Item not found in cart' };
    }

    const targetQty = Math.max(1, Number(quantity));

    if (targetQty < existing.quantity) {
      existing.quantity = targetQty;
      notify();
      if (lastUserId) {
        await syncToSupabase(memoryCart);
      } else {
        saveGuestCartToLocalStorage(memoryCart);
      }
      return { success: true };
    }

    let limit = stockLimits[cartId];
    if (limit === undefined) {
      const apiLimits = await fetchStockLimitsFromApi([existing]);
      if (apiLimits[cartId] !== undefined) {
        limit = apiLimits[cartId];
        stockLimits[cartId] = limit;
      }
    }

    if (limit !== undefined) {
      if (targetQty > limit) {
        const msg = limit === 0
          ? `Size ${existing.selectedSize} is out of stock`
          : `Maximum available quantity reached (${limit} available in size ${existing.selectedSize})`;
        notify();
        return { success: false, reason: msg };
      }
    }

    existing.quantity = targetQty;
    notify();
    if (lastUserId) {
      await syncToSupabase(memoryCart);
    } else {
      saveGuestCartToLocalStorage(memoryCart);
    }
    return { success: true };
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
