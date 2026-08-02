import { cache } from 'react';
import type { Metadata } from 'next';
import { client } from '@/sanity/lib/client';
import { urlForImage } from '@/sanity/lib/image';
import { notFound } from 'next/navigation';
import ProductClient from './client';
import type { SanityImageSource } from '@sanity/image-url';
import { getCachedProductReviewAggregate } from '@/lib/reviews';
import { RatingsProvider } from '@/context/RatingsContext';
import type { SizeStockEntry } from '@/lib/sizeStock';

interface ProductData {
  _id: string;
  name?: string;
  slug?: { current: string };
  description?: string;
  price: number;
  salePrice?: number;
  stock?: number;
  sizeStock?: SizeStockEntry[];
  rating?: number;
  material?: string;
  sizes?: string[];
  colors?: { name: string; hex?: string }[];
  image?: SanityImageSource;
  images?: SanityImageSource[];
  newArrival?: boolean;
  bestSeller?: boolean;
  categorySlug?: string;
  categoryName?: string;
  averageRating?: number;
  reviewCount?: number;
}

export const revalidate = 0;

// React cache wrapper to deduplicate calls to getProduct during render lifecycle
const getProduct = cache(async (slug: string): Promise<ProductData | null> => {
  return await client.fetch<ProductData | null>(`
    *[_type == "product" && slug.current == $slug][0] {
      _id,
      name,
      slug,
      description,
      price,
      salePrice,
      stock,
      sizeStock[] { size, quantity },
      rating,
      material,
      sizes,
      colors[] { name, hex },
      image,
      images,
      newArrival,
      bestSeller,
      "categorySlug": category->slug.current,
      "categoryName": category->name
    }
  `, { slug });
});

// Strips HTML, markdown, normalize spaces, and truncates to 150-160 characters
function cleanDescription(desc?: string): string {
  if (!desc) return 'Minimalist luxury t-shirts and clothing.';
  let clean = desc.replace(/<\/?[^>]+(>|$)/g, ""); // strip HTML
  clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"); // strip markdown links
  clean = clean.replace(/[*_#`~]/g, ""); // strip bold, italics, headers
  clean = clean.replace(/\s+/g, " ").trim(); // normalize spaces
  if (clean.length > 155) {
    return clean.slice(0, 152) + '...';
  }
  return clean;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product || product.categorySlug === 'joggers') {
    return {
      title: 'Product Not Found | BADGER SHEILD',
      description: 'The requested product could not be found.',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${product.name || 'Product'} | BADGER SHEILD`;
  const descriptionText = cleanDescription(product.description);
  
  // Resolve primary image absolute URL
  let imageUrl = '';
  if (product.image) {
    try {
      imageUrl = urlForImage(product.image);
    } catch {}
  } else if (product.images && product.images.length > 0) {
    try {
      imageUrl = urlForImage(product.images[0]);
    } catch {}
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com';
  const canonicalUrl = `${siteUrl}/products/${slug}`;

  return {
    title,
    description: descriptionText,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      description: descriptionText,
      url: canonicalUrl,
      images: imageUrl ? [{ url: imageUrl, alt: product.name || '' }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: descriptionText,
      images: imageUrl ? [imageUrl] : [],
    },
    other: {
      'og:type': 'product',
    },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const productData = await getProduct(slug);

  if (!productData || productData.categorySlug === 'joggers') notFound();

  // Combine single 'image' (if set) and the 'images' gallery
  const resolvedImages: string[] = [];
  if (productData.image) {
    try {
      resolvedImages.push(urlForImage(productData.image));
    } catch {}
  }
  if (productData.images && Array.isArray(productData.images)) {
    productData.images.forEach((img) => {
      try {
        resolvedImages.push(urlForImage(img));
      } catch {}
    });
  }

  // Fetch the product review aggregate from database aggregation layer (cached)
  const aggregate = await getCachedProductReviewAggregate(productData._id);

  const product = {
    ...productData,
    images: resolvedImages,
    averageRating: aggregate.averageRating,
    reviewCount: aggregate.reviewCount,
  };

  return (
    <RatingsProvider>
      <ProductClient product={product} />
    </RatingsProvider>
  );
}
