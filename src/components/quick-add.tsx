'use client';

import { useState } from 'react';
import { useCart } from '@/lib/hooks/use-cart';
import { cartStore } from '@/lib/cart-store';
import { toast } from 'sonner';
import { ShoppingBag, X, Check } from 'lucide-react';
import { requireAuth } from '@/lib/require-auth';

interface QuickAddProps {
  productId: string;
  name: string;
  price: number;
  image: string;
  slug: string;
  sizes?: string[] | null;
  colors?: string[] | null;
  stockQty?: number;
}

export function QuickAdd({
  productId,
  name,
  price,
  image,
  slug,
  sizes,
  colors,
  stockQty = 99,
}: QuickAddProps) {
  const [showSizes, setShowSizes] = useState(false);
  const { items } = useCart();

  const isAdded = items.some((item) => item.productId === productId);

  const safeSizes = sizes && sizes.length > 0 ? sizes : ['OS'];
  const safeColors = colors && colors.length > 0 ? colors : ['Default'];

  const handleInitialClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isAdded) return;

    if (stockQty <= 0) {
      toast.error('Out of stock');
      return;
    }

    if (safeSizes.length === 1 && safeSizes[0] === 'OS') {
      addToCart(safeSizes[0]);
    } else {
      setShowSizes(true);
    }
  };

  const addToCart = (selectedSize: string) => {
    const selectedColor = safeColors[0];

    cartStore.addItem({
      productId,
      name,
      price,
      image,
      slug,
      selectedSize,
      selectedColor,
      quantity: 1,
    });

    toast.success(`${name} (${selectedSize}) added to bag`);
    setShowSizes(false);
  };

  return (
    <div
      className={`absolute bottom-3 left-3 right-3 z-20 transition-all duration-300 ${showSizes ? 'translate-y-0 opacity-100' : 'translate-y-[calc(100%+12px)] opacity-0 group-hover:translate-y-0 group-hover:opacity-100'
        }`}
    >
      {showSizes ? (
        <div
          className="bg-background/95 backdrop-blur-md p-3 border border-border/50 flex flex-col gap-2 rounded-sm shadow-lg"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <div className="flex justify-between items-center mb-1 px-1">
            <span className="text-[10px] uppercase tracking-widest font-bold text-foreground">Select Size</span>
            <button onClick={() => setShowSizes(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {safeSizes.map((size) => (
              <button
                key={size}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  addToCart(size);
                }}
                className="border border-foreground/20 hover:border-foreground hover:bg-foreground hover:text-background text-[10px] uppercase font-bold min-w-[36px] h-9 px-2 transition-all flex items-center justify-center"
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={handleInitialClick}
          disabled={stockQty <= 0 || isAdded}
          className="w-full bg-black/95 backdrop-blur-sm text-white hover:bg-black disabled:opacity-90 disabled:text-gray-400 disabled:cursor-not-allowed text-[11px] uppercase tracking-[0.15em] font-bold py-3.5 px-3 transition-all flex items-center justify-center gap-2 rounded-sm shadow-md"
        >
          {isAdded ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Added
            </>
          ) : stockQty <= 0 ? (
            'Out of Stock'
          ) : (
            <>
              <ShoppingBag className="w-3.5 h-3.5" />
              Add to Bag
            </>
          )}
        </button>
      )}
    </div>
  );
}
