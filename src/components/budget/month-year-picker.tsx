'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const FULL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** 'annual' shows the Jan–Dec grid; a month index scopes to that month. */
export type BudgetView = 'annual' | number;

interface MonthYearPickerProps {
  year: number;
  view: BudgetView;
  onYearChange: (year: number) => void;
  onViewChange: (view: BudgetView) => void;
}

const YEARS_BACK = 5;

export function MonthYearPicker({ year, view, onYearChange, onViewChange }: MonthYearPickerProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: YEARS_BACK }, (_, i) => currentYear - i);

  return (
    <div className="flex items-center gap-2">
      <Select
        value={view === 'annual' ? 'annual' : view.toString()}
        onValueChange={(v) => onViewChange(v === 'annual' ? 'annual' : parseInt(v, 10))}
      >
        <SelectTrigger className="w-32 bg-white/[0.05] border-white/[0.08] text-white/80 text-sm hover:bg-white/[0.08] transition-colors">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#0a0a0a] border-white/[0.08]">
          <SelectItem value="annual" className="text-white/80 focus:bg-white/[0.06] focus:text-white">
            Annual
          </SelectItem>
          {FULL_MONTHS.map((month, index) => (
            <SelectItem
              key={month}
              value={index.toString()}
              className="text-white/80 focus:bg-white/[0.06] focus:text-white"
            >
              {month}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={year.toString()} onValueChange={(v) => onYearChange(parseInt(v, 10))}>
        <SelectTrigger className="w-24 bg-white/[0.05] border-white/[0.08] text-white/80 text-sm hover:bg-white/[0.08] transition-colors">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#0a0a0a] border-white/[0.08]">
          {years.map((y) => (
            <SelectItem
              key={y}
              value={y.toString()}
              className="text-white/80 focus:bg-white/[0.06] focus:text-white"
            >
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
