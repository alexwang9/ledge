'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const handleRemove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'min-w-[200px] justify-between bg-white/[0.03] border-white/[0.08] text-white/70 hover:bg-white/[0.06] hover:text-white/90 transition-colors',
            className
          )}
        >
          <div className="flex flex-wrap gap-1">
            {value.length > 0 ? (
              value.length <= 2 ? (
                value.map((v) => (
                  <Badge
                    key={v}
                    variant="secondary"
                    className="bg-white/[0.08] text-white/80 hover:bg-white/[0.12] border-0"
                  >
                    {options.find((o) => o.value === v)?.label}
                    <button
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onClick={(e) => handleRemove(v, e)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              ) : (
                <span className="text-white/70">{value.length} selected</span>
              )
            ) : (
              <span className="text-white/40">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-white/30" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0 bg-[#0f0f0f] border-white/[0.08]">
        <Command className="bg-[#0f0f0f]">
          <CommandInput
            placeholder="Search categories..."
            className="bg-[#0f0f0f] text-white border-white/[0.06]"
          />
          <CommandList>
            <CommandEmpty className="text-white/40 py-2 text-center text-sm">
              No categories found.
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleSelect(option.value)}
                  className="text-white/70 hover:bg-white/[0.04] focus:bg-white/[0.04] cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 text-emerald-400',
                      value.includes(option.value) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {value.length > 0 && (
            <div className="p-2 border-t border-white/[0.06]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange([])}
                className="w-full text-white/40 hover:text-white/80 hover:bg-white/[0.04]"
              >
                Clear all
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
