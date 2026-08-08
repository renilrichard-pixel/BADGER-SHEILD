'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Lock, MapPin, CreditCard, RotateCcw, Package } from 'lucide-react';
import { useCart } from '@/lib/hooks/use-cart';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import PaymentSelector from '@/components/checkout/PaymentSelector';

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

export default function CheckoutPage() {
  const { items, removeItem, updateQuantity, removeMultipleFromCart, isAuthenticated, isLoading } = useCart();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddr, setSelectedAddr] = useState<string | null>(null);
  const [loadingAddr, setLoadingAddr] = useState(true);
  const [payMethod, setPayMethod] = useState<PayMethod>('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [rzpReady, setRzpReady] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeCartIds, setActiveCartIds] = useState<string[]>([]);
  const [polling, setPolling] = useState(false);
  const finalizing = useRef(false);

  const selectedItems = items.filter(i => i.selected !== false);
  const subtotal = selectedItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = 0;
  const total = subtotal + shipping;

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
    let timer: ReturnType<typeof setInterval>;

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
          const cartIdsToRemove = activeCartIds.length > 0 ? activeCartIds : selectedItems.map(i => i.cartId);
          await removeMultipleFromCart(cartIdsToRemove);
          router.replace('/order-confirmation');
        }
      } catch { /* retry next tick */ }
    };

    check();
    timer = setInterval(check, 3000);
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

  /* ── Launch Razorpay ── */
  const launchRazorpay = useCallback(async () => {
    if (!window.Razorpay) { toast.error('Payment SDK not ready. Refresh and try again.'); return; }
    if (!selectedAddr) { toast.error('Select a delivery address first.'); return; }
    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      toast.error('Razorpay public key not configured. Add NEXT_PUBLIC_RAZORPAY_KEY_ID to your env file.');
      return;
    }

    const addr = addresses.find(a => a.id === selectedAddr);
    if (!addr) return;

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
        err.errors.forEach((e: any) => e.available <= 0 ? removeItem(e.cartId) : updateQuantity(e.cartId, e.available));
        toast.error('Some items had stock changes. Cart updated.');
      } else {
        toast.error(err?.error ?? 'Stock check failed.');
      }
      setIsProcessing(false);
      return;
    }

    /* 2 — Create Razorpay order on server (which also registers pending order) */
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
        })),
        addressId: selectedAddr,
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
        name: `${addr.first_name} ${addr.last_name}`.trim(),
        contact: addr.phone ?? '',
        email: user?.email ?? '',
      },
      notes: { order_id: orderId },
      theme: { color: '#0a0a0a', hide_topbar: false },
      config: {
        display: {
          blocks: { [payMethod]: { name: payMethod === 'upi' ? 'Pay via UPI' : 'Net Banking', instruments: [{ method: payMethod }] } },
          sequence: [`block.${payMethod}`],
          preferences: { show_default_blocks: false },
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
          await removeMultipleFromCart(purchasedCartIds);
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
  }, [selectedAddr, addresses, selectedItems, payMethod, user, removeItem, updateQuantity, removeMultipleFromCart, router]);

  /* ── Guards ── */
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!isAuthenticated) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 text-center px-4">
      <Lock className="w-8 h-8 text-muted-foreground" strokeWidth={1} />
      <h1 className="text-xl font-bold uppercase tracking-wider">Sign in to checkout</h1>
      <Link href="/login?next=/checkout" className="border border-foreground bg-foreground text-background px-8 py-3 text-[10px] font-black uppercase tracking-[0.3em] hover:opacity-80 transition-opacity">
        Sign In
      </Link>
    </div>
  );

  if (selectedItems.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 text-center px-4">
      <Package className="w-10 h-10 text-muted-foreground" strokeWidth={1} />
      <h1 className="text-2xl font-bold uppercase tracking-wider">No items selected</h1>
      <Link href="/cart" className="border border-foreground bg-foreground text-background px-8 py-3 text-[10px] font-black uppercase tracking-[0.3em] hover:opacity-80 transition-opacity">
        Return to Bag
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
            <Link href="/cart" className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] font-bold text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" /> Back to bag
            </Link>
          </div>

          {/* Page title */}
          <div className="mb-12 border-b border-border/40 pb-8">
            <p className="text-[10px] uppercase tracking-[0.45em] text-muted-foreground mb-2 font-semibold">Secure Checkout</p>
            <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-tighter">Complete Order</h1>
          </div>

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
                  <Link href="/profile" className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground hover:text-foreground transition-colors border-b border-transparent hover:border-foreground">
                    Manage →
                  </Link>
                </div>

                {loadingAddr ? (
                  <div className="border border-border/40 p-6 flex items-center gap-3">
                    <div className="w-4 h-4 border border-foreground border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-muted-foreground">Loading addresses…</span>
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="border border-dashed border-border p-8 text-center space-y-4">
                    <p className="text-xs text-muted-foreground">No saved addresses.</p>
                    <Link href="/profile" className="inline-block border border-foreground px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-foreground hover:text-background transition-colors">
                      Add Address
                    </Link>
                  </div>
                ) : (
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
                disabled={isProcessing || !rzpReady || !selectedAddr}
                className="hidden md:flex w-full items-center justify-center gap-3 bg-foreground text-background py-4 text-[11px] font-black uppercase tracking-[0.3em] hover:opacity-85 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isProcessing
                  ? <><div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" /> Processing…</>
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
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">₹{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-semibold">Free Delivery</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-3 border-t border-border/40">
                    <span>Total</span>
                    <span className="text-base">₹{total.toLocaleString()}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground text-right">Free Delivery All Over India</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border/60 p-4 flex items-center justify-between z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div>
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Total</p>
          <p className="text-xl font-bold tabular-nums">₹{total.toLocaleString()}</p>
        </div>
        <button
          onClick={isProcessing ? resetCheckout : launchRazorpay}
          disabled={!isProcessing && (!rzpReady || !selectedAddr)}
          className={`flex items-center gap-2 px-7 py-3.5 text-[10px] font-black uppercase tracking-[0.25em] transition-all disabled:opacity-40
            ${isProcessing ? 'bg-muted text-foreground border border-foreground' : 'bg-foreground text-background hover:opacity-85'}`}
        >
          {isProcessing
            ? <><RotateCcw className="w-3 h-3" /> Reset</>
            : <><Lock className="w-3 h-3" /> Pay Now</>
          }
        </button>
      </div>
    </>
  );
}
