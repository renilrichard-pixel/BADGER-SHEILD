import Link from 'next/link';
import { client } from '@/sanity/lib/client';
import { urlForImage } from '@/sanity/lib/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from 'lucide-react';
import { ProductSearch } from '@/components/product-search';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export const revalidate = 0;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string }> }) {
  const { category, q } = await searchParams;
  
  // Fetch categories for sidebar
  const categories = await client.fetch(`*[_type == "category"] | order(displayOrder asc)`);
  
  // Fetch products
  let productsQuery = `*[_type == "product"`;
  const queryParams: any = {};
  if (category) {
    productsQuery += ` && category->slug.current == $category`;
    queryParams.category = category;
  }
  const trimmedQ = q?.trim();
  const searchWords = trimmedQ ? trimmedQ.split(/\s+/).filter(Boolean) : [];
  if (searchWords.length > 0 && trimmedQ) {
    queryParams.q = trimmedQ;
    const matchClauses = searchWords.map((_, index) => {
      return `(name match $q${index} || description match $q${index} || category->name match $q${index} || colors match $q${index})`;
    });
    productsQuery += ` && ${matchClauses.join(' && ')}`;
    searchWords.forEach((word, index) => {
      queryParams[`q${index}`] = `*${word}*`;
    });
  }
  productsQuery += `] {
    _id,
    name,
    slug,
    price,
    images,
    newArrival,
    "categorySlug": category->slug.current
  }`;
  
  const products = await client.fetch(productsQuery, queryParams);

  return (
    <div className="container mx-auto px-4 py-8 md:py-16">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tighter">{category ? category.replace('-', ' ') : 'All Collection'}</h1>
          <p className="text-muted-foreground text-sm mt-1">{products.length} Products</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <ProductSearch />
          
          <div className="flex gap-2 w-full sm:w-auto">
            <Sheet>
              <SheetTrigger render={<Button variant="outline" className="md:hidden flex-1 rounded-none uppercase tracking-widest text-xs h-10 px-4" />}>
                Filters
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[350px] overflow-y-auto">
                <div className="space-y-8 mt-8">
                  <div>
                    <h3 className="font-semibold uppercase tracking-wider mb-4 text-sm">Categories</h3>
                    <ul className="space-y-2">
                      <li>
                        <Link href="/products" className="text-sm font-medium text-foreground transition-colors hover:text-muted-foreground">
                          All
                        </Link>
                      </li>
                      {categories.map((c: any) => (
                        <li key={c._id}>
                          <Link href={`/products?category=${c.slug?.current}`} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                            {c.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold uppercase tracking-wider mb-4 text-sm">Size</h3>
                    <div className="flex flex-wrap gap-2">
                      {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                        <div key={size} className="border border-border px-3 py-1 text-xs uppercase cursor-pointer hover:bg-foreground hover:text-background transition-colors">
                          {size}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold uppercase tracking-wider mb-4 text-sm">Color</h3>
                    <div className="flex flex-wrap gap-2">
                      <div className="w-6 h-6 rounded-full bg-black border border-border cursor-pointer"></div>
                      <div className="w-6 h-6 rounded-full bg-white border border-border cursor-pointer"></div>
                      <div className="w-6 h-6 rounded-full bg-gray-500 border border-border cursor-pointer"></div>
                      <div className="w-6 h-6 rounded-full bg-gray-200 border border-border cursor-pointer"></div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" className="flex-1 sm:flex-none rounded-none uppercase tracking-widest text-xs h-10 px-4" />}>
                Sort <ChevronDown className="ml-2 h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-none">
                <DropdownMenuItem className="text-xs uppercase tracking-widest cursor-pointer">Newest</DropdownMenuItem>
                <DropdownMenuItem className="text-xs uppercase tracking-widest cursor-pointer">Price: Low to High</DropdownMenuItem>
                <DropdownMenuItem className="text-xs uppercase tracking-widest cursor-pointer">Price: High to Low</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <aside className="hidden md:block space-y-8">
          <div>
            <h3 className="font-semibold uppercase tracking-wider mb-4 text-sm">Categories</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/products" className="text-sm font-medium text-foreground transition-colors hover:text-muted-foreground">
                  All
                </Link>
              </li>
              {categories.map((c: any) => (
                <li key={c._id}>
                  <Link href={`/products?category=${c.slug?.current}`} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold uppercase tracking-wider mb-4 text-sm">Size</h3>
            <div className="flex flex-wrap gap-2">
              {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                <div key={size} className="border border-border px-3 py-1 text-xs uppercase cursor-pointer hover:bg-foreground hover:text-background transition-colors">
                  {size}
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold uppercase tracking-wider mb-4 text-sm">Color</h3>
            <div className="flex flex-wrap gap-2">
              <div className="w-6 h-6 rounded-full bg-black border border-border cursor-pointer"></div>
              <div className="w-6 h-6 rounded-full bg-white border border-border cursor-pointer"></div>
              <div className="w-6 h-6 rounded-full bg-gray-500 border border-border cursor-pointer"></div>
              <div className="w-6 h-6 rounded-full bg-gray-200 border border-border cursor-pointer"></div>
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="md:col-span-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground uppercase tracking-widest text-xs">
                No products found matching your search.
              </div>
            ) : (
              products.map((product: any) => (
                <Link key={product._id} href={`/products/${product.slug?.current}`} className="group block">
                  <div className="aspect-[3/4] relative overflow-hidden bg-muted mb-4">
                    <img
                      src={product.images?.[0] ? urlForImage(product.images[0]) : ''}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 grayscale group-hover:grayscale-0"
                    />
                    {product.newArrival && (
                      <div className="absolute top-3 left-3 bg-foreground text-background px-2 py-1 text-xs uppercase tracking-widest font-semibold">
                        New
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{product.categorySlug?.replace('-', ' ')}</p>
                    <h3 className="font-medium text-sm md:text-base leading-tight">{product.name}</h3>
                    <p className="font-semibold">₹{product.price.toLocaleString()}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
          
          {products.length > 0 && (
            <div className="mt-12 flex justify-center">
              <Button variant="outline" className="rounded-none uppercase tracking-widest w-full sm:w-auto px-12">
                Load More
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
