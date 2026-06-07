'use client';

import React from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { WishlistButton } from '@/components/wishlist-button';
import { QuickAdd } from '@/components/quick-add';
import { useRatings } from '@/context/RatingsContext';
import { urlFor } from '@/sanity/lib/image';
import type { SanityImageSource } from '@sanity/image-url';

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
  stockQty?: number;
  categoryName?: string;
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
  colorHexes,
  sizes,
  stockQty = 99,
  categoryName,
}: ProductCardProps) {
  const displayPrice = salePrice ?? price;
  const isOnSale = !!salePrice && salePrice < price;
  const outOfStock = stockQty === 0;

  const primaryImage = image ?? images?.[0] ?? null;
  const secondaryImage = images?.[1] ?? null;
  const mainImageUrl = getImageUrl(primaryImage);
  const hoverImageUrl = getImageUrl(secondaryImage);

  const { ratings } = useRatings();
  const productRating = ratings[id];
  const ratingValue = productRating?.rate ?? 0;
  const ratingCount = productRating?.count ?? 0;

  return (
    <div className="group flex flex-col justify-between h-full bg-card text-card-foreground">
      <div>
        <div className="relative mb-3 aspect-[4/5] overflow-hidden bg-muted group/image border border-border/10">
          <Link href={`/products/${slug}`} className="block w-full h-full">
            {mainImageUrl ? (
              <img
                src={mainImageUrl}
                alt={name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <span className="text-muted-foreground/30 text-[10px] uppercase tracking-wider font-bold">No image</span>
              </div>
            )}

            {/* Hover secondary image */}
            {hoverImageUrl && (
              <img
                src={hoverImageUrl}
                alt=""
                aria-hidden
                className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                loading="lazy"
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
              {outOfStock && (
                <span className="bg-muted-foreground text-background px-1.5 py-0.5 text-[8px] uppercase tracking-widest font-black">Sold Out</span>
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

          {/* Quick Add Overlay */}
          <QuickAdd
            productId={id}
            name={name}
            price={displayPrice}
            image={mainImageUrl || ''}
            slug={slug}
            sizes={sizes}
            colors={colors}
            stockQty={stockQty}
          />
        </div>

        {/* Info details */}
        <div className="space-y-1">
          {categoryName && (
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
              {categoryName}
            </p>
          )}

          {/* Star Rating summary if there are reviews */}
          {ratingCount > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3 h-3 ${
                      star <= Math.round(ratingValue)
                        ? 'fill-foreground text-foreground'
                        : 'fill-muted text-muted-foreground'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                ({ratingCount})
              </span>
            </div>
          )}

          <Link href={`/products/${slug}`} className="block">
            <h3 className="text-[12px] font-medium leading-snug hover:underline underline-offset-4 line-clamp-2 text-foreground/90">
              {name}
            </h3>
          </Link>

          {/* Color dots */}
          {colorHexes && colorHexes.length > 0 && (
            <div className="flex gap-1 pt-0.5">
              {colorHexes.slice(0, 5).map((hex, i) => (
                <span
                  key={i}
                  title={colors?.[i] || ''}
                  className="w-2.5 h-2.5 rounded-full border border-border/60 shrink-0"
                  style={{ backgroundColor: hex || '#808080' }}
                />
              ))}
              {colorHexes.length > 5 && (
                <span className="text-[8px] text-muted-foreground self-center">+{colorHexes.length - 5}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Price & Title (aligned to the bottom of the card) */}
      <div className="mt-3">
        <Link href={`/products/${slug}`} className="block">
          <div className="flex items-center gap-2">
            <p className={`text-xs font-bold ${isOnSale ? 'text-red-600 dark:text-red-400' : ''}`}>
              ₹{displayPrice.toLocaleString()}
            </p>
            {isOnSale && price && (
              <p className="text-[10px] text-muted-foreground line-through">₹{price.toLocaleString()}</p>
            )}
          </div>
        </Link>
      </div>
    </div>
  );
}
