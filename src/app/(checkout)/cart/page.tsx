import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Minus, Plus, X, ArrowRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function CartPage() {
  // Mock cart items (in a real app, this comes from context or local storage)
  const cartItems = [
    { cartId: 'c1', name: 'Premium Heavyweight Oversized Tee', slug: 'premium-heavyweight-oversized-tee', price: 1999, quantity: 1, selectedSize: 'M', selectedColor: 'Black', images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000&auto=format&fit=crop'] },
    { cartId: 'c2', name: 'Essential Minimalist Hoodie', slug: 'essential-minimalist-hoodie', price: 3499, quantity: 2, selectedSize: 'L', selectedColor: 'Light Gray', images: ['https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=1000&auto=format&fit=crop'] }
  ];

  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const shipping = subtotal > 5000 ? 0 : 250;
  const total = subtotal + shipping;

  return (
    <div className="container mx-auto px-4 py-12 md:py-24 max-w-6xl">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase mb-12">Shopping Bag</h1>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Cart Items */}
        <div className="flex-1 space-y-8">
          {cartItems.map((item) => (
            <div key={item.cartId} className="flex gap-3 sm:gap-6 relative group">
              <Link href={`/products/${item.slug}`} className="block w-20 h-28 sm:w-28 sm:h-36 md:w-32 md:h-40 bg-muted shrink-0">
                <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover grayscale" />
              </Link>
              
              <div className="flex flex-col flex-1 justify-between py-1 min-w-0">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <h3 className="font-medium text-xs sm:text-sm md:text-base leading-tight hover:underline underline-offset-4 truncate sm:whitespace-normal">
                      <Link href={`/products/${item.slug}`}>{item.name}</Link>
                    </h3>
                    <p className="text-muted-foreground text-[10px] sm:text-xs mt-1 uppercase tracking-wider">
                      {item.selectedColor} / {item.selectedSize}
                    </p>
                  </div>
                  <p className="font-semibold text-xs sm:text-sm md:text-base shrink-0">₹{(item.price * item.quantity).toLocaleString()}</p>
                </div>
                
                <div className="flex justify-between items-end mt-4">
                  <div className="flex items-center border border-border w-fit">
                    <button className="px-2 py-1 sm:px-3 sm:py-1.5 hover:bg-muted transition-colors">
                      <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </button>
                    <span className="w-6 sm:w-8 text-center text-[10px] sm:text-xs font-medium">{item.quantity}</span>
                    <button className="px-2 py-1 sm:px-3 sm:py-1.5 hover:bg-muted transition-colors">
                      <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </button>
                  </div>
                  <button className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
                    <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}

          <Separator className="my-8" />
          
          <div className="flex justify-between items-center">
            <Link href="/products" className="text-sm font-medium uppercase tracking-widest hover:underline underline-offset-4">
              Continue Shopping
            </Link>
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
                <span className="font-medium">{shipping === 0 ? 'Free' : `₹${shipping.toLocaleString()}`}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>₹{total.toLocaleString()}</span>
              </div>
            </div>

            <Button className="w-full rounded-none uppercase tracking-widest h-14" size="lg" render={<Link href="/checkout" />} nativeButton={false}>
              Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            
            <div className="mt-6 space-y-3">
              <p className="text-xs text-muted-foreground text-center">
                Taxes and shipping calculated at checkout.
              </p>
              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
                 Secure Checkout
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
