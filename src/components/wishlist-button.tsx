'use client';

import { Heart } from 'lucide-react';
import { useState, useEffect } from 'react';
import { wishlistStore } from '@/lib/wishlist-store';
import { toast } from 'sonner';

interface WishlistButtonProps {
  productId: string;
  name: string;
  price: number;
  image: string;
  slug: string;
}

export function WishlistButton({
  productId,
  name,
  price,
  image,
  slug,
}: WishlistButtonProps) {
  const [isWishlisted, setIsWishlisted] = useState(() => wishlistStore.hasItem(productId));

  useEffect(() => {
    const unsubscribe = wishlistStore.subscribe(() => {
      setIsWishlisted(wishlistStore.hasItem(productId));
    });

    return () => unsubscribe();
  }, [productId]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    wishlistStore.toggleItem({
      productId,
      name,
      price,
      image,
      slug,
    });

    if (isWishlisted) {
      toast.success(`Removed ${name} from wishlist`);
    } else {
      toast.success(`Added ${name} to wishlist`);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`w-7 h-7 flex items-center justify-center rounded-full transition-all duration-200 border bg-background/90 backdrop-blur-sm border-border/60 hover:bg-foreground hover:text-background ${
        isWishlisted ? 'bg-foreground text-background border-foreground' : 'text-foreground'
      }`}
      aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Heart className={`w-3 h-3 ${isWishlisted ? 'fill-current' : ''}`} />
    </button>
  );
}
