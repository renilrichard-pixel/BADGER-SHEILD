'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export default function CheckoutPage() {
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotal = 8997; // Mocked from cart
  const shipping: number = 0;
  const total = subtotal + shipping;

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Mocking Razorpay flow
    setTimeout(() => {
      setIsProcessing(false);
      toast.success('Payment Successful', {
        description: 'Your order has been placed successfully.'
      });
      // In a real app, redirect to success page
    }, 2000);
  };

  return (
    <div className="container mx-auto px-4 py-12 md:py-16 max-w-6xl">
      <div className="mb-8">
        <Link href="/cart" className="text-sm font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground">
          &larr; Back to Cart
        </Link>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-12 lg:gap-24">
        
        {/* Checkout Form */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tighter uppercase mb-8">Checkout</h1>
          
          <form onSubmit={handlePayment} className="space-y-10">
            {/* Contact Info */}
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-4">Contact Information</h2>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" required className="rounded-none" />
                </div>
              </div>
            </section>
            
            <Separator />
            
            {/* Shipping Address */}
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-4">Shipping Address</h2>
              <div className="grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="firstName" className="text-xs uppercase tracking-wider text-muted-foreground">First Name</Label>
                    <Input id="firstName" required className="rounded-none" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lastName" className="text-xs uppercase tracking-wider text-muted-foreground">Last Name</Label>
                    <Input id="lastName" required className="rounded-none" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address" className="text-xs uppercase tracking-wider text-muted-foreground">Address</Label>
                  <Input id="address" required className="rounded-none" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="city" className="text-xs uppercase tracking-wider text-muted-foreground">City</Label>
                    <Input id="city" required className="rounded-none" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="postalCode" className="text-xs uppercase tracking-wider text-muted-foreground">Postal Code</Label>
                    <Input id="postalCode" required className="rounded-none" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone" className="text-xs uppercase tracking-wider text-muted-foreground">Phone</Label>
                  <Input id="phone" type="tel" required className="rounded-none" />
                </div>
              </div>
            </section>

            <Button 
              type="submit" 
              className="w-full rounded-none uppercase tracking-widest h-14" 
              size="lg"
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : `Pay ₹${total.toLocaleString()}`}
            </Button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="w-full lg:w-[400px]">
          <div className="bg-muted/30 p-6 md:p-8 border border-border sticky top-24">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-6">Order Summary</h2>
            
            {/* Mock Items list */}
            <div className="space-y-4 mb-6">
              <div className="flex gap-4">
                <div className="w-16 h-20 bg-muted relative shrink-0">
                  <span className="absolute -top-2 -right-2 bg-foreground text-background w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-medium">
                    1
                  </span>
                </div>
                <div className="flex-1 py-1">
                  <h4 className="text-sm font-medium">Premium Heavyweight Oversized Tee</h4>
                  <p className="text-xs text-muted-foreground mt-1">Black / M</p>
                  <p className="text-sm font-medium mt-1">₹1,999</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-16 h-20 bg-muted relative shrink-0">
                   <span className="absolute -top-2 -right-2 bg-foreground text-background w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-medium">
                    2
                  </span>
                </div>
                <div className="flex-1 py-1">
                  <h4 className="text-sm font-medium">Essential Minimalist Hoodie</h4>
                  <p className="text-xs text-muted-foreground mt-1">Light Gray / L</p>
                  <p className="text-sm font-medium mt-1">₹6,998</p>
                </div>
              </div>
            </div>

            <Separator className="my-4" />
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium">{shipping === 0 ? 'Free' : `₹${shipping.toLocaleString()}`}</span>
              </div>
              <Separator className="my-4" />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>₹{total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
