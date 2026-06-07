import Link from 'next/link';
import { client } from '@/sanity/lib/client';
import { Button } from '@/components/ui/button';
import { ProductControls } from '@/components/product-controls';
import { ProductCard } from '@/components/product-card';
import type { SanityImageSource } from '@sanity/image-url';
export const revalidate = 0;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; sort?: string }>;
}) {
  const { category, q, sort } = await searchParams;

  let productsQuery = `*[_type == "product" && active != false`;
  const queryParams: Record<string, string> = {};

  if (category) {
    productsQuery += ` && category->slug.current == $category`;
    queryParams.category = category;
  }

  const trimmedQ = q?.trim();
  const searchWords = trimmedQ ? trimmedQ.split(/\s+/).filter(Boolean) : [];
  if (searchWords.length > 0 && trimmedQ) {
    const matchClauses = searchWords.map((_, i) =>
      `(name match $q${i} || description match $q${i} || category->name match $q${i})`
    );
    productsQuery += ` && ${matchClauses.join(' && ')}`;
    searchWords.forEach((word, i) => { queryParams[`q${i}`] = `*${word}*`; });
  }

  let sortClause = '| order(_createdAt desc)';
  if (sort === 'price-asc') sortClause = '| order(price asc)';
  if (sort === 'price-desc') sortClause = '| order(price desc)';
  if (sort === 'name') sortClause = '| order(name asc)';

  productsQuery += `] ${sortClause} {
    _id, name, slug, price, salePrice,
    image, images,
    newArrival, bestSeller,
    "colors": colors[].name,
    "colorHexes": colors[].hex,
    "sizes": sizes,
    "categorySlug": category->slug.current,
    "categoryName": category->name,
    "stockQty": stock
  }`;

  const products = await client.fetch(productsQuery, queryParams);

  type SanityProduct = {
    _id: string;
    name: string;
    slug: { current: string };
    price: number;
    salePrice?: number;
    image?: SanityImageSource;
    images?: SanityImageSource[];
    newArrival?: boolean;
    bestSeller?: boolean;
    colors?: string[];
    colorHexes?: string[];
    sizes?: string[];
    stockQty?: number;
    categorySlug?: string;
    categoryName?: string;
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">


      <div className="w-full">
        {/* Product Grid Panel */}
        <main className="w-full">
          {products.length > 0 && (
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-border/40">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                Showing {products.length} {products.length === 1 ? 'product' : 'products'}
              </span>
              <ProductControls category={category} sort={sort} />
            </div>
          )}
          {products.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-5xl mb-5">🛍️</p>
              <p className="font-semibold uppercase tracking-wider mb-2">No products found</p>
              <p className="text-xs text-muted-foreground mb-6">Try a different category or clear your search.</p>
              <Link href="/products"
                className="inline-block border border-foreground px-10 py-3 text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors">
                View All
              </Link>
            </div>
          ) : (
            <>
              {/* Dense grid layout to reduce card sizes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
                {products.map((product: SanityProduct) => (
                  <ProductCard
                    key={product._id}
                    id={product._id}
                    name={product.name}
                    slug={product.slug?.current || ''}
                    price={product.price}
                    salePrice={product.salePrice}
                    image={product.image}
                    images={product.images}
                    newArrival={product.newArrival}
                    bestSeller={product.bestSeller}
                    colors={product.colors}
                    colorHexes={product.colorHexes}
                    sizes={product.sizes}
                    stockQty={product.stockQty}
                    categoryName={product.categoryName || product.categorySlug?.replace(/-/g, ' ')}
                  />
                ))}
              </div>

              {products.length >= 20 && (
                <div className="mt-16 flex justify-center">
                  <Button variant="outline" className="rounded-none uppercase tracking-widest px-16 h-12">
                    Load More
                  </Button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
