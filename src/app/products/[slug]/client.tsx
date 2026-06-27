'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Minus, Plus, ShoppingBag, Heart, Ruler,
  ChevronDown, ChevronUp, Star, Shield,
  RotateCcw, Truck, Package, Check, ZoomIn,
} from 'lucide-react';
import { useCart } from '@/lib/hooks/use-cart';
import { toast } from 'sonner';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import defaultSizeCharts from '@/data/size-charts.json';
import { wishlistStore } from '@/lib/wishlist-store';
import { requireAuth } from '@/lib/require-auth';
import { useRatings } from '@/context/RatingsContext';
import { supabase } from '@/lib/supabaseClient';

interface SizeRow {
  size: string;
  chest: { in: string; cm: string };
  length: { in: string; cm: string };
  shoulder: { in: string; cm: string };
}

interface CategoryChart {
  title: string;
  fit: string;
  rows: SizeRow[];
}

interface SizeChartsData {
  [key: string]: CategoryChart;
}

interface SanityColor {
  name: string;
  hex?: string;
}

interface Product {
  _id?: string;
  slug?: { current: string };
  name?: string;
  price: number;
  salePrice?: number;
  description?: string;
  sizes?: string[];
  colors?: SanityColor[];
  material?: string;
  stock?: number;
  rating?: number;
  categorySlug?: string;
  categoryName?: string;
  images?: string[];
}

const TRUST_BADGES = [
  { icon: Truck, label: 'Free Shipping', sub: 'Orders over ₹5,000' },
  { icon: RotateCcw, label: 'Easy Returns', sub: '30-day return policy' },
  { icon: Shield, label: 'Secure Payment', sub: '100% safe & secure' },
  { icon: Package, label: 'Premium Quality', sub: 'Carefully crafted' },
];

export default function ProductClient({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { ratings, getProductReviews, getUserReview, updateRating, deleteUserReview } = useRatings();

  const [selectedSize, setSelectedSize] = useState<string>(product.sizes?.[0] || '');
  const [selectedColor, setSelectedColor] = useState<string>(product.colors?.[0]?.name || '');
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [sizeCharts, setSizeCharts] = useState<SizeChartsData>(defaultSizeCharts as SizeChartsData);
  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  const [openAccordion, setOpenAccordion] = useState<string>('description');
  const [isWishlisted, setIsWishlisted] = useState(() => wishlistStore.hasItem(product._id || ''));
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [sizeError, setSizeError] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [ratingInput, setRatingInput] = useState(5);
  const [experienceInput, setExperienceInput] = useState('');
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const existingReview = getUserReview(product._id || '');

  useEffect(() => {
    if (existingReview && !isEditing) {
      setRatingInput(existingReview.rating);
      setExperienceInput(existingReview.experience || '');
    }
  }, [existingReview, isEditing]);

  useEffect(() => {
    async function fetchCharts() {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const data = await res.json();
          if (data && !data.error) setSizeCharts(data);
        }
      } catch {
      }
    }
    fetchCharts();
  }, []);

  useEffect(() => {
    return wishlistStore.subscribe(() => {
      setIsWishlisted(wishlistStore.hasItem(product._id || ''));
    });
  }, [product._id]);

  const handleAddToCart = async () => {
    // Auth gate — redirect to login silently if not authenticated
    const authed = await requireAuth();
    if (!authed) return;

    if (!selectedSize && product.sizes && product.sizes.length > 0) {
      setSizeError(true);
      toast.error('Please select a size');
      setTimeout(() => setSizeError(false), 2000);
      return;
    }

    addItem({
      productId: product._id || 'unknown',
      name: product.name || 'Product',
      slug: product.slug?.current || 'product',
      price: displayPrice,
      quantity,
      selectedSize,
      selectedColor,
      image: product.images?.[0] || '',
    });

    toast.success('Added to Bag', {
      description: `${product.name}${selectedSize ? ` · ${selectedSize}` : ''}${selectedColor ? ` / ${selectedColor}` : ''}`,
    });
  };

  const toggleWishlist = async () => {
    const authed = await requireAuth();
    if (!authed) return;
    wishlistStore.toggleItem({
      productId: product._id || '',
      name: product.name || '',
      price: displayPrice,
      image: product.images?.[0] || '',
      slug: product.slug?.current || '',
    });
  };

  const getCategoryKey = () => {
    const slug = (product.categorySlug || '').toLowerCase();
    const name = (product.name || '').toLowerCase();
    if (name.includes('oversized')) return 'oversized-t-shirts';
    if (slug.includes('hoodie') || name.includes('hoodie')) return 'hoodies';
    if (slug.includes('shirt') || name.includes('shirt') || slug.includes('t-shirt')) return 't-shirts';
    return 't-shirts';
  };

  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setZoomPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const images = product.images || [];
  const stock = product.stock ?? 0;
  const isLowStock = stock > 0 && stock <= 5;
  const isOutOfStock = stock === 0;
  const displayPrice = product.salePrice ?? product.price;
  const isOnSale = !!product.salePrice && product.salePrice < product.price;
  
  const dbRating = ratings[product._id || ''];
  const hasDbRating = dbRating && dbRating.count > 0;
  const ratingValue = hasDbRating ? dbRating.rate : (product.rating ?? 0);
  const ratingCount = hasDbRating ? dbRating.count : 0;
  const hasAnyRating = ratingValue > 0;

  const categoryName = product.categoryName || product.categorySlug?.replace(/-/g, ' ') || 'Products';

  const { items } = useCart();
  const isAdded = items.some(item => item.productId === product._id);

  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="container mx-auto max-w-5xl px-4 pt-6">
        <nav className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>/</span>
          <Link href={`/products?category=${product.categorySlug}`} className="hover:text-foreground transition-colors capitalize">
            {categoryName}
          </Link>
          <span>/</span>
          <span className="text-foreground truncate max-w-[200px]">{product.name}</span>
        </nav>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-8 md:py-12">
        <div className="grid md:grid-cols-12 gap-8 lg:gap-12">

          {/* ── Image Gallery (5 cols on md/lg, more compact) ── */}
          <div className="md:col-span-5 space-y-3 w-full">
            <div
              className={`relative bg-muted overflow-hidden ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
              style={{ aspectRatio: '3/4' }}
              onClick={() => setIsZoomed(!isZoomed)}
              onMouseMove={handleImageMouseMove}
              onMouseLeave={() => setIsZoomed(false)}
            >
              {images[activeImageIndex] ? (
                <Image
                  src={images[activeImageIndex] || ''}
                  alt={product.name || ''}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 40vw, 420px"
                  className="w-full h-full object-cover transition-transform duration-700"
                  style={isZoomed ? { transform: 'scale(2)', transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : {}}
                  priority
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Package className="w-16 h-16 text-muted-foreground/30" />
                </div>
              )}

              {/* Status Badge overlay (ONLY out of stock) */}
              {isOutOfStock && (
                <div className="absolute top-3 left-3">
                  <span className="bg-foreground/80 text-background px-2 py-1 text-[10px] uppercase tracking-widest font-bold backdrop-blur-sm">Sold Out</span>
                </div>
              )}

              {!isZoomed && images[activeImageIndex] && (
                <div className="absolute bottom-3 right-3 bg-background/80 backdrop-blur-sm px-2 py-1 flex items-center gap-1 text-[10px] uppercase tracking-widest text-foreground/70">
                  <ZoomIn className="w-3 h-3" /> Zoom
                </div>
              )}

              {images.length > 1 && (
                <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm px-2 py-1 text-[10px] uppercase tracking-widest text-foreground/70">
                  {activeImageIndex + 1} / {images.length}
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {images.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`aspect-square bg-muted overflow-hidden border transition-all relative ${activeImageIndex === idx
                        ? 'border-foreground'
                        : 'border-transparent opacity-50 hover:opacity-80'
                      }`}
                  >
                    <Image
                      src={img}
                      alt={`view-${idx + 1}`}
                      fill
                      sizes="80px"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Product Info (7 cols on md/lg) ── */}
          <div className="md:col-span-7 flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">

            {/* Rating from Sanity */}
            {hasAnyRating && (
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${i <= Math.round(ratingValue) ? 'fill-foreground text-foreground' : 'fill-muted text-muted-foreground'}`}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {ratingValue.toFixed(1)} / 5.0 {ratingCount > 0 && `(${ratingCount} ${ratingCount === 1 ? 'review' : 'reviews'})`}
                </span>
              </div>
            )}

            {/* Name & Price */}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight uppercase leading-tight mb-2">
                {product.name}
              </h1>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className={`text-xl font-bold ${isOnSale ? 'text-red-600 dark:text-red-400' : ''}`}>
                  ₹{displayPrice.toLocaleString()}
                </span>
                {isOnSale && product.price && (
                  <span className="text-sm text-muted-foreground line-through">
                    ₹{product.price.toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">Inclusive of all taxes</p>
            </div>

            {/* Color Selection — from Sanity */}
            {product.colors && product.colors.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Color:</span>
                  <span className="text-xs text-muted-foreground capitalize">{selectedColor}</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {product.colors.map((color: SanityColor) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color.name)}
                      title={color.name}
                      className={`group relative w-8 h-8 rounded-full transition-all focus:outline-none border ${selectedColor === color.name
                          ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background border-transparent'
                          : 'border-transparent hover:ring-2 hover:ring-muted-foreground hover:ring-offset-2 hover:ring-offset-background'
                        }`}
                      style={{ backgroundColor: color.hex || '#808080' }}
                    >
                      {selectedColor === color.name && (
                        <Check
                          className="absolute inset-0 m-auto w-3 h-3"
                          style={{
                            color: color.hex && ['#f5f5f5', '#fff', '#ffffff', '#f5f0e8', '#e8dcc8', '#d4d4d4'].includes(color.hex.toLowerCase())
                              ? '#111'
                              : '#fff',
                          }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selection — from Sanity */}
            {product.sizes && product.sizes.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Size:</span>
                    <span className="text-xs text-muted-foreground">{selectedSize}</span>
                  </div>
                  <Sheet>
                    <SheetTrigger render={
                      <button className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors cursor-pointer border-b border-dashed border-muted-foreground/40 hover:border-foreground pb-0.5">
                        <Ruler className="w-3 h-3" /> Size Guide
                      </button>
                    } />
                    <SheetContent side="right" className="w-[90%] sm:w-[460px] overflow-y-auto p-0 bg-background">
                      <div className="sticky top-0 bg-background border-b border-border p-6 z-10">
                        <SheetHeader>
                          <SheetTitle className="uppercase tracking-widest text-base font-bold">Size Guide</SheetTitle>
                        </SheetHeader>
                        <p className="text-xs text-muted-foreground mt-1">
                          All measurements are body measurements in {unit === 'in' ? 'inches' : 'centimeters'}.
                        </p>
                      </div>
                      {(() => {
                        const key = getCategoryKey();
                        const activeChart = sizeCharts[key] || sizeCharts['t-shirts'];
                        return (
                          <div className="p-6 space-y-6">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{activeChart?.title}</span>
                              <div className="flex border border-border overflow-hidden">
                                {(['in', 'cm'] as const).map(u => (
                                  <button
                                    key={u}
                                    onClick={() => setUnit(u)}
                                    className={`px-4 py-1.5 text-[11px] uppercase tracking-widest transition-colors cursor-pointer ${unit === u ? 'bg-foreground text-background font-bold' : 'text-muted-foreground hover:text-foreground'
                                      }`}
                                  >
                                    {u === 'in' ? 'Inches' : 'cm'}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {activeChart ? (
                              <>
                                <div className="overflow-x-auto border border-border">
                                  <table className="w-full text-left border-collapse">
                                    <thead>
                                      <tr className="bg-muted/40 border-b border-border">
                                        {['Size', 'Chest', 'Length', 'Shoulder'].map(h => (
                                          <th key={h} className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider">{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                      {activeChart.rows.map((row: SizeRow) => (
                                        <tr key={row.size} className={`transition-colors ${selectedSize === row.size ? 'bg-foreground/5 font-semibold' : 'hover:bg-muted/30'}`}>
                                          <td className="py-3 px-4 text-sm font-semibold">{row.size}</td>
                                          <td className="py-3 px-4 text-sm text-muted-foreground">{row.chest[unit]}</td>
                                          <td className="py-3 px-4 text-sm text-muted-foreground">{row.length[unit]}</td>
                                          <td className="py-3 px-4 text-sm text-muted-foreground">{row.shoulder[unit]}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  <strong className="text-foreground uppercase tracking-widest block mb-1 text-[10px]">Fit</strong>
                                  {activeChart.fit}
                                </p>
                              </>
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-6">Sizing data unavailable.</p>
                            )}
                          </div>
                        );
                      })()}
                    </SheetContent>
                  </Sheet>
                </div>

                <div className={`flex flex-wrap gap-2 transition-colors ${sizeError ? 'p-3 border border-destructive bg-destructive/5' : ''}`}>
                  {product.sizes.map((size: string) => (
                    <button
                      key={size}
                      onClick={() => { setSelectedSize(size); setSizeError(false); }}
                      className={`min-w-[2.75rem] h-9 text-xs font-medium transition-all border ${selectedSize === size
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border hover:border-foreground bg-transparent'
                        }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                {sizeError && <p className="text-[10px] text-destructive mt-2 uppercase tracking-wider">Please select a size to continue</p>}
              </div>
            )}

            {/* Quantity & Stock warning */}
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold uppercase tracking-wider w-16">Qty</span>
              <div className="flex items-center border border-border">
                <button
                  className="w-9 h-9 flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-9 text-center text-xs font-semibold">{quantity}</span>
                <button
                  className="w-9 h-9 flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30"
                  onClick={() => setQuantity(Math.min(Math.max(stock, 1), quantity + 1))}
                  disabled={isOutOfStock || quantity >= stock}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <div className="flex flex-col">
                {stock > 0 ? (
                  <span className="text-[11px] text-muted-foreground">{stock} in stock</span>
                ) : (
                  <span className="text-[11px] text-destructive font-semibold uppercase tracking-wider">Out of stock</span>
                )}
                {isLowStock && !isOutOfStock && (
                  <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mt-0.5">Only {stock} left!</span>
                )}
              </div>
            </div>

            {/* CTA */}
            <div className="flex gap-3">
              <Button
                className="flex-1 rounded-none uppercase tracking-widest h-12 text-xs font-bold"
                size="lg"
                onClick={handleAddToCart}
                disabled={isOutOfStock || isAdded}
              >
                {isAdded ? <Check className="w-4 h-4 mr-2" /> : <ShoppingBag className="w-4 h-4 mr-2" />}
                {isAdded ? 'Added' : isOutOfStock ? 'Out of Stock' : 'Add to Bag'}
              </Button>
              <button
                onClick={toggleWishlist}
                className={`h-12 w-12 border flex items-center justify-center transition-all ${isWishlisted
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border hover:border-foreground'
                  }`}
                aria-label="Add to wishlist"
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Delivery callout */}
            <div className="flex items-start gap-3 p-3 border border-border bg-muted/20">
              <Truck className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider">Free Shipping</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">On orders over ₹5,000 · 5–7 business days</p>
              </div>
            </div>

            {/* Accordion */}
            <div className="border-t border-border">
              {/* Description */}
              <div className="border-b border-border">
                <button
                  className="w-full flex items-center justify-between py-4 text-left"
                  onClick={() => setOpenAccordion(openAccordion === 'description' ? '' : 'description')}
                >
                  <span className="text-xs font-bold uppercase tracking-wider">Description</span>
                  {openAccordion === 'description' ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {openAccordion === 'description' && (
                  <div className="pb-4 text-xs text-muted-foreground leading-relaxed font-light">
                    {product.description || 'No description available.'}
                  </div>
                )}
              </div>

              {/* Material — from Sanity (strictly dynamic) */}
              {product.material && (
                <div className="border-b border-border">
                  <button
                    className="w-full flex items-center justify-between py-4 text-left"
                    onClick={() => setOpenAccordion(openAccordion === 'material' ? '' : 'material')}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider">Material & Composition</span>
                    {openAccordion === 'material' ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  {openAccordion === 'material' && (
                    <div className="pb-4 space-y-3">
                      <div className="flex gap-3 text-xs">
                        <span className="text-[10px] font-semibold uppercase tracking-wider w-20 shrink-0 text-muted-foreground pt-0.5">Fabric</span>
                        <span className="text-foreground">{product.material}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Shipping */}
              <div className="border-b border-border">
                <button
                  className="w-full flex items-center justify-between py-4 text-left"
                  onClick={() => setOpenAccordion(openAccordion === 'shipping' ? '' : 'shipping')}
                >
                  <span className="text-xs font-bold uppercase tracking-wider">Shipping & Returns</span>
                  {openAccordion === 'shipping' ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {openAccordion === 'shipping' && (
                  <div className="pb-4 space-y-1.5 text-xs text-muted-foreground font-light">
                    <p>✓ Free shipping on orders over ₹5,000</p>
                    <p>✓ Standard delivery: 5–7 business days</p>
                    <p>✓ Express delivery: 2–3 business days (₹249)</p>
                    <p>✓ Easy 30-day returns for unworn items</p>
                  </div>
                )}
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {TRUST_BADGES.map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex items-start gap-2.5 p-3 border border-border/60 hover:border-border transition-colors">
                  <Icon className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Reviews & Ratings Section ── */}
        <div className="mt-20 border-t border-border/60 pt-16">
          <div className="flex flex-col md:flex-row gap-12">
            {/* Left: Summary & Form */}
            <div className="md:w-5/12 space-y-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground mb-1">Feedback</p>
                <h2 className="text-xl font-bold uppercase tracking-tight">Customer Reviews</h2>
                
                <div className="mt-4 flex items-center gap-4">
                  <span className="text-4xl font-black">{ratingValue.toFixed(1)}</span>
                  <div className="space-y-1">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i <= Math.round(ratingValue) ? 'fill-foreground text-foreground' : 'fill-muted text-muted-foreground'}`}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                      Based on {ratingCount} {ratingCount === 1 ? 'review' : 'reviews'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Review Form Area */}
              <div className="border border-border/60 p-6 bg-muted/5">
                {!user ? (
                  <div className="text-center py-4 space-y-3">
                    <p className="text-xs text-muted-foreground">Please log in to share your experience with this product.</p>
                    <Link
                      href="/login"
                      className="inline-block border border-foreground text-[10px] font-bold uppercase tracking-widest px-6 py-2.5 hover:bg-foreground hover:text-background transition-colors"
                    >
                      Log In
                    </Link>
                  </div>
                ) : existingReview && !isEditing ? (
                  // Display existing review
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black uppercase tracking-widest bg-foreground text-background px-1.5 py-0.5">Your Review</span>
                      <span className="text-[10px] text-muted-foreground">
                        {existingReview.updated_at ? new Date(existingReview.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${i <= existingReview.rating ? 'fill-foreground text-foreground' : 'fill-muted text-muted-foreground'}`}
                          />
                        ))}
                      </div>
                      {existingReview.experience ? (
                        <p className="text-xs text-muted-foreground italic leading-relaxed">"{existingReview.experience}"</p>
                      ) : (
                        <p className="text-xs text-muted-foreground/60 italic">No comment shared.</p>
                      )}
                    </div>

                    <div className="flex gap-2.5 pt-2">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="border border-border text-[9px] font-bold uppercase tracking-widest px-4 py-2 hover:border-foreground transition-colors"
                      >
                        Edit Review
                      </button>
                      <button
                        onClick={async () => {
                          if (!product._id) return;
                          if (!confirm('Are you sure you want to delete your review?')) return;
                          setIsSubmitting(true);
                          const { error } = await deleteUserReview(product._id);
                          setIsSubmitting(false);
                          if (error) {
                            toast.error(error);
                          } else {
                            toast.success('Review deleted');
                            setRatingInput(5);
                            setExperienceInput('');
                            setIsEditing(false);
                          }
                        }}
                        disabled={isSubmitting}
                        className="border border-destructive/35 text-destructive text-[9px] font-bold uppercase tracking-widest px-4 py-2 hover:bg-destructive/5 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  // Write/Edit Form
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!product._id) return;
                      setIsSubmitting(true);
                      const { error } = await updateRating(product._id, ratingInput, experienceInput);
                      setIsSubmitting(false);
                      if (error) {
                        toast.error(error);
                      } else {
                        toast.success(existingReview ? 'Review updated' : 'Review submitted');
                        setIsEditing(false);
                      }
                    }}
                    className="space-y-4"
                  >
                    <h3 className="text-xs font-bold uppercase tracking-wider">
                      {existingReview ? 'Update Your Review' : 'Write a Review'}
                    </h3>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Rating</label>
                      <div className="flex gap-1 items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRatingInput(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(null)}
                            className="text-foreground hover:scale-110 transition-all duration-150 p-0.5"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                star <= (hoverRating ?? ratingInput)
                                  ? 'fill-foreground text-foreground'
                                  : 'fill-muted text-muted-foreground'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="experience" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Comment (Optional)
                      </label>
                      <textarea
                        id="experience"
                        rows={3}
                        value={experienceInput}
                        onChange={(e) => setExperienceInput(e.target.value)}
                        placeholder="Tell us about the fabric, sizing, or fit..."
                        className="w-full bg-background border border-border/85 px-3 py-2 text-xs focus:outline-none focus:border-foreground transition-colors"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 bg-black text-white text-[10px] font-bold uppercase tracking-widest py-2.5 hover:bg-black/90 transition-colors disabled:opacity-50"
                      >
                        {isSubmitting ? 'Saving...' : existingReview ? 'Update' : 'Submit'}
                      </button>
                      {existingReview && (
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="border border-border text-[10px] font-bold uppercase tracking-widest px-4 py-2.5 hover:border-foreground transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Right: Reviews List */}
            <div className="md:w-7/12 space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Community Reviews ({getProductReviews(product._id || '').length})
              </h3>

              {getProductReviews(product._id || '').length === 0 ? (
                <div className="py-12 border border-dashed border-border/60 text-center bg-muted/5">
                  <p className="text-xs text-muted-foreground">No reviews yet for this product. Be the first to share your thoughts!</p>
                </div>
              ) : (
                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                  {getProductReviews(product._id || '').map((rev) => {
                    const isOwn = user?.id === rev.user_id;
                    const profileName = rev.profiles?.full_name || rev.reviewer_email?.split('@')[0] || 'Anonymous';
                    const avatarUrl = rev.profiles?.avatar_url;
                    
                    const getInitials = (name?: string | null, email?: string | null) => {
                      if (name) {
                        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                      }
                      if (email) {
                        return email[0].toUpperCase();
                      }
                      return 'U';
                    };
                    
                    return (
                      <div key={rev.id} className="border-b border-border/40 pb-6 last:border-0 last:pb-0 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {avatarUrl ? (
                              <Image
                                src={avatarUrl}
                                alt={profileName}
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded-full object-cover border border-border/60"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-muted border border-border/80 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                {getInitials(rev.profiles?.full_name, rev.reviewer_email)}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold">{profileName}</span>
                                {isOwn && (
                                  <span className="text-[8px] bg-muted font-bold text-muted-foreground px-1 py-0.2 uppercase tracking-widest">You</span>
                                )}
                              </div>
                              <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold">
                                {new Date(rev.updated_at || rev.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(i => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${i <= rev.rating ? 'fill-foreground text-foreground' : 'fill-muted text-muted-foreground'}`}
                              />
                            ))}
                          </div>
                        </div>

                        {rev.experience && (
                          <p className="text-xs text-foreground/80 leading-relaxed font-light pl-11">
                            {rev.experience}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
