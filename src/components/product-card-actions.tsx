'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cartStore } from '@/lib/cart-store';
import { saveBuyNowItem } from '@/lib/buy-now';
import { requireAuth } from '@/lib/require-auth';
import { getFirstAvailableSize, getSizeStockQuantity, getTotalStock, type SizeStockEntry } from '@/lib/sizeStock';

interface ProductCardActionsProps {
  productId: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  sizes?: string[] | null;
  colors?: string[] | null;
  sizeStock?: SizeStockEntry[] | null;
  stockQty?: number;
}

export function ProductCardActions({ productId, name, slug, price, image, sizes, colors, sizeStock, stockQty = 99 }: ProductCardActionsProps) {
  const router = useRouter();
  const [showSizes, setShowSizes] = useState(false);
  const [intent, setIntent] = useState<'cart' | 'buy'>('cart');
  const safeSizes = sizes?.length ? sizes : ['OS'];
  const selectedColor = colors?.[0] || 'Default';
  const totalStock = getTotalStock(sizeStock, stockQty);

  const start = (nextIntent: 'cart' | 'buy') => {
    if (totalStock <= 0 && nextIntent === 'buy') return toast.error('Out of stock');
    setIntent(nextIntent);
    const firstSize = getFirstAvailableSize(safeSizes, sizeStock, stockQty);
    if (totalStock <= 0) return complete(firstSize || safeSizes[0], nextIntent);
    if (safeSizes.length === 1) return complete(firstSize || safeSizes[0], nextIntent);
    setShowSizes(true);
  };

  const complete = async (selectedSize: string, action = intent) => {
    if (action === 'buy' && getSizeStockQuantity(sizeStock, selectedSize, stockQty) <= 0) return toast.error(`Size ${selectedSize} is out of stock`);
    if (action === 'cart') {
      const result = await cartStore.addItem({ productId, name, slug, price, image, quantity: 1, selectedSize, selectedColor });
      if (result && !result.success) return toast.error(result.reason || 'Could not add to bag');
      toast.success(`${name} (${selectedSize}) added to bag`);
      setShowSizes(false);
      return;
    }

    saveBuyNowItem({ productId, name, slug, price, image, quantity: 1, selectedSize, selectedColor });
    const authed = await requireAuth('/checkout?buy-now=1');
    if (authed) router.push('/checkout?buy-now=1');
  };

  return (
    <div className={`absolute bottom-2 left-2 right-2 z-20 transition-all duration-300 md:translate-y-3 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 ${showSizes ? 'md:translate-y-0 md:opacity-100' : ''}`}>
      {showSizes && (
        <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-30 border border-border bg-background p-3 shadow-lg">
          <p className="mb-2 text-[9px] font-bold uppercase tracking-widest">Choose size</p>
          <div className="flex flex-wrap gap-1.5">
            {safeSizes.map((size) => {
              const unavailable = getSizeStockQuantity(sizeStock, size, stockQty) <= 0;
              return <button key={size} type="button" disabled={unavailable} onClick={() => complete(size)} className="h-8 min-w-9 border border-border px-2 text-[10px] font-bold hover:border-foreground disabled:opacity-35 disabled:line-through">{size}</button>;
            })}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" onClick={() => start('cart')} className="h-8 bg-background px-1 text-[9px] font-bold uppercase tracking-wide hover:bg-muted">
          Add to Cart
        </button>
        <button type="button" onClick={() => start('buy')} disabled={totalStock <= 0} className="h-8 bg-foreground px-1 text-[9px] font-bold uppercase tracking-wide text-background hover:opacity-85 disabled:opacity-45">
          Buy Now
        </button>
      </div>
    </div>
  );
}
