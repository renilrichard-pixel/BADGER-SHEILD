import { client } from '@/sanity/lib/client';
import { urlForImage } from '@/sanity/lib/image';
import { notFound } from 'next/navigation';
import ProductClient from './client';

export const revalidate = 0; // Disable static rendering to always fetch fresh DB data

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  const productData = await client.fetch(`
    *[_type == "product" && slug.current == $slug][0] {
      ...,
      "categorySlug": category->slug.current
    }
  `, { slug });
    
  if (!productData) {
    notFound();
  }

  // Map Sanity schema to what the client component expects
  const product = {
    ...productData,
    sizes_available: productData.sizes || [],
    colors_available: productData.colors || [],
    fabric: productData.material,
    stock: productData.stockQuantity,
    categories: { slug: productData.categorySlug },
    images: productData.images ? productData.images.map((img: any) => urlForImage(img)) : []
  };

  return <ProductClient product={product} />;
}
