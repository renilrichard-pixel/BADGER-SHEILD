import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { client } from '@/sanity/lib/client';
import { urlForImage } from '@/sanity/lib/image';
import { NewsletterForm } from '@/components/newsletter-form';

export const revalidate = 0; // Disable static rendering for now to ensure fresh DB data

export default async function Home() {
  const featuredProducts = await client.fetch(`
    *[_type == "product" && featured == true][0...1] {
      _id,
      name,
      slug,
      price,
      images
    }
  `);
    
  const newArrivals = await client.fetch(`
    *[_type == "product" && newArrival == true] | order(_createdAt desc)[0...4] {
      _id,
      name,
      slug,
      price,
      images
    }
  `);

  const featuredProduct = featuredProducts?.[0];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden bg-foreground">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=2000&auto=format&fit=crop"
            alt="Hero Fashion"
            className="w-full h-full object-cover opacity-40 grayscale"
          />
        </div>
        <div className="relative z-10 container mx-auto px-4 flex flex-col items-center text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter text-background uppercase">
            Redefine <br /> Your Style
          </h1>
          <p className="text-lg md:text-xl text-background/80 max-w-[600px] font-light">
            Minimalist luxury clothing designed for the modern individual. Embrace the elegance of simplicity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button size="lg" variant="secondary" className="rounded-none uppercase tracking-widest px-8" render={<Link href="/products" />} nativeButton={false}>
              Shop Collection
            </Button>
            <Button size="lg" variant="outline" className="rounded-none uppercase tracking-widest px-8 text-background border-background hover:bg-background hover:text-foreground" render={<Link href="/products?sort=new" />} nativeButton={false}>
              New Arrivals
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Collection / Spotlight */}
      {featuredProduct && (
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="aspect-[3/4] relative overflow-hidden group">
                <img
                  src={featuredProduct.images?.[0] ? urlForImage(featuredProduct.images[0]) : ''}
                  alt={featuredProduct.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 grayscale"
                />
              </div>
              <div className="space-y-6">
                <h2 className="text-sm font-medium tracking-[0.2em] uppercase text-muted-foreground">Spotlight</h2>
                <h3 className="text-4xl md:text-5xl font-bold tracking-tight uppercase">{featuredProduct.name}</h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Crafted from premium heavyweight cotton, this piece represents our commitment to uncompromising quality and timeless design. A staple for any considered wardrobe.
                </p>
                <div className="pt-6">
                  <Button variant="default" size="lg" className="rounded-none uppercase tracking-widest w-full sm:w-auto" render={<Link href={`/products/${featuredProduct.slug?.current}`} />} nativeButton={false}>
                    Discover Piece <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* New Arrivals Grid */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <h2 className="text-3xl font-bold tracking-tighter uppercase">New Arrivals</h2>
            <Link href="/products" className="text-sm font-medium uppercase tracking-widest hover:underline underline-offset-4 hidden sm:block">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {newArrivals.map((product: any) => (
              <Link key={product._id} href={`/products/${product.slug?.current}`} className="group block">
                <div className="aspect-[4/5] relative overflow-hidden bg-muted mb-4">
                  <img
                    src={product.images?.[0] ? urlForImage(product.images[0]) : ''}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 grayscale group-hover:grayscale-0"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-background/90 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-sm font-medium uppercase text-center">Quick View</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="font-medium text-lg leading-tight">{product.name}</h3>
                  <p className="text-muted-foreground">₹{product.price.toLocaleString()}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center sm:hidden">
             <Button variant="outline" className="rounded-none uppercase tracking-widest w-full" render={<Link href="/products" />} nativeButton={false}>
               View All
             </Button>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-24 bg-foreground text-background">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tighter uppercase mb-4">Join The Club</h2>
          <p className="text-background/70 mb-8">Subscribe to receive updates, access to exclusive deals, and more.</p>
          <NewsletterForm />
        </div>
      </section>
    </div>
  );
}
