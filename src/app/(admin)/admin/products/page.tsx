import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Trash, Package } from "lucide-react";
import { client } from "@/sanity/lib/client";
import { urlForImage } from "@/sanity/lib/image";
import type { SanityImageSource } from '@sanity/image-url';

interface AdminProduct {
  _id: string;
  name: string;
  price: number;
  image?: SanityImageSource;
  images?: SanityImageSource[];
  sizes?: string[];
  colors?: string[];
  categorySlug?: string;
}

export const revalidate = 0;

export default async function AdminProducts() {
  const products = await client.fetch<AdminProduct[]>(`*[_type == "product"] {
    _id,
    name,
    slug,
    price,
    image,
    images,
    sizes,
    colors,
    "categorySlug": category->slug.current
  }`);
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tighter uppercase">Products</h1>
        <Button className="rounded-none uppercase tracking-widest">
          <Plus className="w-4 h-4 mr-2" /> Add Product
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-background p-4 border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search products..." 
            className="pl-9 rounded-none border-none bg-muted/50 focus-visible:ring-0 focus-visible:bg-muted"
          />
        </div>
      </div>

      <div className="bg-background border border-border overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase tracking-widest bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-6 py-4 font-semibold">Product</th>
              <th className="px-6 py-4 font-semibold">Category</th>
              <th className="px-6 py-4 font-semibold">Price</th>
              <th className="px-6 py-4 font-semibold">Sizes</th>
              <th className="px-6 py-4 font-semibold">Colors</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((product) => {
              let resolvedImageUrl = null;
              if (product.image) {
                try {
                  resolvedImageUrl = urlForImage(product.image);
                } catch {}
              } else if (product.images?.[0]) {
                try {
                  resolvedImageUrl = urlForImage(product.images[0]);
                } catch {}
              }

              return (
                <tr key={product._id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-16 bg-muted shrink-0">
                        {resolvedImageUrl ? (
                          <img src={resolvedImageUrl} alt={product.name} className="w-full h-full object-cover grayscale" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <Package className="w-6 h-6 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">ID: {product._id.substring(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 capitalize">{product.categorySlug?.replace('-', ' ')}</td>
                  <td className="px-6 py-4">₹{product.price.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {product.sizes?.map((size: string) => (
                        <span key={size} className="px-1.5 py-0.5 bg-muted text-[10px] uppercase font-medium">{size}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex flex-wrap gap-1">
                      {product.colors?.map((color: string) => (
                        <span key={color} className="px-1.5 py-0.5 border border-border text-[10px] uppercase font-medium">{color}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
