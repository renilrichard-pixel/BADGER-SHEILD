import Link from 'next/link';
import { ShoppingBag, Search, User, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { client } from '@/sanity/lib/client';
import { ThemeToggle } from './theme-toggle';
import { createClient } from '@/lib/supabase/server';

export async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const categories = await client.fetch(`*[_type == "category"] | order(displayOrder asc)`);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col gap-4 mt-8">
                {categories.map((category: any) => (
                  <Link
                    key={category._id}
                    href={`/products?category=${category.slug?.current}`}
                    className="block px-2 py-1 text-lg font-medium hover:text-primary transition-colors"
                  >
                    {category.name}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          
          <Link 
            href="/" 
            className="flex items-center space-x-2 transition-all duration-300 hover:opacity-80 hover:scale-[1.02] active:scale-[0.98] origin-left"
          >
            <span className="font-extrabold text-2xl md:text-[25px] tracking-[0.12em] uppercase">
              BADGER SHIELD
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 ml-6">
            {categories.slice(0, 4).map((category: any) => (
              <Link
                key={category._id}
                href={`/products?category=${category.slug?.current}`}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider"
              >
                {category.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <ThemeToggle />
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex" render={<Link href="/products?focus=true" />} nativeButton={false}>
            <Search className="h-5 w-5" />
            <span className="sr-only">Search</span>
          </Button>
          <Button variant="ghost" size="icon" render={<Link href={user ? '/admin' : '/login'} />} nativeButton={false}>
            <User className="h-5 w-5" />
            <span className="sr-only">Account</span>
          </Button>
          <Button variant="ghost" size="icon" className="relative" render={<Link href="/cart" />} nativeButton={false}>
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
            <span className="sr-only">Cart</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
