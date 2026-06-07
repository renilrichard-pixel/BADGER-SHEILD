import { useState, useEffect } from 'react';
import { wishlistStore, WishlistItem } from '../wishlist-store';
import { createClient } from '@/lib/supabase/client';

export function useWishlist() {
  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => wishlistStore.getItems());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = wishlistStore.subscribe(() => {
      if (isMounted) {
        setWishlist(wishlistStore.getItems());
      }
    });

    const supabase = createClient();

    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          setIsAuthenticated(!!session);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error checking auth session in useWishlist:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setIsAuthenticated(!!session);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
      subscription.unsubscribe();
    };
  }, []);

  const removeFromWishlist = (productId: string) => {
    wishlistStore.removeItem(productId);
  };

  const addToWishlist = (item: WishlistItem) => {
    wishlistStore.toggleItem(item);
  };

  return {
    wishlist,
    removeFromWishlist,
    addToWishlist,
    isAuthenticated,
    isLoading,
  };
}
