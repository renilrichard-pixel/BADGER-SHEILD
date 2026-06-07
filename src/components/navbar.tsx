import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { client } from '@/sanity/lib/client';
import { createClient } from '@/lib/supabase/server';
import { NavbarLinks, MobileNavbarLinks, NavbarSearch, UserDropdown, CartButton } from './navbar-client';

export async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const categories = await client.fetch(
    `*[_type == "category"] | order(displayOrder asc)`,
    {},
    {
      useCdn: false,
      next: { revalidate: 0 }
    }
  );

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
              <MobileNavbarLinks categories={categories} />
            </SheetContent>
          </Sheet>
          
          <Link 
            href="/" 
            className="flex items-center space-x-2 transition-all duration-300 hover:opacity-80 hover:scale-[1.02] active:scale-[0.98] origin-left"
          >
            <span className="font-extrabold text-2xl md:text-[25px] tracking-[0.12em] uppercase">
              <span className="hidden sm:inline">BADGER SHIELD</span>
              <span className="sm:hidden tracking-[0.15em]">BS.</span>
            </span>
          </Link>
          <NavbarLinks categories={categories} />
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <NavbarSearch />
          <UserDropdown email={user?.email ?? null} />
          <CartButton />
        </div>
      </div>
    </header>
  );
}
