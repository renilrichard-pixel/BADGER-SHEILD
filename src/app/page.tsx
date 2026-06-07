'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NewsletterForm } from '@/components/newsletter-form';
import { client } from '@/sanity/lib/client';
import { ProductCard } from '@/components/product-card';
import type { SanityImageSource } from '@sanity/image-url';
import { useEffect, useState } from 'react';

interface HomeProduct {
  _id: string;
  name: string;
  slug?: { current: string };
  price: number;
  salePrice?: number;
  image?: SanityImageSource;
  images?: SanityImageSource[];
  categoryName?: string;
  newArrival?: boolean;
  bestSeller?: boolean;
  colors?: string[];
  colorHexes?: string[];
  sizes?: string[];
  stockQty?: number;
}

export default function Home() {
  const [products, setProducts] = useState<HomeProduct[]>([]);

  useEffect(() => {
    client.fetch<HomeProduct[]>(`
      *[_type == "product" && newArrival == true] | order(_createdAt desc)[0...8] {
        _id, name, slug, price, salePrice, image, images,
        newArrival, bestSeller,
        "colors": colors[].name,
        "colorHexes": colors[].hex,
        "sizes": sizes,
        "categoryName": category->name,
        "stockQty": stock
      }
    `).then(data => {
      if (data && data.length > 0) {
        setProducts(data);
      } else {
        client.fetch<HomeProduct[]>(`
          *[_type == "product" && active != false] | order(_createdAt desc)[0...8] {
            _id, name, slug, price, salePrice, image, images,
            newArrival, bestSeller,
            "colors": colors[].name,
            "colorHexes": colors[].hex,
            "sizes": sizes,
            "categoryName": category->name,
            "stockQty": stock
          }
        `).then(setProducts);
      }
    });
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">

      {/* ── Hero Section with Video Background ── */}
      <section className="relative min-h-[60vh] flex items-center overflow-hidden">
        {/* Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover object-center z-0"
          poster="/hero-bg.png"
        >
          <source src="/The_hero_bg_image_you_have_rig.mp4" type="video/mp4" />
        </video>



        {/* Hero Content */}
        <div className="relative z-10 container mx-auto max-w-7xl px-6 py-14 md:py-20 w-full">
          <div className="max-w-2xl space-y-8">

            {/* Eyebrow badge */}
            <div className="inline-flex items-center border border-white/25 bg-white/10 backdrop-blur-md px-4 py-2 text-[10px] font-bold uppercase tracking-[0.28em] text-white/80">
              <span className="mr-2 h-1.5 w-1.5 rounded-full bg-white/60 animate-pulse" />
              Premium Menswear Essentials
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl font-black uppercase leading-[0.93] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Modern<br />T-shirts<br />
                <span className="italic font-light text-white/80">made for</span><br />
                Everyday Style.
              </h1>
              <p className="max-w-md text-sm leading-7 text-white/65 sm:text-base">
                Shop clean fits, heavyweight cotton, and sharp everyday pieces — built for a refined wardrobe.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                className="h-12 rounded-none bg-white px-8 text-[11px] font-black uppercase tracking-[0.2em] text-black hover:bg-white/90 transition-all"
                render={<Link href="/products" />}
                nativeButton={false}
              >
                Shop Collection <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-12 rounded-none border-white/50 bg-transparent px-8 text-[11px] font-black uppercase tracking-[0.2em] text-white hover:bg-white hover:text-black transition-all backdrop-blur-sm"
                render={<Link href="#new-arrivals" />}
                nativeButton={false}
              >
                New Arrivals
              </Button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-6 border-t border-white/15 pt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
              <span className="flex items-center gap-2"><Truck className="h-3.5 w-3.5" /> Fast Ship</span>
              <span className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" /> Secure Pay</span>
              <span className="flex items-center gap-2"><RotateCcw className="h-3.5 w-3.5" /> Easy Return</span>
            </div>
          </div>
        </div>


      </section>

      {/* ── New Arrivals Section ── */}
      <section id="new-arrivals" className="py-16 md:py-24 scroll-mt-20">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="mb-10 flex items-end justify-between gap-4 border-b border-border pb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Latest products</p>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-tight sm:text-3xl">New Arrivals</h2>
            </div>
            <Link href="/products" className="hidden text-[11px] font-black uppercase tracking-[0.18em] underline-offset-4 hover:underline sm:inline-flex">
              View all
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
              {products.slice(0, 8).map((product) => (
                <ProductCard
                  key={product._id}
                  id={product._id}
                  name={product.name}
                  slug={product.slug?.current || ''}
                  price={product.price}
                  salePrice={product.salePrice}
                  image={product.image}
                  images={product.images}
                  categoryName={product.categoryName}
                  newArrival={product.newArrival}
                  bestSeller={product.bestSeller}
                  colors={product.colors}
                  colorHexes={product.colorHexes}
                  sizes={product.sizes}
                  stockQty={product.stockQty}
                />
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-border py-16 text-center">
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Products will appear here soon.</p>
            </div>
          )}

          <div className="mt-9 sm:hidden">
            <Button variant="outline" className="h-12 w-full rounded-none text-[11px] font-black uppercase tracking-[0.2em]" render={<Link href="/products" />} nativeButton={false}>
              View all products
            </Button>
          </div>
        </div>
      </section>

      {/* ── Newsletter Section ── */}
      <section className="border-y border-border bg-muted/20 py-16 md:py-20">
        <div className="container mx-auto max-w-3xl px-4 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-muted-foreground mb-3">Stay Updated</p>
          <h2 className="text-3xl font-black uppercase tracking-tight sm:text-4xl mb-3">Join the Club</h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
            Get early access to new drops, exclusive offers, and style updates — straight to your inbox.
          </p>
          <div className="max-w-md mx-auto">
            <NewsletterForm />
          </div>
        </div>
      </section>

    </main>
  );
}
