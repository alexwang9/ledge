'use client';

import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface Category {
  id: string;
  name: string;
  type: 'EXPENSE' | 'INCOME';
}

interface CategorySelectorProps {
  value: string;
  categories: Category[];
  hasOverride?: boolean;
  onSelect: (category: string) => void;
}

export function CategorySelector({
  value,
  categories,
  hasOverride,
  onSelect,
}: CategorySelectorProps) {
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');
  const incomeCategories = categories.filter((c) => c.type === 'INCOME');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 hover:bg-white/[0.04] px-2 py-1 rounded-md transition-colors group">
          <Badge
            variant="secondary"
            className={cn(
              'cursor-pointer text-xs font-medium',
              hasOverride
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-white/[0.05] text-white/60 border border-white/[0.08]'
            )}
          >
            {value}
          </Badge>
          <ChevronDown className="h-3 w-3 text-white/30 group-hover:text-white/50 transition-colors" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-48 bg-[#0f0f0f] border-white/[0.08] max-h-80 overflow-y-auto"
        align="start"
      >
        <DropdownMenuLabel className="text-white/40 text-xs font-medium">
          Expenses
        </DropdownMenuLabel>
        {expenseCategories.map((category) => (
          <DropdownMenuItem
            key={category.id}
            onClick={() => onSelect(category.name)}
            className="text-white/70 focus:bg-white/[0.04] focus:text-white/90 cursor-pointer"
          >
            <Check
              className={cn(
                'mr-2 h-3.5 w-3.5',
                value === category.name ? 'opacity-100 text-emerald-400' : 'opacity-0'
              )}
            />
            {category.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-white/[0.06]" />
        <DropdownMenuLabel className="text-white/40 text-xs font-medium">
          Income
        </DropdownMenuLabel>
        {incomeCategories.map((category) => (
          <DropdownMenuItem
            key={category.id}
            onClick={() => onSelect(category.name)}
            className="text-white/70 focus:bg-white/[0.04] focus:text-white/90 cursor-pointer"
          >
            <Check
              className={cn(
                'mr-2 h-3.5 w-3.5',
                value === category.name ? 'opacity-100 text-emerald-400' : 'opacity-0'
              )}
            />
            {category.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
