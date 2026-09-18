'use client';

import React, { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Lock, MapPin, CreditCard, RotateCcw, Package, User, Plus } from 'lucide-react';
import { useCart } from '@/lib/hooks/use-cart';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import PaymentSelector from '@/components/checkout/PaymentSelector';
import { BRAND_POLICIES } from '@/lib/policies';
import { clearBuyNowItem, readBuyNowItem } from '@/lib/buy-now';
import type { CartItem } from '@/lib/cart-store';

declare global {
  interface Window { Razorpay: any; }
}

type PayMethod = 'upi' | 'netbanking';

interface Address {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  is_default?: boolean;
}

const ACTIVE_KEY = 'bs_active_payment';

interface ActivePayment {
  orderId?: string;
  razorpayOrderId?: string;
  cartIds?: string[];
}

function saveActive(d: ActivePayment) { try { localStorage.setItem(ACTIVE_KEY, JSON.stringify(d)); } catch {} }
function readActive(): ActivePayment | null { try { const r = localStorage.getItem(ACTIVE_KEY); return r ? JSON.parse(r) : null; } catch { return null; } }
function clearActive() { try { localStorage.removeItem(ACTIVE_KEY); } catch {} }

function CheckoutContent() {
  const { items, removeItem, updateQuantity, removeMultipleFromCart, isAuthenticated, isLoading } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isBuyNow = searchParams.get('buy-now') === '1';

  const [user, setUser] = useState<any>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddr, setSelectedAddr] = useState<string | null>(null);
  const [loadingAddr, setLoadingAddr] = useState(true);
  const [payMethod, setPayMethod] = useState<PayMethod>('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [rzpReady, setRzpReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeCartIds, setActiveCartIds] = useState<string[]>([]);
  const [polling, setPolling] = useState(false);
  const finalizing = useRef(false);
  const [buyNowItem, setBuyNowItem] = useState<CartItem | null>(null);
  const [buyNowReady, setBuyNowReady] = useState(!isBuyNow);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [guestForm, setGuestForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  useEffect(() => {
    if (user?.email && !guestForm.email) {
      setGuestForm(prev => ({ ...prev, email: user.email }));
    }
  }, [user, guestForm.email]);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      setRzpReady(true);
    }
  }, []);

  const selectedItems = buyNowItem ? [buyNowItem] : items.filter(i => i.selected !== false);
  const isPrebookOrder = Boolean(searchParams.get('prebook') === '1' || buyNowItem?.isPrebook || selectedItems.some(i => i.isPrebook));
  
  const fullOrderValue = selectedItems.reduce((s, i) => s + (i.fullPrice || i.price) * i.quantity, 0);
  const prebookAdvanceTotal = isPrebookOrder
    ? selectedItems.reduce((s, i) => {
        const adv = i.prebookAdvanceAmount || buyNowItem?.prebookAdvanceAmount;
        return s + (adv ? adv * i.quantity : i.price * i.quantity);
      }, 0)
    : 0;
  const prebookBalanceDue = isPrebookOrder ? Math.max(0, fullOrderValue - prebookAdvanceTotal) : 0;

  const subtotal = selectedItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = isPrebookOrder ? 0 : BRAND_POLICIES.SHIPPING.FEE;
  const total = isPrebookOrder ? prebookAdvanceTotal : subtotal + shipping;

  useEffect(() => {
    if (!isBuyNow) {
      setBuyNowItem(null);
      setBuyNowReady(true);
      return;
    }
    setBuyNowItem(readBuyNowItem());
    setBuyNowReady(true);
  }, [isBuyNow]);

  /* ── Auth & user ── */
  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = sb.auth.onAuthStateChange((_, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  /* ── Addresses ── */
  useEffect(() => {
    if (!user) { setLoadingAddr(false); return; }
    const sb = createClient();
    async function loadAddresses() {
      try {
        const { data } = await sb.from('user_addresses').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        const list = data ?? [];
        setAddresses(list);
        const def = list.find(a => a.is_default);
        setSelectedAddr(def ? def.id : list[0]?.id ?? null);
      } catch (err) {
        console.error('Failed to load user addresses:', err);
      } finally {
        setLoadingAddr(false);
      }
    }
    loadAddresses();
  }, [user]);

  /* ── Recover active payment on mount ── */
  useEffect(() => {
    const ap = readActive();
    if (ap?.orderId) {
      setActiveOrderId(ap.orderId);
      setActiveCartIds(Array.isArray(ap.cartIds) ? ap.cartIds : []);
      setPolling(true);
      setIsProcessing(true);
      toast.loading('Checking payment status…', { id: 'pay-verify' });
    }
  }, []);

  /* ── Poll order status ── */
  useEffect(() => {
    if (!polling || !activeOrderId || !isAuthenticated) return;
    const check = async () => {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return;

      try {
        const { data: order } = await sb.from('orders').select('*').eq('order_id', activeOrderId).maybeSingle();
        if (order?.status === 'confirmed') {
          clearActive();
          setPolling(false);
          setIsProcessing(false);
          setActiveOrderId(null);
          localStorage.setItem('lastOrder', JSON.stringify(order));
          toast.success('Payment confirmed!', { id: 'pay-verify' });
          if (buyNowItem) {
            clearBuyNowItem();
          } else {
            const cartIdsToRemove = activeCartIds.length > 0 ? activeCartIds : selectedItems.map(i => i.cartId);
            await removeMultipleFromCart(cartIdsToRemove);
          }
          router.replace('/order-confirmation');
        }
      } catch { /* retry next tick */ }
    };

    check();
    const timer = setInterval(check, 3000);
    const timeout = setTimeout(() => {
      clearInterval(timer);
      if (isProcessing) {
        clearActive(); setPolling(false); setIsProcessing(false);
        setActiveOrderId(null);
        setActiveCartIds([]);
        toast.dismiss('pay-verify');
        toast.warning('Payment still pending — contact support if amount was deducted.');
      }
    }, 120_000);

    return () => { clearInterval(timer); clearTimeout(timeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling, activeOrderId, isAuthenticated]);

  const resetCheckout = useCallback(() => {
    clearActive(); finalizing.current = false;
    setIsProcessing(false); setPolling(false);
    setActiveOrderId(null);
    setActiveCartIds([]);
    toast.dismiss('pay-verify');
    toast.success('Reset. You can try again.');
  }, []);

const loadRazorpayScript = () => {
  return new Promise<boolean>((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

  /* ── Launch Razorpay ── */
  const launchRazorpay = useCallback(async () => {
    if (!window.Razorpay) {
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        toast.error('Payment gateway could not be loaded. Please check your internet or ad-blocker and try again.');
        return;
      }
    }
    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      toast.error('Razorpay public key not configured. Add NEXT_PUBLIC_RAZORPAY_KEY_ID to your env file.');
      return;
    }

    const usingSavedAddr = Boolean(user && addresses.length > 0 && !useNewAddress);
    const addr = usingSavedAddr ? addresses.find(a => a.id === selectedAddr) : null;

    if (usingSavedAddr && !addr) {
      toast.error('Select a delivery address first.');
      return;
    }

    if (!usingSavedAddr) {
      if (!guestForm.first_name.trim()) {
        toast.error('Please enter your first name.');
        const el = document.getElementById('checkout-first-name');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus();
        return;
      }
      if (!guestForm.email.trim() || !guestForm.email.includes('@')) {
        toast.error('Please enter a valid email address.');
        const el = document.getElementById('checkout-email');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus();
        return;
      }
      if (!guestForm.phone.trim() || guestForm.phone.trim().length < 8) {
        toast.error('Please enter a valid phone number (at least 10 digits).');
        const el = document.getElementById('checkout-phone');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus();
        return;
      }
      if (!guestForm.address.trim()) {
        toast.error('Please enter your delivery street address.');
        const el = document.getElementById('checkout-address');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus();
        return;
      }
      if (!guestForm.city.trim()) {
        toast.error('Please enter your city.');
        const el = document.getElementById('checkout-city');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus();
        return;
      }
      if (!guestForm.state.trim()) {
        toast.error('Please enter your state.');
        const el = document.getElementById('checkout-state');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus();
        return;
      }
      if (!guestForm.pincode.trim()) {
        toast.error('Please enter your PIN code.');
        const el = document.getElementById('checkout-pincode');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus();
        return;
      }
    }

    setIsProcessing(true);
    finalizing.current = false;

    /* 1 — Stock check */
    const stockRes = await fetch('/api/checkout/stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: selectedItems.map(i => ({
          productId: i.productId,
          cartId: i.cartId,
          name: i.name,
          quantity: i.quantity,
          selectedSize: i.selectedSize,
        })),
      }),
    }).catch(() => null);

    if (!stockRes?.ok) {
      const err = await stockRes?.json().catch(() => ({}));
      if (err?.errors) {
        if (!buyNowItem) err.errors.forEach((e: any) => e.available <= 0 ? removeItem(e.cartId) : updateQuantity(e.cartId, e.available));
        toast.error(err.errors[0]?.reason ?? 'Some items had stock changes. Cart updated.');
      } else {
        toast.error(err?.error ?? 'Stock check failed.');
      }
      setIsProcessing(false);
      return;
    }

    /* 2 — Create Razorpay order on server */
    const rzpRes = await fetch('/api/checkout/razorpay/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: selectedItems.map(i => ({
          cartId: i.cartId,
          productId: i.productId,
          name: i.name,
          quantity: i.quantity,
          selectedSize: i.selectedSize,
          selectedColor: i.selectedColor,
          isPrebook: i.isPrebook ?? isPrebookOrder,
          prebookAdvanceAmount: i.prebookAdvanceAmount ?? buyNowItem?.prebookAdvanceAmount,
          fullPrice: i.fullPrice ?? i.price,
        })),
        isPrebook: isPrebookOrder,
        advanceAmount: prebookAdvanceTotal,
        balanceDue: prebookBalanceDue,
        ...(usingSavedAddr && addr ? { addressId: addr.id } : { guestAddress: guestForm }),
        paymentMethod: payMethod,
      }),
    }).catch(() => null);

    if (!rzpRes?.ok) {
      const err = await rzpRes?.json().catch(() => ({}));
      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!keyId) {
        toast.error('Razorpay public key not configured. Add NEXT_PUBLIC_RAZORPAY_KEY_ID to your env file.');
      } else {
        toast.error(err?.error ?? 'Could not create payment order. Try again.');
      }
      setIsProcessing(false);
      return;
    }

    const createData = await rzpRes.json();
    const rzpOrder = createData.order ?? {
      id: createData.order_id,
      amount: createData.amount,
      currency: createData.currency,
    };
    const orderId = createData.orderId;
    const purchasedCartIds = selectedItems.map(i => i.cartId);

    if (!rzpOrder?.id || !orderId) {
      toast.error('Payment order response was incomplete. Try again.');
      setIsProcessing(false);
      return;
    }

    saveActive({ orderId, razorpayOrderId: rzpOrder.id, cartIds: purchasedCartIds });
    setActiveOrderId(orderId);
    setActiveCartIds(purchasedCartIds);

    /* 4 — Open modal */
    const rzp = new window.Razorpay({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency ?? 'INR',
      name: 'BADGER SHEILD',
      description: `Order ${orderId}`,
      order_id: rzpOrder.id,
      prefill: {
        name: addr ? `${addr.first_name} ${addr.last_name}`.trim() : `${guestForm.first_name} ${guestForm.last_name}`.trim(),
        contact: addr ? (addr.phone ?? '') : guestForm.phone,
        email: addr ? (user?.email ?? '') : guestForm.email,
      },
      notes: { order_id: orderId },
      theme: { color: '#0a0a0a', hide_topbar: false },
      config: {
        display: {
          blocks: {
            [payMethod]: {
              name: payMethod === 'upi' ? 'Pay via UPI / QR Code' : 'Net Banking',
              instruments: payMethod === 'upi'
                ? [{ method: 'upi', flows: ['qr', 'intent'] }]
                : [{ method: 'netbanking' }],
            },
          },
          sequence: [`block.${payMethod}`],
          preferences: { show_default_blocks: true },
        },
      },
      handler: async (response: any) => {
        finalizing.current = true;
        setIsProcessing(true);

        /* 5 — Verify signature */
        const verifyRes = await fetch('/api/checkout/razorpay/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...response, orderId }),
        }).catch(() => null);

        if (!verifyRes?.ok) {
          const errData = await verifyRes?.json().catch(() => ({}));
          const errMsg = errData?.error ? `Verification failed: ${errData.error}` : 'Payment verification failed. Contact support.';
          toast.error(errMsg);
          setIsProcessing(false);
          return;
        }

        const verifyData = await verifyRes.json();

        if (verifyData?.verified && verifyData?.order) {
          clearActive();
          localStorage.setItem('lastOrder', JSON.stringify(verifyData.order));
          toast.success('Payment successful!');
          if (buyNowItem) clearBuyNowItem();
          else await removeMultipleFromCart(purchasedCartIds);
          router.replace('/order-confirmation');
        } else {
          toast.error('Order verification failed or incomplete. Contact support.');
          setIsProcessing(false);
        }
      },
      modal: {
        confirm_close: true,
        escape: false,
        ondismiss: () => {
          if (finalizing.current) return;
          clearActive();
          setIsProcessing(false);
          setPolling(false);
          setActiveOrderId(null);
          setActiveCartIds([]);
          toast.info('Payment cancelled. You can try again.');
        },
      },
    });

    rzp.on('payment.failed', (r: any) => {
      finalizing.current = false;
      clearActive(); setIsProcessing(false); setPolling(false);
      setActiveOrderId(null);
      setActiveCartIds([]);
      toast.error(r?.error?.description ?? 'Payment failed.');
    });

    rzp.open();
  }, [selectedAddr, addresses, selectedItems, payMethod, user, removeItem, updateQuantity, removeMultipleFromCart, router, buyNowItem, useNewAddress, guestForm]);

  const isAddressValid = (user && addresses.length > 0 && !useNewAddress)
    ? Boolean(selectedAddr)
    : Boolean(
        guestForm.first_name.trim() &&
        guestForm.phone.trim().length >= 8 &&
        guestForm.address.trim() &&
        guestForm.city.trim() &&
        guestForm.state.trim() &&
        guestForm.pincode.trim() &&
        guestForm.email.trim().includes('@')
      );

  /* ── Guards ── */
  if (!mounted || isLoading || !buyNowReady) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (selectedItems.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 text-center px-4">
      <Package className="w-10 h-10 text-muted-foreground" strokeWidth={1} />
      <h1 className="text-2xl font-bold uppercase tracking-wider">No items selected</h1>
      <Link href={isBuyNow ? '/products' : '/cart'} className="border border-foreground bg-foreground text-background px-8 py-3 text-[10px] font-black uppercase tracking-[0.3em] hover:opacity-80 transition-opacity">
        {isBuyNow ? 'Continue Shopping' : 'Return to Bag'}
      </Link>
    </div>
  );

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRzpReady(true)}
        onError={() => toast.error('Could not load Razorpay checkout. Refresh and try again.')}
      />

      <div className="min-h-screen pb-28 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-14">

          {/* Back */}
          <div className="mb-10">
            <Link href={isBuyNow ? `/products/${buyNowItem?.slug || ''}` : '/cart'} className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] font-bold text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" /> {isBuyNow ? 'Back to product' : 'Back to bag'}
            </Link>
          </div>

          {/* Page title */}
          <div className="mb-10 border-b border-border/40 pb-8">
            <p className="text-[10px] uppercase tracking-[0.45em] text-muted-foreground mb-2 font-semibold">Secure Checkout</p>
            <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-tighter">Complete Order</h1>
          </div>

          {/* Sign-in prompt for guest users */}
          {!user && (
            <div className="mb-8 border border-border/80 bg-muted/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center shrink-0 bg-background">
                  <User className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider">Have an account?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Sign in for faster checkout & saved addresses, or continue as guest below.</p>
                </div>
              </div>
              <Link
                href={`/login?next=${encodeURIComponent(isBuyNow ? '/checkout?buy-now=1' : '/checkout')}`}
                className="inline-flex items-center justify-center border border-foreground bg-foreground text-background px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] hover:opacity-85 transition-opacity whitespace-nowrap self-start sm:self-auto"
              >
                Sign In
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 items-start">

            {/* ── Left col ── */}
            <div className="space-y-8">

              {/* Step 1: Address */}
              <section>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 border border-foreground flex items-center justify-center text-[10px] font-black">1</span>
                    <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em]">
                      <MapPin className="w-3.5 h-3.5" /> Delivery Address
                    </span>
                  </div>
                  {user && addresses.length > 0 && (
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setUseNewAddress(!useNewAddress)}
                        className="text-[9px] uppercase tracking-[0.2em] font-bold text-foreground hover:underline"
                      >
                        {useNewAddress ? '← Use Saved' : '+ New Address'}
                      </button>
                      <Link href="/profile" className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground hover:text-foreground transition-colors border-b border-transparent hover:border-foreground">
                        Manage →
                      </Link>
                    </div>
                  )}
                </div>

                {loadingAddr ? (
                  <div className="border border-border/40 p-6 flex items-center gap-3">
                    <div className="w-4 h-4 border border-foreground border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-muted-foreground">Loading addresses…</span>
                  </div>
                ) : user && addresses.length > 0 && !useNewAddress ? (
                  <div className="space-y-3">
                    {addresses.map(addr => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => setSelectedAddr(addr.id)}
                        className={`w-full text-left flex items-start gap-4 p-4 border transition-all duration-150
                          ${selectedAddr === addr.id ? 'border-foreground bg-foreground/3' : 'border-border/50 hover:border-border'}`}
                      >
                        <span className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center
                          ${selectedAddr === addr.id ? 'border-foreground' : 'border-border'}`}>
                          {selectedAddr === addr.id && <span className="w-2 h-2 rounded-full bg-foreground block" />}
                        </span>
                        <div>
                          <p className="text-sm font-bold">{addr.first_name} {addr.last_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {addr.address}, {addr.city}, {addr.state} – {addr.pincode}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1 font-mono">{addr.phone}</p>
                        </div>
                        {addr.is_default && (
                          <span className="ml-auto text-[8px] font-black uppercase tracking-widest bg-muted px-1.5 py-0.5 self-start">Default</span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4 border border-border/60 bg-muted/5 p-5">
                    <div className="flex items-center justify-between border-b border-border/40 pb-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-foreground">
                        {!user ? 'Guest Shipping Details' : 'New Delivery Address'}
                      </p>
                      {!user && (
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                          No password required
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">First Name *</label>
                        <input
                          id="checkout-first-name"
                          type="text"
                          value={guestForm.first_name}
                          onChange={(e) => setGuestForm(prev => ({ ...prev, first_name: e.target.value }))}
                          placeholder="e.g. Rahul"
                          className="w-full border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Last Name</label>
                        <input
                          id="checkout-last-name"
                          type="text"
                          value={guestForm.last_name}
                          onChange={(e) => setGuestForm(prev => ({ ...prev, last_name: e.target.value }))}
                          placeholder="e.g. Sharma"
                          className="w-full border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Email Address *</label>
                        <input
                          id="checkout-email"
                          type="email"
                          value={guestForm.email}
                          onChange={(e) => setGuestForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="e.g. rahul@example.com"
                          className="w-full border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground"
                          required
                        />
                        <span className="text-[9px] text-muted-foreground mt-1 block">Order invoice & tracking link will be sent here</span>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Phone Number *</label>
                        <input
                          id="checkout-phone"
                          type="tel"
                          value={guestForm.phone}
                          onChange={(e) => setGuestForm(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="e.g. +91 98765 43210"
                          className="w-full border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground"
                          required
                        />
                        <span className="text-[9px] text-muted-foreground mt-1 block">For delivery coordination</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Street Address / House / Flat *</label>
                      <input
                        id="checkout-address"
                        type="text"
                        value={guestForm.address}
                        onChange={(e) => setGuestForm(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="e.g. Flat 402, Green Valley Apartments, MG Road"
                        className="w-full border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">City *</label>
                        <input
                          id="checkout-city"
                          type="text"
                          value={guestForm.city}
                          onChange={(e) => setGuestForm(prev => ({ ...prev, city: e.target.value }))}
                          placeholder="e.g. Mumbai"
                          className="w-full border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">State *</label>
                        <input
                          id="checkout-state"
                          type="text"
                          value={guestForm.state}
                          onChange={(e) => setGuestForm(prev => ({ ...prev, state: e.target.value }))}
                          placeholder="e.g. Maharashtra"
                          className="w-full border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">PIN Code *</label>
                        <input
                          id="checkout-pincode"
                          type="text"
                          value={guestForm.pincode}
                          onChange={(e) => setGuestForm(prev => ({ ...prev, pincode: e.target.value }))}
                          placeholder="e.g. 400001"
                          className="w-full border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Step 2: Payment */}
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-6 h-6 border border-foreground flex items-center justify-center text-[10px] font-black">2</span>
                  <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em]">
                    <CreditCard className="w-3.5 h-3.5" /> Payment Method
                  </span>
                </div>
                <PaymentSelector value={payMethod} onChange={setPayMethod} />
              </section>

              {/* Desktop CTA */}
              <button
                onClick={launchRazorpay}
                disabled={isProcessing}
                className="hidden md:flex w-full items-center justify-center gap-3 bg-foreground text-background py-4 text-[11px] font-black uppercase tracking-[0.3em] hover:opacity-85 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isProcessing
                  ? <><div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" /> Processing…</>
                  : isPrebookOrder
                    ? <><Lock className="w-3.5 h-3.5" /> Pay Advance ₹{total.toLocaleString()} (Pre-Book)</>
                    : <><Lock className="w-3.5 h-3.5" /> Pay ₹{total.toLocaleString()}</>
                }
              </button>

              {isProcessing && (
                <p className="hidden md:block text-center text-[9px] uppercase tracking-widest text-muted-foreground">
                  Stuck?{' '}
                  <button onClick={resetCheckout} className="text-foreground font-black underline underline-offset-2">
                    <RotateCcw className="w-2.5 h-2.5 inline mr-0.5" /> Reset & Retry
                  </button>
                </p>
              )}
            </div>

            {/* ── Right col: Order summary ── */}
            <div className="lg:sticky lg:top-24">
              <div className="border border-border/50 bg-muted/10">
                <div className="px-5 py-4 border-b border-border/40">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                    Order Summary ({selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'})
                  </p>
                </div>

                {/* Items */}
                <div className="p-5 space-y-4 max-h-64 overflow-y-auto">
                  {selectedItems.map(item => (
                    <div key={item.cartId} className="flex gap-3">
                      <div className="w-14 h-18 bg-muted shrink-0 relative overflow-hidden" style={{ minHeight: '3.5rem' }}>
                        {item.image
                          ? <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              sizes="56px"
                              className="w-full h-full object-cover"
                              loading="lazy"
                              quality={65}
                            />
                          : <Package className="absolute inset-0 m-auto w-5 h-5 text-muted-foreground/30" />
                        }
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-foreground text-background rounded-full text-[9px] font-black flex items-center justify-center">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold leading-snug truncate">{item.name}</p>
                        {(item.selectedSize || item.selectedColor) && (
                          <p className="text-[9px] text-muted-foreground mt-0.5 uppercase tracking-wider">
                            {[item.selectedSize && `Size: ${item.selectedSize}`, item.selectedColor && `Color: ${item.selectedColor}`].filter(Boolean).join(' / ')}
                          </p>
                        )}
                        <p className="text-xs font-bold mt-1">₹{(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="px-5 py-4 border-t border-border/40 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{isPrebookOrder ? 'Total Product Value' : 'Subtotal'}</span>
                    <span className="font-semibold">₹{(isPrebookOrder ? fullOrderValue : subtotal).toLocaleString()}</span>
                  </div>

                  {!isPrebookOrder && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="font-semibold">{BRAND_POLICIES.SHIPPING.LABEL}</span>
                    </div>
                  )}

                  {isPrebookOrder && (
                    <>
                      <div className="flex justify-between text-xs text-amber-500 font-bold">
                        <span>Pre-Book Advance Payable Now</span>
                        <span>₹{prebookAdvanceTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Balance Due on Delivery</span>
                        <span>₹{prebookBalanceDue.toLocaleString()}</span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between text-sm font-bold pt-3 border-t border-border/40">
                    <span>{isPrebookOrder ? 'Payable Now (Advance)' : 'Total'}</span>
                    <span className={`text-base ${isPrebookOrder ? 'text-amber-500 font-black' : ''}`}>
                      ₹{total.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[9px] text-muted-foreground text-right">
                    {isPrebookOrder
                      ? '★ Balance to be collected upon order fulfillment/delivery'
                      : BRAND_POLICIES.SHIPPING.TEXT}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border/60 p-4 flex items-center justify-between z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div>
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
            {isPrebookOrder ? 'Advance Payable' : 'Total'}
          </p>
          <p className="text-xl font-bold tabular-nums">₹{total.toLocaleString()}</p>
        </div>
        <button
          onClick={isProcessing ? resetCheckout : launchRazorpay}
          disabled={isProcessing}
          className={`flex items-center gap-2 px-7 py-3.5 text-[10px] font-black uppercase tracking-[0.25em] transition-all disabled:opacity-40
            ${isProcessing ? 'bg-muted text-foreground border border-foreground' : 'bg-foreground text-background hover:opacity-85'}`}
        >
          {isProcessing
            ? <><RotateCcw className="w-3 h-3" /> Reset</>
            : isPrebookOrder
              ? <><Lock className="w-3.5 h-3.5" /> Pay Advance</>
              : <><Lock className="w-3 h-3" /> Pay Now</>
          }
        </button>
      </div>
    </>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
