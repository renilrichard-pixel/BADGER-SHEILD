'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useWishlist } from '@/lib/hooks/use-wishlist';
import { useCart } from '@/lib/hooks/use-cart';
import { Button } from '@/components/ui/button';
import { Heart, Loader2, ShieldCheck, ShoppingBag, Trash2, ArrowRight, Package } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export default function WishlistPage() {
  const {
    wishlist,
    removeFromWishlist,
    isAuthenticated,
    isLoading,
  } = useWishlist();
  const { cartItems } = useCart();
  const router = useRouter();

  const isInCart = (item: { productId: string }) => {
    return cartItems.some((cartItem) => String(cartItem.productId) === String(item.productId));
  };

  const formatPrice = (price: number) => {
    const numericPrice = Number(price) || 0;
    return numericPrice.toLocaleString('en-IN', {
      maximumFractionDigits: numericPrice % 1 === 0 ? 0 : 2,
    });
  };

  const handleRemove = (item: { productId: string; name: string }) => {
    removeFromWishlist(item.productId);
    toast.success(`Removed "${item.name}" from wishlist`);
  };

  const handleAddToCart = (item: {
    productId: string;
    slug: string;
    name: string;
    image: string;
    price: number;
  }) => {
    if (isInCart(item)) {
      router.push('/cart');
      return;
    }

    toast.info('Choose size and color before adding to bag.');
    router.push(`/products/${item.slug}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-24 md:py-32 max-w-6xl flex justify-center items-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-foreground mb-6 mx-auto" />
          <p className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-40">
            Loading your saved picks...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-24 md:py-32 max-w-md text-center animate-in fade-in duration-300">
        <Heart size={40} className="mx-auto text-primary mb-6" />
        <h1 className="text-2xl font-bold uppercase tracking-wider mb-4">
          Exclusive Access
        </h1>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          Please sign in to view and manage your wishlist.
        </p>
        <Button
          size="lg"
          className="w-full rounded-none uppercase tracking-widest h-14"
          onClick={() => router.push('/login?next=/wishlist')}
        >
          Authenticate
        </Button>
      </div>
    );
  }

  // Empty wishlist
  if (wishlist.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 md:py-32 max-w-md text-center animate-in fade-in duration-300">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-foreground">
          <Heart size={30} />
        </div>
        <h1 className="text-2xl font-bold uppercase tracking-wider mb-4">
          Your Wishlist is Empty
        </h1>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          Save the pieces you love and return anytime.
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
      {/* Header */}
      <div className="flex justify-between items-center mb-12 border-b border-border/40 pb-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-40 mb-1">
            Saved Items
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase">
            My Wishlist
          </h1>
        </div>
        <div className="flex items-center gap-2 border border-border bg-background px-4 py-2 text-foreground font-semibold">
          <Heart size={16} className="fill-current text-foreground" />
          <span className="text-xs uppercase tracking-widest opacity-60">
            {wishlist.length} {wishlist.length === 1 ? 'Piece' : 'Pieces'} Saved
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Wishlist Items List */}
        <div className="flex-1 space-y-8">
          <div className="space-y-8">
            {wishlist.map((item) => {
              const productKey = item.productId;
              const itemInCart = isInCart(item);

              return (
                <div
                  key={productKey}
                  className="flex gap-4 sm:gap-6 relative group transition-opacity duration-300 border border-border/50 p-4 bg-card"
                >
                  {/* Visual */}
                  <Link
                    href={`/products/${item.slug}`}
                    className="block w-20 h-28 sm:w-28 sm:h-36 md:w-32 md:h-40 bg-muted shrink-0 relative overflow-hidden"
                  >
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 80px, (max-width: 768px) 112px, 128px"
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
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
                          Complimentary Delivery
                        </p>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemove(item)}
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors cursor-pointer"
                        aria-label="Remove from wishlist"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="flex justify-between items-end mt-4">
                      <div>
                        <p className="font-bold text-sm sm:text-base md:text-lg">
                          ₹{formatPrice(item.price)}
                        </p>
                      </div>

                      <Button
                        onClick={() => handleAddToCart(item)}
                        className={`rounded-none uppercase tracking-widest text-[10px] font-bold h-10 px-6 cursor-pointer ${
                          itemInCart
                            ? 'bg-transparent text-primary hover:bg-muted border border-border'
                            : ''
                        }`}
                      >
                        <ShoppingBag size={12} className="mr-2 h-3.5 w-3.5" />
                        {itemInCart ? 'View Bag' : 'Add To Bag'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Separator className="my-8" />

          <div className="pt-4">
            <Link
              href="/products"
              className="text-xs uppercase tracking-widest hover:underline underline-offset-4 font-semibold"
            >
              Continue Shopping
            </Link>
          </div>
        </div>

        {/* Wishlist Summary Sidebar */}
        <div className="w-full lg:w-[400px]">
          <div className="bg-muted/30 p-8 border border-border">
            <h2 className="text-lg font-bold uppercase tracking-wider mb-6">
              Wishlist Summary
            </h2>

            <div className="space-y-4 text-sm mb-6">
              <div className="flex justify-between pb-4 border-b border-border">
                <span className="text-muted-foreground font-medium">Saved Items</span>
                <span className="font-bold">{wishlist.length}</span>
              </div>
              <div className="flex items-start gap-3 text-muted-foreground py-2">
                <ShieldCheck size={18} className="shrink-0 text-foreground" />
                <p className="text-xs leading-relaxed">
                  Your favourites stay synced with your account across all devices.
                </p>
              </div>
            </div>

            <Button
              className="w-full rounded-none uppercase tracking-widest h-14"
              size="lg"
              onClick={() => router.push('/products')}
            >
              Shop More Pieces <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border/60 p-4 flex items-center justify-between z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {wishlist.length} {wishlist.length === 1 ? 'Item' : 'Items'} Saved
          </p>
          <p className="text-xs font-semibold">Keep browsing new arrivals</p>
        </div>
        <Button
          onClick={() => router.push('/products')}
          className="px-6 py-3 text-xs font-bold uppercase tracking-widest rounded-none h-11"
        >
          Explore More
        </Button>
      </div>
    </div>
  );
}
