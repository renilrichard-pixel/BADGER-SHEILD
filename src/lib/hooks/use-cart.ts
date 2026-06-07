import { useState, useEffect } from 'react';
import { cartStore, CartItem } from '../cart-store';
import { createClient } from '@/lib/supabase/client';

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => cartStore.getItems());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(() => !cartStore.isInitialized());

  useEffect(() => {
    let isMounted = true;

    const unsubscribeCart = cartStore.subscribe(() => {
      if (isMounted) {
        setItems(cartStore.getItems());
        setIsLoading(!cartStore.isInitialized());
      }
    });

    const supabase = createClient();

    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          setIsAuthenticated(!!session);
        }
        await cartStore.handleAuthChange(session?.user || null);
        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error checking auth session in useCart:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (isMounted) {
        setIsAuthenticated(!!session);
      }
      await cartStore.handleAuthChange(session?.user || null);
    });

    return () => {
      isMounted = false;
      unsubscribeCart();
      subscription.unsubscribe();
    };
  }, []);

  const totalCount = items.length;
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return {
    items,
    cartItems: items,
    addItem: cartStore.addItem,
    addToCart: cartStore.addItem,
    updateQuantity: cartStore.updateQuantity,
    removeItem: cartStore.removeItem,
    removeFromCart: cartStore.removeItem,
    removeMultipleFromCart: cartStore.removeMultiple,
    clearCart: cartStore.clearCart,
    toggleSelection: cartStore.toggleSelection,
    isAuthenticated,
    isLoading,
    totalCount,
    subtotal,
  };
}

