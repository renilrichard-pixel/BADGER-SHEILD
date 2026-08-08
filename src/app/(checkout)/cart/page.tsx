'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Minus, Plus, X, ArrowRight, ShoppingBag, Package } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/lib/hooks/use-cart';
import { toast } from 'sonner';

export default function CartPage() {
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    toggleSelection,
    isLoading,
    isAuthenticated,
  } = useCart();
  const router = useRouter();

  const selectedItems = items.filter((item) => item.selected !== false);
  
  const subtotal = selectedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const shipping = 0;
  const total = subtotal + shipping;

  const allSelected = items.length > 0 && items.every((item) => item.selected !== false);

  const handleSelectAllToggle = () => {
    items.forEach((item) => {
      if ((item.selected !== false) === allSelected) {
        toggleSelection(item.cartId);
      }
    });
  };

  const handleCheckoutClick = () => {
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to checkout');
      return;
    }
    router.push('/checkout');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-24 md:py-32 max-w-6xl flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Securing your collection...</p>
        </div>
      </div>
    );
  }



  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 md:py-32 max-w-md text-center">
        <div className="flex justify-center mb-6">
          <ShoppingBag className="w-16 h-16 text-muted-foreground stroke-[1]" />
        </div>
        <h1 className="text-2xl font-bold uppercase tracking-wider mb-4">Your Bag is Empty</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Discover the latest arrivals in our curated collections.
        </p>
        <Button 
          size="lg" 
          className="w-full rounded-none uppercase tracking-widest h-14" 
          onClick={() => router.push('/products')}
        >
          Explore Collections
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 md:py-24 max-w-6xl pb-28 md:pb-24 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-12 border-b border-border/40 pb-6">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase">Shopping Bag</h1>
        <span className="text-[10px] sm:text-xs uppercase tracking-widest font-semibold text-muted-foreground">
          {selectedItems.length} of {items.length} {items.length === 1 ? 'Piece' : 'Pieces'} Selected
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Cart Items List */}
        <div className="flex-1 space-y-8">
          <div className="flex justify-between items-center mb-6 border-b border-border/40 pb-3">
            <button 
              onClick={handleSelectAllToggle}
              className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
            >
              <div className={`w-4 h-4 border flex items-center justify-center transition-colors ${allSelected ? 'bg-foreground border-foreground text-background' : 'border-border hover:border-foreground/40'}`}>
                {allSelected && <span className="text-[10px] font-bold">✓</span>}
              </div>
              {allSelected ? "Deselect All" : "Select All"}
            </button>
          </div>

          <div className="space-y-8">
            {items.map((item) => (
              <div 
                key={item.cartId} 
                className={`flex gap-3 sm:gap-6 relative group transition-opacity duration-300 ${item.selected === false ? 'opacity-40' : ''}`}
              >
                {/* Selection Checkbox */}
                <div className="flex items-center">
                  <button 
                    onClick={() => toggleSelection(item.cartId)}
                    className={`w-5 h-5 sm:w-6 sm:h-6 border flex items-center justify-center transition-colors shrink-0 ${item.selected !== false ? 'bg-foreground border-foreground text-background' : 'border-border hover:border-foreground/45'}`}
                    aria-label={item.selected !== false ? "Deselect item" : "Select item"}
                  >
                    {item.selected !== false && <span className="text-[10px] sm:text-xs">✓</span>}
                  </button>
                </div>

                {/* Visual */}
                <Link href={`/products/${item.slug}`} className="block w-20 h-28 sm:w-28 sm:h-36 md:w-32 md:h-40 bg-muted shrink-0 relative overflow-hidden">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="(max-width: 640px) 80px, (max-width: 768px) 112px, 128px"
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                      loading="lazy"
                      quality={70}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Package className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 hidden md:flex w-full h-full items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 backdrop-blur-[2px]">
                    <span className="text-[9px] uppercase tracking-widest text-foreground border border-foreground px-3 py-1.5 bg-background/80">
                      View Piece
                    </span>
                  </div>
                </Link>

                {/* Details */}
                <div className="flex flex-col flex-1 justify-between py-1 min-w-0">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base md:text-lg leading-tight hover:underline underline-offset-4 truncate sm:whitespace-normal">
                        <Link href={`/products/${item.slug}`}>{item.name}</Link>
                      </h3>
                      <p className="text-muted-foreground text-[10px] sm:text-xs mt-1.5 uppercase tracking-wider">
                        {item.selectedColor} / {item.selectedSize}
                      </p>
                    </div>
                    <p className="font-bold text-sm sm:text-base md:text-lg shrink-0">₹{(item.price * item.quantity).toLocaleString()}</p>
                  </div>

                  <div className="flex justify-between items-end mt-4">
                    {/* Quantity */}
                    <div className="flex items-center border border-border w-fit">
                      <button
                        onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                        className="px-2 py-1 sm:px-3 sm:py-1.5 hover:bg-muted transition-colors disabled:opacity-30"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </button>
                      <span className="w-6 sm:w-8 text-center text-[10px] sm:text-xs font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                        className="px-2 py-1 sm:px-3 sm:py-1.5 hover:bg-muted transition-colors"
                      >
                        <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </button>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeItem(item.cartId)}
                      className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                    >
                      <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-8" />

          <div className="pt-4 flex justify-between items-center">
            <Link href="/products" className="text-xs uppercase tracking-widest hover:underline underline-offset-4 font-semibold">
              Continue Shopping
            </Link>
            <button
              onClick={clearCart}
              className="text-xs uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors font-semibold"
            >
              Empty Bag
            </button>
          </div>
        </div>

        {/* Order Summary */}
        <div className="w-full lg:w-[400px]">
          <div className="bg-muted/30 p-8 border border-border">
            <h2 className="text-lg font-bold uppercase tracking-wider mb-6">Order Summary</h2>

            <div className="space-y-4 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium">
                  {selectedItems.length === 0 ? '—' : 'Complimentary'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>₹{selectedItems.length === 0 ? '0' : total.toLocaleString()}</span>
              </div>
            </div>

            <Button 
              className="w-full rounded-none uppercase tracking-widest h-14" 
              size="lg" 
              onClick={handleCheckoutClick}
            >
              Proceed to Secure Checkout <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <div className="mt-6 space-y-3">
              <p className="text-[10px] text-muted-foreground text-center uppercase tracking-widest opacity-60">
                Complimentary Returns within 14 days
              </p>
              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-2 opacity-40">
                Secure Checkout
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar - Flipkart Style */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border/60 p-4 flex items-center justify-between z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Amount</p>
          <p className="text-lg font-bold">₹{selectedItems.length === 0 ? '0' : total.toLocaleString()}</p>
        </div>
        <Button
          onClick={handleCheckoutClick}
          className="px-6 py-3 text-xs font-bold uppercase tracking-widest rounded-none h-11"
        >
          Place Order
        </Button>
      </div>
    </div>
  );
}

