'use client';

import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type FlowType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

interface FlowSelectorProps {
  value: FlowType;
  hasOverride?: boolean;
  amount: number;
  formattedAmount: string;
  onSelect: (flow: FlowType) => void;
}

const FLOW_OPTIONS: { value: FlowType; label: string }[] = [
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'INCOME', label: 'Income' },
  { value: 'TRANSFER', label: 'Transfer' },
];

function flowStyle(flow: FlowType): string {
  switch (flow) {
    case 'INCOME':
      return 'text-emerald-400';
    case 'TRANSFER':
      return 'text-slate-400';
    case 'EXPENSE':
    default:
      return 'text-rose-400';
  }
}

function flowPrefix(flow: FlowType, amount: number): string {
  if (flow === 'TRANSFER') return '↔ ';
  if (flow === 'INCOME') return '+';
  // EXPENSE: only show "−" for positive amounts (Plaid's outflow convention).
  // Negative amounts on credit cards are refunds — let the sign speak for itself.
  return amount >= 0 ? '−' : '';
}

export function FlowSelector({
  value,
  hasOverride,
  amount,
  formattedAmount,
  onSelect,
}: FlowSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-1 hover:bg-white/[0.04] px-2 py-1 rounded-md transition-colors group font-medium',
            flowStyle(value)
          )}
          title={hasOverride ? 'Flow type overridden' : 'Click to change flow type'}
        >
          <span>{flowPrefix(value, amount)}{formattedAmount}</span>
          {hasOverride && <span className="text-[10px] opacity-60">✓</span>}
          <ChevronDown className="h-3 w-3 opacity-40 group-hover:opacity-70 transition-opacity" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-40 bg-[#0f0f0f] border-white/[0.08]"
        align="end"
      >
        <DropdownMenuLabel className="text-white/40 text-xs font-medium">
          Flow type
        </DropdownMenuLabel>
        {FLOW_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className="text-white/70 focus:bg-white/[0.04] focus:text-white/90 cursor-pointer"
          >
            <Check
              className={cn(
                'mr-2 h-3.5 w-3.5',
                value === opt.value ? 'opacity-100 text-emerald-400' : 'opacity-0'
              )}
            />
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
