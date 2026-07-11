'use client';

import { AlertCircle, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

interface UncategorizedBannerProps {
  count: number;
  totalNet: number;
  onClick: () => void;
}

/** Visible only when uncategorized transactions exist for the selected year. */
export function UncategorizedBanner({ count, totalNet, onClick }: UncategorizedBannerProps) {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full sm:w-auto px-4 py-2.5 rounded-lg bg-amber-500/[0.08] border border-amber-500/[0.2] hover:bg-amber-500/[0.12] transition-colors group"
    >
      <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
      <span className="text-sm text-amber-300/90">
        {count} uncategorized transaction{count === 1 ? '' : 's'}
        <span className="text-amber-300/50"> · {formatCurrency(Math.abs(totalNet))}</span>
      </span>
      <ChevronRight className="h-4 w-4 text-amber-400/50 group-hover:translate-x-0.5 transition-transform ml-auto" />
    </button>
  );
}
