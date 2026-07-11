'use client';

import { useEffect, useRef, useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDelta } from '@/lib/format';
import {
  annualBudget,
  delta,
  isFavorableDelta,
  MONTHS_PER_YEAR,
  type BudgetCategoryView,
  type SectionTotals,
} from '@/lib/budget-math';
import type { BudgetView } from './month-year-picker';
import { cn } from '@/lib/utils';

export type SectionTint = 'emerald' | 'rose' | 'sky';

// Static class strings so Tailwind can see them at build time.
const TINTS: Record<SectionTint, { header: string; subtotal: string; text: string }> = {
  emerald: {
    header: 'bg-emerald-500/[0.05]',
    subtotal: 'bg-emerald-500/[0.08]',
    text: 'text-emerald-400',
  },
  rose: {
    header: 'bg-rose-500/[0.05]',
    subtotal: 'bg-rose-500/[0.08]',
    text: 'text-rose-400',
  },
  sky: {
    header: 'bg-sky-500/[0.05]',
    subtotal: 'bg-sky-500/[0.08]',
    text: 'text-sky-400',
  },
};

export function columnCount(view: BudgetView): number {
  // Annual: Category | Monthly Budget | Jan..Dec | Annual Actual | Annual Budget | Δ
  // Month:  Category | Budget | Actual | Δ
  return view === 'annual' ? MONTHS_PER_YEAR + 5 : 4;
}

function DeltaCell({
  value,
  type,
  bold,
}: {
  value: number | null;
  type: BudgetCategoryView['type'];
  bold?: boolean;
}) {
  const color =
    value === null
      ? 'text-white/30'
      : isFavorableDelta(type, value)
        ? 'text-emerald-400'
        : 'text-rose-400';
  return (
    <TableCell className={cn('text-right tabular-nums', color, bold && 'font-semibold')}>
      {formatDelta(value)}
    </TableCell>
  );
}

function InlineBudgetCell({
  value,
  onSave,
}: {
  value: number | null;
  onSave: (newValue: number | null) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmed = editValue.trim();
    const parsed = trimmed === '' ? null : parseFloat(trimmed);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
      setIsEditing(false);
      return;
    }
    if (parsed !== value) {
      setSaving(true);
      try {
        await onSave(parsed);
      } finally {
        setSaving(false);
      }
    }
    setIsEditing(false);
  };

  return (
    <TableCell className="text-right tabular-nums text-white/60">
      {isEditing ? (
        <input
          ref={inputRef}
          type="number"
          min="0"
          step="0.01"
          value={editValue}
          disabled={saving}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') setIsEditing(false);
          }}
          className="w-24 bg-white/[0.06] border border-white/[0.15] rounded px-1.5 py-0.5 text-right text-sm text-white outline-none"
        />
      ) : (
        <button
          onClick={() => {
            setEditValue(value?.toString() ?? '');
            setIsEditing(true);
          }}
          className="hover:bg-white/[0.06] px-1.5 py-0.5 rounded transition-colors cursor-text"
          title="Click to edit monthly budget"
        >
          {value === null ? <span className="text-white/25">—</span> : formatCurrency(value)}
        </button>
      )}
    </TableCell>
  );
}

interface BudgetSectionProps {
  title: string;
  categories: BudgetCategoryView[];
  actualsByCategory: Record<string, number[]>;
  totals: SectionTotals;
  view: BudgetView;
  tint: SectionTint;
  onCategoryClick: (category: BudgetCategoryView) => void;
  onBudgetSave: (categoryId: string, monthlyLimit: number | null) => Promise<void>;
}

export function BudgetSection({
  title,
  categories,
  actualsByCategory,
  totals,
  view,
  tint,
  onCategoryClick,
  onBudgetSave,
}: BudgetSectionProps) {
  const tintClasses = TINTS[tint];
  const type = categories[0]?.type ?? 'EXPENSE';

  const monthCell = (amount: number, key: number | string, className = 'text-white/60') => (
    <TableCell key={key} className={cn('text-right tabular-nums', className)}>
      {amount !== 0 ? formatCurrency(amount) : <span className="text-white/20">–</span>}
    </TableCell>
  );

  return (
    <>
      {/* Section header */}
      <TableRow className={cn('border-white/[0.06]', tintClasses.header)}>
        <TableCell
          colSpan={columnCount(view)}
          className={cn('font-medium uppercase text-xs tracking-wider', tintClasses.text)}
        >
          {title}
        </TableCell>
      </TableRow>

      {/* Category rows */}
      {categories.map((category) => {
        const actuals = actualsByCategory[category.id] ?? [];
        const annualActual = actuals.reduce((sum, v) => sum + v, 0);
        return (
          <TableRow
            key={category.id}
            className="border-white/[0.06] hover:bg-white/[0.02] transition-colors"
          >
            <TableCell className="sticky left-0 bg-[#0a0a0a] p-0">
              <button
                onClick={() => onCategoryClick(category)}
                className="w-full text-left px-4 py-2 text-white/70 hover:text-white hover:underline decoration-white/30 underline-offset-2 transition-colors"
                title={`View ${category.name} transactions`}
              >
                {category.name}
              </button>
            </TableCell>
            {view === 'annual' ? (
              <>
                <InlineBudgetCell
                  value={category.monthlyLimit}
                  onSave={(v) => onBudgetSave(category.id, v)}
                />
                {Array.from({ length: MONTHS_PER_YEAR }, (_, m) =>
                  monthCell(actuals[m] ?? 0, m)
                )}
                {monthCell(annualActual, 'annual', cn('font-medium bg-white/[0.02]', tintClasses.text))}
                <TableCell className="text-right tabular-nums text-white/50 bg-white/[0.02]">
                  {category.monthlyLimit === null ? (
                    <span className="text-white/25">—</span>
                  ) : (
                    formatCurrency(annualBudget(category.monthlyLimit)!)
                  )}
                </TableCell>
                <DeltaCell
                  value={delta(annualActual, annualBudget(category.monthlyLimit))}
                  type={category.type}
                />
              </>
            ) : (
              <>
                <InlineBudgetCell
                  value={category.monthlyLimit}
                  onSave={(v) => onBudgetSave(category.id, v)}
                />
                {monthCell(actuals[view] ?? 0, 'actual')}
                <DeltaCell
                  value={delta(actuals[view] ?? 0, category.monthlyLimit)}
                  type={category.type}
                />
              </>
            )}
          </TableRow>
        );
      })}

      {/* Subtotal row */}
      <TableRow className={cn('border-white/[0.06]', tintClasses.subtotal)}>
        <TableCell className={cn('sticky left-0 font-medium', tintClasses.subtotal, tintClasses.text)}>
          Total {title}
        </TableCell>
        {view === 'annual' ? (
          <>
            <TableCell className={cn('text-right tabular-nums font-medium', tintClasses.text)}>
              {formatCurrency(totals.monthlyBudget)}
            </TableCell>
            {totals.monthlyActuals.map((amount, m) =>
              monthCell(amount, m, cn('font-medium', tintClasses.text))
            )}
            {monthCell(totals.annualActual, 'annual', cn('font-semibold', tintClasses.text))}
            <TableCell className={cn('text-right tabular-nums font-medium', tintClasses.text)}>
              {formatCurrency(totals.annualBudget)}
            </TableCell>
            <DeltaCell value={delta(totals.annualActual, totals.annualBudget)} type={type} bold />
          </>
        ) : (
          <>
            <TableCell className={cn('text-right tabular-nums font-medium', tintClasses.text)}>
              {formatCurrency(totals.monthlyBudget)}
            </TableCell>
            {monthCell(totals.monthlyActuals[view], 'actual', cn('font-semibold', tintClasses.text))}
            <DeltaCell
              value={delta(totals.monthlyActuals[view], totals.monthlyBudget)}
              type={type}
              bold
            />
          </>
        )}
      </TableRow>

      {/* Spacer */}
      <TableRow className="border-transparent">
        <TableCell colSpan={columnCount(view)} className="h-3 p-0" />
      </TableRow>
    </>
  );
}
