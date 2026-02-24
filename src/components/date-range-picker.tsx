'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  className?: string;
}

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-[280px] justify-start text-left font-normal bg-white/[0.03] border-white/[0.08] text-white/70 hover:bg-white/[0.06] hover:text-white/90 transition-colors',
              !value && 'text-white/40'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-white/40" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, 'LLL dd, y')} -{' '}
                  {format(value.to, 'LLL dd, y')}
                </>
              ) : (
                format(value.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-[#0f0f0f] border-white/[0.08]" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={onChange}
            numberOfMonths={2}
            className="bg-[#0f0f0f] text-white"
          />
          {value && (
            <div className="p-3 border-t border-white/[0.06]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange(undefined)}
                className="w-full text-white/40 hover:text-white/80 hover:bg-white/[0.04]"
              >
                Clear dates
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
