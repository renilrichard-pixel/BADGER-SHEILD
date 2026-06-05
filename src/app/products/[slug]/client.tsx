'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Minus, Plus, ShoppingBag, Heart, Ruler } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import defaultSizeCharts from '@/data/size-charts.json';

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

interface Product {
  name?: string;
  price: number;
  description?: string;
  sizes_available?: string[];
  colors_available?: string[];
  fabric?: string;
  stock?: number;
  categories?: { slug: string };
  images?: string[];
}

export default function ProductClient({ product }: { product: Product }) {
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes_available?.[0] || '');
  const [selectedColor, setSelectedColor] = useState<string>(product.colors_available?.[0] || '');
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [sizeCharts, setSizeCharts] = useState<SizeChartsData>(defaultSizeCharts as SizeChartsData);
  const [unit, setUnit] = useState<'in' | 'cm'>('in');

  useEffect(() => {
    async function fetchCharts() {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const data = await res.json();
          if (data && !data.error) {
            setSizeCharts(data);
          }
        }
      } catch (e) {
        console.error('Error fetching size charts:', e);
      }
    }
    fetchCharts();
  }, []);

  const getCategoryKey = () => {
    const slug = product.categories?.slug?.toLowerCase() || '';
    const name = product.name?.toLowerCase() || '';
    if (name.includes('oversized') && (name.includes('tee') || name.includes('t-shirt') || slug.includes('t-shirt') || slug === 't-shirts')) {
      return 'oversized-t-shirts';
    }
    if (slug.includes('t-shirt') || slug === 't-shirts' || name.includes('t-shirt') || name.includes('tee')) {
      return 't-shirts';
    }
    if (slug.includes('hoodie') || name.includes('hoodie')) {
      return 'hoodies';
    }
    if (slug.includes('shirt') || name.includes('shirt')) {
      return 'shirts';
    }
    return 't-shirts';
  };

  const categoryName = product.categories?.slug?.replace('-', ' ') || 'Category';

  return (
    <div className="container mx-auto px-4 py-8 md:py-16">
      {/* Breadcrumb */}
      <div className="flex items-center text-xs uppercase tracking-widest text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-2">/</span>
        <Link href={`/products?category=${product.categories?.slug}`} className="hover:text-foreground">{categoryName}</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{product.name}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-12 lg:gap-24">
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-[3/4] bg-muted relative overflow-hidden group cursor-zoom-in max-h-[60vh] md:max-h-[75vh]">
            {product.images?.[activeImageIndex] && (
              <img
                src={product.images[activeImageIndex]}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            )}
          </div>
          {product.images && product.images.length > 0 && (
            <div className="grid grid-cols-4 gap-4">
              {product.images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`aspect-square bg-muted cursor-pointer transition-all ${
                    activeImageIndex === idx
                      ? 'border-b-2 border-foreground opacity-100'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight uppercase mb-2">{product.name}</h1>
            <p className="text-xl font-medium">₹{product.price.toLocaleString()}</p>
          </div>

          <p className="text-muted-foreground leading-relaxed mb-8">
            {product.description || 'Crafted with uncompromising attention to detail, this piece offers a refined silhouette.'}
          </p>

          <div className="space-y-6 mb-8">
            {/* Color Selection */}
            {product.colors_available && product.colors_available.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold uppercase tracking-wider">Color: {selectedColor}</span>
                </div>
                <div className="flex gap-3">
                  {product.colors_available.map((color: string) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        selectedColor === color 
                          ? 'border-foreground p-0.5' 
                          : 'border-transparent hover:border-muted-foreground'
                      }`}
                      title={color}
                    >
                      <span 
                        className="block w-full h-full rounded-full border border-border" 
                        style={{ 
                          backgroundColor: color.toLowerCase() === 'white' ? '#fff' 
                            : color.toLowerCase() === 'black' ? '#000' 
                            : color.toLowerCase() === 'charcoal' ? '#333'
                            : color.toLowerCase() === 'light gray' ? '#d1d5db'
                            : color.toLowerCase() === 'olive' ? '#808000'
                            : '#808080' 
                        }} 
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selection */}
            {product.sizes_available && product.sizes_available.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold uppercase tracking-wider">Size: {selectedSize}</span>
                  <Sheet>
                    <SheetTrigger render={
                      <button className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer">
                        <Ruler className="w-3 h-3" /> Size Guide
                      </button>
                    } />
                    <SheetContent side="right" className="w-[90%] sm:w-[450px] overflow-y-auto p-6 bg-background">
                      {(() => {
                        const key = getCategoryKey();
                        const activeChart = sizeCharts[key] || sizeCharts['t-shirts'];
                        return (
                          <>
                            <SheetHeader className="pb-4 border-b border-border flex flex-row items-center justify-between">
                              <SheetTitle className="uppercase tracking-widest text-lg font-bold">
                                {activeChart?.title || 'Size Guide'}
                              </SheetTitle>
                            </SheetHeader>
                            
                            <div className="py-6 space-y-6">
                              {/* Unit Toggle inside the drawer */}
                              <div className="flex justify-between items-center bg-muted/10 border border-border p-1">
                                <span className="text-xs font-semibold uppercase tracking-wider pl-2 text-muted-foreground">Unit</span>
                                <div className="flex bg-muted/40">
                                  <button
                                    onClick={() => setUnit('in')}
                                    className={`px-3 py-1 text-[10px] uppercase tracking-widest transition-colors font-medium cursor-pointer ${
                                      unit === 'in'
                                        ? 'bg-foreground text-background font-bold'
                                        : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                  >
                                    Inches
                                  </button>
                                  <button
                                    onClick={() => setUnit('cm')}
                                    className={`px-3 py-1 text-[10px] uppercase tracking-widest transition-colors font-medium cursor-pointer ${
                                      unit === 'cm'
                                        ? 'bg-foreground text-background font-bold'
                                        : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                  >
                                    Cm
                                  </button>
                                </div>
                              </div>

                              {activeChart ? (
                                <>
                                  <div className="overflow-x-auto border border-border">
                                    <table className="w-full text-left border-collapse">
                                      <thead>
                                        <tr className="border-b border-border bg-muted/20">
                                          <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-foreground">Size</th>
                                          <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-foreground text-right">Chest ({unit})</th>
                                          <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-foreground text-right">Length ({unit})</th>
                                          <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-foreground text-right">Shoulder ({unit})</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border/50">
                                        {activeChart.rows.map((row: SizeRow) => (
                                          <tr key={row.size} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-3 px-4 text-sm font-semibold text-foreground">{row.size}</td>
                                            <td className="py-3 px-4 text-sm text-muted-foreground text-right">{row.chest[unit]}</td>
                                            <td className="py-3 px-4 text-sm text-muted-foreground text-right">{row.length[unit]}</td>
                                            <td className="py-3 px-4 text-sm text-muted-foreground text-right">{row.shoulder[unit]}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    <strong className="text-foreground uppercase tracking-widest block mb-1 text-[10px]">Fit details</strong>
                                    {activeChart.fit}
                                  </p>
                                  <div className="pt-2 border-t border-border">
                                    <Link 
                                      href="/size-guide" 
                                      className="text-xs uppercase tracking-widest text-foreground hover:underline font-bold flex items-center justify-center gap-2 py-2.5 border border-border hover:bg-muted/15 transition-colors"
                                    >
                                      View Full Sizing Guide Page
                                    </Link>
                                  </div>
                                </>
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-6">Sizing data unavailable.</p>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </SheetContent>
                  </Sheet>
                </div>
                <div className="flex flex-wrap gap-3">
                  {product.sizes_available.map((size: string) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`min-w-[3rem] px-3 py-2 text-sm font-medium transition-colors border ${
                        selectedSize === size
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border hover:border-foreground'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <span className="block text-sm font-semibold uppercase tracking-wider mb-3">Quantity</span>
              <div className="flex items-center border border-border w-fit">
                <button 
                  className="px-4 py-3 hover:bg-muted transition-colors"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center text-sm font-medium">{quantity}</span>
                <button 
                  className="px-4 py-3 hover:bg-muted transition-colors"
                  onClick={() => setQuantity(Math.min(product.stock || 10, quantity + 1))}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-4 mb-8">
            <Button className="flex-1 rounded-none uppercase tracking-widest h-14" size="lg">
              <ShoppingBag className="w-4 h-4 mr-2" /> Add to Cart
            </Button>
            <Button variant="outline" size="icon" className="h-14 w-14 rounded-none">
              <Heart className="w-5 h-5" />
            </Button>
          </div>

          <div className="border-t border-border pt-6 mt-auto">
            <div className="space-y-4 text-sm">
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="font-semibold uppercase tracking-wider text-xs">Material</span>
                <span className="text-muted-foreground">{product.fabric || '100% Premium Cotton'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="font-semibold uppercase tracking-wider text-xs">Care</span>
                <span className="text-muted-foreground">Machine wash cold</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-semibold uppercase tracking-wider text-xs">Shipping</span>
                <span className="text-muted-foreground">Free over ₹5,000</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
