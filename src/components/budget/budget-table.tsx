'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatDelta } from '@/lib/format';
import {
  delta,
  netCashFlow,
  sectionTotals,
  MONTHS_PER_YEAR,
  type BudgetCategoryView,
} from '@/lib/budget-math';
import { BudgetSection, columnCount } from './budget-section';
import type { BudgetView } from './month-year-picker';
import { cn } from '@/lib/utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface BudgetTableProps {
  categories: BudgetCategoryView[];
  actualsByCategory: Record<string, number[]>;
  view: BudgetView;
  onCategoryClick: (category: BudgetCategoryView) => void;
  onBudgetSave: (categoryId: string, monthlyLimit: number | null) => Promise<void>;
}

export function BudgetTable({
  categories,
  actualsByCategory,
  view,
  onCategoryClick,
  onBudgetSave,
}: BudgetTableProps) {
  const income = sectionTotals(categories, actualsByCategory, 'INCOME');
  const expenses = sectionTotals(categories, actualsByCategory, 'EXPENSE');
  const savings = sectionTotals(categories, actualsByCategory, 'SAVINGS_TRANSFER');
  const net = netCashFlow(income, expenses, savings);

  const headCell = (label: string, extra = '') => (
    <TableHead key={label} className={cn('text-white/40 text-right min-w-[92px]', extra)}>
      {label}
    </TableHead>
  );

  const netMonthCell = (amount: number, key: number | string, bold = false) => (
    <TableCell
      key={key}
      className={cn(
        'text-right tabular-nums font-medium',
        amount >= 0 ? 'text-emerald-400' : 'text-rose-400',
        bold && 'font-semibold'
      )}
    >
      {amount !== 0 ? formatCurrency(amount) : <span className="text-white/20">–</span>}
    </TableCell>
  );

  const sectionProps = { actualsByCategory, view, onCategoryClick, onBudgetSave };

  return (
    <div className="overflow-x-auto scrollbar-hide">
      <Table>
        <TableHeader>
          <TableRow className="border-white/[0.06] hover:bg-transparent">
            <TableHead className="text-white/40 sticky left-0 bg-[#111111] min-w-[160px]">
              Category
            </TableHead>
            {view === 'annual' ? (
              <>
                {headCell('Monthly Budget', 'min-w-[110px]')}
                {MONTHS.map((month) => headCell(month))}
                {headCell('Annual Actual', 'bg-white/[0.02] min-w-[110px]')}
                {headCell('Annual Budget', 'bg-white/[0.02] min-w-[110px]')}
                {headCell('Δ', 'min-w-[100px]')}
              </>
            ) : (
              <>
                {headCell('Budget', 'min-w-[110px]')}
                {headCell('Actual', 'min-w-[110px]')}
                {headCell('Δ', 'min-w-[110px]')}
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          <BudgetSection
            title="Income"
            tint="emerald"
            categories={categories.filter((c) => c.type === 'INCOME')}
            totals={income}
            {...sectionProps}
          />
          <BudgetSection
            title="Expenses"
            tint="rose"
            categories={categories.filter((c) => c.type === 'EXPENSE')}
            totals={expenses}
            {...sectionProps}
          />
          <BudgetSection
            title="Savings & Transfers"
            tint="sky"
            categories={categories.filter((c) => c.type === 'SAVINGS_TRANSFER')}
            totals={savings}
            {...sectionProps}
          />

          {/* Net Cash Flow = Income − Expenses − Savings */}
          <TableRow className="border-white/[0.06] bg-white/[0.04]">
            <TableCell className="sticky left-0 bg-[#1b1b1b] font-semibold text-white">
              Net Cash Flow
            </TableCell>
            {view === 'annual' ? (
              <>
                {netMonthCell(net.monthlyBudget, 'budget')}
                {net.monthlyActuals.map((amount, m) => netMonthCell(amount, m))}
                {netMonthCell(net.annualActual, 'annual', true)}
                {netMonthCell(net.annualBudget, 'annualBudget')}
                <TableCell
                  className={cn(
                    'text-right tabular-nums font-semibold',
                    net.annualActual - net.annualBudget >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  )}
                >
                  {formatDelta(delta(net.annualActual, net.annualBudget))}
                </TableCell>
              </>
            ) : (
              <>
                {netMonthCell(net.monthlyBudget, 'budget')}
                {netMonthCell(net.monthlyActuals[view], 'actual', true)}
                <TableCell
                  className={cn(
                    'text-right tabular-nums font-semibold',
                    net.monthlyActuals[view] - net.monthlyBudget >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  )}
                >
                  {formatDelta(delta(net.monthlyActuals[view], net.monthlyBudget))}
                </TableCell>
              </>
            )}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

export { MONTHS, MONTHS_PER_YEAR, columnCount };
