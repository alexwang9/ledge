'use client';

import * as React from 'react';
import { Check, ChevronDown, EyeOff } from 'lucide-react';

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

export interface SelectableCategory {
  id: string;
  name: string;
  type: 'EXPENSE' | 'INCOME' | 'SAVINGS_TRANSFER';
}

/** The user's choice: a category id, uncategorized (null), or ignore. */
export interface CategorySelection {
  budgetCategoryId: string | null;
  ignored: boolean;
}

interface CategorySelectorProps {
  budgetCategoryId: string | null;
  ignored?: boolean;
  categories: SelectableCategory[];
  /** Highlights the badge when the assignment was made manually. */
  isUserAssigned?: boolean;
  onSelect: (selection: CategorySelection) => void;
}

const GROUPS: Array<{ label: string; type: SelectableCategory['type'] }> = [
  { label: 'Income', type: 'INCOME' },
  { label: 'Expenses', type: 'EXPENSE' },
  { label: 'Savings & Transfers', type: 'SAVINGS_TRANSFER' },
];

export function CategorySelector({
  budgetCategoryId,
  ignored = false,
  categories,
  isUserAssigned,
  onSelect,
}: CategorySelectorProps) {
  const current = categories.find((c) => c.id === budgetCategoryId);
  const label = ignored ? 'Ignored' : current?.name ?? 'Uncategorized';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 hover:bg-white/[0.04] px-2 py-1 rounded-md transition-colors group">
          <Badge
            variant="secondary"
            className={cn(
              'cursor-pointer text-xs font-medium',
              ignored
                ? 'bg-white/[0.03] text-white/40 border border-white/[0.06]'
                : !current
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : isUserAssigned
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-white/[0.05] text-white/60 border border-white/[0.08]'
            )}
          >
            {label}
          </Badge>
          <ChevronDown className="h-3 w-3 text-white/30 group-hover:text-white/50 transition-colors" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-52 bg-[#0f0f0f] border-white/[0.08] max-h-80 overflow-y-auto"
        align="start"
      >
        {GROUPS.map((group, groupIndex) => {
          const groupCategories = categories.filter((c) => c.type === group.type);
          if (groupCategories.length === 0) return null;
          return (
            <React.Fragment key={group.type}>
              {groupIndex > 0 && <DropdownMenuSeparator className="bg-white/[0.06]" />}
              <DropdownMenuLabel className="text-white/40 text-xs font-medium">
                {group.label}
              </DropdownMenuLabel>
              {groupCategories.map((category) => (
                <DropdownMenuItem
                  key={category.id}
                  onClick={() => onSelect({ budgetCategoryId: category.id, ignored: false })}
                  className="text-white/70 focus:bg-white/[0.04] focus:text-white/90 cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-3.5 w-3.5',
                      !ignored && budgetCategoryId === category.id
                        ? 'opacity-100 text-emerald-400'
                        : 'opacity-0'
                    )}
                  />
                  {category.name}
                </DropdownMenuItem>
              ))}
            </React.Fragment>
          );
        })}
        <DropdownMenuSeparator className="bg-white/[0.06]" />
        <DropdownMenuItem
          onClick={() => onSelect({ budgetCategoryId: null, ignored: false })}
          className="text-white/50 focus:bg-white/[0.04] focus:text-white/80 cursor-pointer"
        >
          <Check
            className={cn(
              'mr-2 h-3.5 w-3.5',
              !ignored && budgetCategoryId === null ? 'opacity-100 text-amber-400' : 'opacity-0'
            )}
          />
          Uncategorized
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onSelect({ budgetCategoryId: null, ignored: true })}
          className="text-white/50 focus:bg-white/[0.04] focus:text-white/80 cursor-pointer"
        >
          <EyeOff
            className={cn(
              'mr-2 h-3.5 w-3.5',
              ignored ? 'opacity-100 text-white/60' : 'opacity-40'
            )}
          />
          Ignore
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
