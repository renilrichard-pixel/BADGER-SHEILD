import { client } from '@/sanity/lib/client';
import { urlForImage } from '@/sanity/lib/image';
import { notFound } from 'next/navigation';
import ProductClient from './client';
import type { SanityImageSource } from '@sanity/image-url';

interface ProductData {
  _id: string;
  name?: string;
  slug?: { current: string };
  description?: string;
  price: number;
  salePrice?: number;
  stock?: number;
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
}

export const revalidate = 0;

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const productData = await client.fetch<ProductData | null>(`
    *[_type == "product" && slug.current == $slug][0] {
      _id,
      name,
      slug,
      description,
      price,
      salePrice,
      stock,
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

  if (!productData) notFound();

  // Combine single 'image' (if set) and the 'images' gallery
  const resolvedImages: string[] = [];
  if (productData.image) {
    try {
      resolvedImages.push(urlForImage(productData.image));
    } catch {
    }
  }
  if (productData.images && Array.isArray(productData.images)) {
    productData.images.forEach((img) => {
      try {
        resolvedImages.push(urlForImage(img));
      } catch {
      }
    });
  }

  const product = {
    ...productData,
    images: resolvedImages,
  };

  return <ProductClient product={product} />;
}
