import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star } from 'lucide-react';
import { WishlistButton } from '@/components/wishlist-button';
import { ProductCardActions } from '@/components/product-card-actions';
import { urlFor } from '@/sanity/lib/image';
import type { SanityImageSource } from '@sanity/image-url';
import type { SizeStockEntry } from '@/lib/sizeStock';

interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  price: number;
  salePrice?: number;
  image?: SanityImageSource | null;
  images?: SanityImageSource[] | null;
  newArrival?: boolean;
  bestSeller?: boolean;
  colors?: string[] | null;
  colorHexes?: string[] | null;
  sizes?: string[] | null;
  sizeStock?: SizeStockEntry[] | null;
  stockQty?: number;
  categoryName?: string;
  priority?: boolean;
  averageRating?: number;
  reviewCount?: number;
}

function getImageUrl(source: SanityImageSource | null | undefined): string | null {
  if (!source) return null;
  try {
    return urlFor(source).width(500).height(667).fit('crop').auto('format').url();
  } catch {
    return null;
  }
}

export function ProductCard({
  id,
  name,
  slug,
  price,
  salePrice,
  image,
  images,
  newArrival,
  bestSeller,
  colors,
  sizes,
  sizeStock,
  stockQty = 99,
  categoryName,
  priority = false,
  averageRating = 0,
  reviewCount = 0,
}: ProductCardProps) {
  const displayPrice = salePrice ?? price;
  const isOnSale = !!salePrice && salePrice < price;
  const primaryImage = image ?? images?.[0] ?? null;
  const secondaryImage = images?.[1] ?? null;
  const mainImageUrl = getImageUrl(primaryImage);
  const hoverImageUrl = getImageUrl(secondaryImage);

  const ratingValue = averageRating;
  const ratingCount = reviewCount;

  return (
    <div className="group flex h-full flex-col bg-card p-2.5 text-card-foreground shadow-[0_5px_20px_rgba(0,0,0,0.08)] transition-shadow duration-300 hover:shadow-[0_12px_28px_rgba(0,0,0,0.14)]">
      <div>
        <div className="relative mb-3 aspect-4/5 overflow-hidden bg-muted group/image">
          <Link href={`/products/${slug}`} className="relative block w-full h-full">
            {mainImageUrl ? (
              <Image
                src={mainImageUrl}
                alt={name}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                priority={priority}
                quality={80}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <span className="text-muted-foreground/30 text-[10px] uppercase tracking-wider font-bold">No image</span>
              </div>
            )}

            {/* Hover secondary image */}
            {hoverImageUrl && (
              <Image
                src={hoverImageUrl}
                alt=""
                aria-hidden
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                quality={70}
              />
            )}

            {/* Badges — compact */}
            <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10 pointer-events-none">
              {newArrival && (
                <span className="bg-foreground text-background px-1.5 py-0.5 text-[8px] uppercase tracking-widest font-black">New</span>
              )}
              {bestSeller && !newArrival && (
                <span className="bg-foreground text-background px-1.5 py-0.5 text-[8px] uppercase tracking-widest font-black">Best Seller</span>
              )}
              {isOnSale && (
                <span className="bg-red-600 text-white px-1.5 py-0.5 text-[8px] uppercase tracking-widest font-black">Sale</span>
              )}
            </div>

            {/* Wishlist button */}
            <div className="absolute top-2 right-2 z-10 pointer-events-auto">
              <WishlistButton
                productId={id}
                name={name}
                price={displayPrice}
                image={mainImageUrl || ''}
                slug={slug}
              />
            </div>
          </Link>
          <ProductCardActions
            productId={id} name={name} slug={slug} price={displayPrice} image={mainImageUrl || ''}
            sizes={sizes} colors={colors} sizeStock={sizeStock} stockQty={stockQty}
          />
        </div>

        {/* Info details */}
        <div className="space-y-1">
          {categoryName && (
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
              {categoryName}
            </p>
          )}

          <Link href={`/products/${slug}`} className="block">
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 text-[12px] font-medium leading-snug text-foreground/90 hover:underline hover:underline-offset-4">
                {name}
              </h3>
              <div className="shrink-0 text-right">
                <p className={`text-xs font-bold ${isOnSale ? 'text-red-600 dark:text-red-400' : ''}`}>₹{displayPrice.toLocaleString()}</p>
                {isOnSale && price && <p className="text-[10px] text-muted-foreground line-through">₹{price.toLocaleString()}</p>}
              </div>
            </div>
          </Link>
          <div className="mt-1 flex items-center gap-1.5">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className={`h-3 w-3 ${star <= Math.round(ratingValue) ? 'fill-foreground text-foreground' : 'fill-muted text-muted-foreground'}`} />
              ))}
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">({ratingCount})</span>
          </div>
        </div>
      </div>
    </div>
  );
}
