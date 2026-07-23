import Link from 'next/link';
import Image from 'next/image';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { client } from '@/sanity/lib/client';
import { createClient } from '@/lib/supabase/server';
import { NavbarLinks, MobileNavbarLinks, NavbarSearch, UserDropdown, CartButton } from './navbar-client';
import { ThemeToggle } from './theme-toggle';

export async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const categories = await client.fetch(
    `*[_type == "category" && slug.current != "joggers"] | order(displayOrder asc)`,
    {},
    {
      useCdn: false,
      next: { revalidate: 0 }
    }
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-6">
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
            className="flex items-center transition-all duration-300 hover:opacity-80 hover:scale-[1.02] active:scale-[0.98] origin-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          >
            <Image
              src="/logo.png"
              alt="BADGER SHIELD Logo"
              width={768}
              height={117}
              priority
              className="h-[16px] min-[360px]:h-[18px] min-[375px]:h-[20px] min-[390px]:h-[22px] sm:h-[24px] md:h-[26px] lg:h-[30px] w-auto object-contain dark:invert"
            />
          </Link>
          <NavbarLinks categories={categories} />
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <NavbarSearch />
          <UserDropdown email={user?.email ?? null} />
          <CartButton />
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
