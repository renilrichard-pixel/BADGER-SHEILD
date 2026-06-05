import Link from 'next/link';
import { LayoutDashboard, Package, ShoppingCart, Users, Settings, Tag, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { LogoutButton } from '@/components/logout-button';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-background hidden md:block">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link href="/admin" className="font-bold tracking-tighter uppercase">Admin Panel</Link>
        </div>
        <nav className="p-4 flex flex-col gap-2">
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Link>
          <Link href="/admin/products" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors">
            <Package className="w-4 h-4" /> Products
          </Link>
          <Link href="/admin/orders" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors">
            <ShoppingCart className="w-4 h-4" /> Orders
          </Link>
          <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors">
            <Users className="w-4 h-4" /> Users
          </Link>
          <Link href="/admin/coupons" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors">
            <Tag className="w-4 h-4" /> Coupons
          </Link>
          <Link href="/admin/settings" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors mt-8">
            <Settings className="w-4 h-4" /> Settings
          </Link>
          <LogoutButton />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="h-16 border-b border-border bg-background flex items-center justify-between px-6 md:hidden">
          <span className="font-bold tracking-tighter uppercase">Admin</span>
          
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" />}>
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-[250px] p-0 bg-background">
              <div className="h-16 flex items-center px-6 border-b border-border">
                <Link href="/admin" className="font-bold tracking-tighter uppercase">Admin Panel</Link>
              </div>
              <nav className="p-4 flex flex-col gap-2">
                <Link href="/admin" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Link>
                <Link href="/admin/products" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors">
                  <Package className="w-4 h-4" /> Products
                </Link>
                <Link href="/admin/orders" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors">
                  <ShoppingCart className="w-4 h-4" /> Orders
                </Link>
                <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors">
                  <Users className="w-4 h-4" /> Users
                </Link>
                <Link href="/admin/coupons" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors">
                  <Tag className="w-4 h-4" /> Coupons
                </Link>
                <Link href="/admin/settings" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors mt-8">
                  <Settings className="w-4 h-4" /> Settings
                </Link>
                <LogoutButton />
              </nav>
            </SheetContent>
          </Sheet>
        </header>
        <div className="p-6 md:p-8 flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
