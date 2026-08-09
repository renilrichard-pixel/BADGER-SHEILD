import type { CartItem } from '@/lib/cart-store';

export const BUY_NOW_STORAGE_KEY = 'badger_shield_buy_now_item';

export type BuyNowItem = CartItem;

export function saveBuyNowItem(item: Omit<BuyNowItem, 'cartId' | 'selected'>) {
  if (typeof window === 'undefined') return;

  const cartId = `buy-now-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  sessionStorage.setItem(BUY_NOW_STORAGE_KEY, JSON.stringify({ ...item, cartId, selected: true }));
}

export function readBuyNowItem(): BuyNowItem | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(BUY_NOW_STORAGE_KEY);
    if (!raw) return null;
    const item = JSON.parse(raw);
    if (!item || typeof item.cartId !== 'string' || typeof item.productId !== 'string' || typeof item.quantity !== 'number') return null;
    return item as BuyNowItem;
  } catch {
    return null;
  }
}

export function clearBuyNowItem() {
  if (typeof window !== 'undefined') sessionStorage.removeItem(BUY_NOW_STORAGE_KEY);
}
