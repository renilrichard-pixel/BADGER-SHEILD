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
let state: 'uninitialized' | 'unauthenticated' | 'authenticated' | 'transitioning' = 'uninitialized';

const PENDING_CART_ITEM_KEY = 'badger_shield_pending_cart_item';
const LEGACY_GUEST_CART_KEY = 'badger_shield_guest_cart';
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

function savePendingCartItem(item: Omit<CartItem, 'cartId'>) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PENDING_CART_ITEM_KEY, JSON.stringify(item));
}

function takePendingCartItem(): Omit<CartItem, 'cartId'> | null {
  if (typeof window === 'undefined') return null;

  try {
    const rawItem = sessionStorage.getItem(PENDING_CART_ITEM_KEY);
    sessionStorage.removeItem(PENDING_CART_ITEM_KEY);
    if (!rawItem) return null;

    const item = JSON.parse(rawItem);
    if (!isValidCartItem({ ...item, cartId: 'pending-cart-item' })) return null;
    const { cartId: _cartId, ...pendingItem } = item;
    return pendingItem;
  } catch {
    sessionStorage.removeItem(PENDING_CART_ITEM_KEY);
    return null;
  }
}

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
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

    // Guest carts are no longer supported. Remove any cart persisted by an
    // earlier version of the application.
    try {
      localStorage.removeItem(LEGACY_GUEST_CART_KEY);
    } catch {
      // Browser storage can be unavailable in restricted browsing modes.
    }

    const currentUserId = user?.id || null;

    if (currentUserId !== lastUserId || state === 'uninitialized') {
      const wasUnauthenticated = lastUserId === null;
      const isAuthed = currentUserId !== null;
      const transitioningToAuthed = wasUnauthenticated && isAuthed;

      lastUserId = currentUserId;
      state = 'transitioning';
      initialized = false;
      notify();

      if (currentUserId) {
        if (isFetching) return;
        isFetching = true;
        const pendingItem = transitioningToAuthed ? takePendingCartItem() : null;
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

            memoryCart = dbCart;
            state = 'authenticated';
            initialized = true;
            notify();

            if (pendingItem) {
              const result = await cartStore.addItem(pendingItem);
              if (!result.success) {
                console.warn('Could not add the requested item after login:', result.reason);
              }
            }

            if (memoryCart.length > 0) {
              await syncToSupabase(memoryCart);
            }
          } catch (err) {
            console.error('Error loading cart in handleAuthChange:', err);
            memoryCart = [];
            state = 'authenticated';
            initialized = true;
            notify();
          } finally {
            isFetching = false;
          }
      } else {
        // User logged out
        memoryCart = [];
        state = 'unauthenticated';
        initialized = true;
        notify();
      }
    }
  },

  async addItem(item: Omit<CartItem, 'cartId'>): Promise<{ success: boolean; reason?: string }> {
    const normalizedItem = {
      ...item,
      selectedColor: normalizeSelectedColor(item.selectedColor),
    };

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      savePendingCartItem(normalizedItem);
      redirectToLogin();
      return { success: false, reason: 'Please sign in to add items to your cart.' };
    }

    if (lastUserId !== user.id) {
      await cartStore.handleAuthChange(user);
    }

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
        // Allow one unavailable item to be saved from a product card. The
        // checkout stock check remains the authority before payment.
        if (limit === 0 && !existing && addQty === 1) {
          memoryCart.push({ ...normalizedItem, cartId, quantity: 1, selected: true });
          notify();
          await syncToSupabase(memoryCart);
          return { success: true };
        }
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
    await syncToSupabase(memoryCart);
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
      await syncToSupabase(memoryCart);
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
    await syncToSupabase(memoryCart);
    return { success: true };
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
