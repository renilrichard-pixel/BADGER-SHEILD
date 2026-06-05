'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(error.message || 'Logout failed');
        return;
      }
      toast.success('Successfully logged out');
      router.push('/');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Logout failed');
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors text-muted-foreground hover:text-foreground w-full text-left cursor-pointer"
    >
      <LogOut className="w-4 h-4" />
      <span>Logout</span>
    </button>
  );
}
