'use client';

import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';

interface ProductControlsProps {
  category?: string;
  sort?: string;
}

const SORT_LABELS: Record<string, string> = {
  '': 'Newest',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
  'name': 'Name A–Z',
};

export function ProductControls({ category, sort }: ProductControlsProps) {
  const router = useRouter();
  const currentSort = sort || '';

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (value) params.set('sort', value);
    router.push(`/products${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <div className="flex items-center gap-2 w-full sm:w-auto">
      <DropdownMenu>
        <DropdownMenuTrigger render={
          <button className="inline-flex items-center gap-1.5 border border-input bg-background h-10 px-3 text-[11px] uppercase tracking-widest rounded-none hover:bg-accent hover:text-accent-foreground transition-colors shrink-0">
            {SORT_LABELS[currentSort]} <ChevronDown className="w-3 h-3" />
          </button>
        } />
        <DropdownMenuContent align="end" className="rounded-none min-w-[180px]">
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <DropdownMenuItem
              key={value}
              className={`text-[11px] uppercase tracking-widest cursor-pointer ${currentSort === value ? 'font-bold' : ''}`}
              onClick={() => handleSortChange(value)}
            >
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
