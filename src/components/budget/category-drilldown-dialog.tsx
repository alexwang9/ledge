'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/format';
import type { BudgetCategoryView } from '@/lib/budget-math';
import { FULL_MONTHS, type BudgetView } from './month-year-picker';

interface DrilldownTransaction {
  id: string;
  date: string;
  name: string;
  merchantName: string | null;
  amount: number;
  account: string;
  pending: boolean;
}

interface CategoryDrilldownDialogProps {
  category: BudgetCategoryView | null;
  year: number;
  /** Month scope the table was in when the category was clicked. */
  initialView: BudgetView;
  onClose: () => void;
}

function monthRange(year: number, month: 'all' | number): { start: string; end: string } {
  if (month === 'all') {
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }
  const lastDay = new Date(year, month + 1, 0).getDate();
  const mm = String(month + 1).padStart(2, '0');
  return { start: `${year}-${mm}-01`, end: `${year}-${mm}-${String(lastDay).padStart(2, '0')}` };
}

export function CategoryDrilldownDialog({
  category,
  year,
  initialView,
  onClose,
}: CategoryDrilldownDialogProps) {
  const [month, setMonth] = useState<'all' | number>('all');
  const [transactions, setTransactions] = useState<DrilldownTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMonth(initialView === 'annual' ? 'all' : initialView);
  }, [category, initialView]);

  const fetchTransactions = useCallback(async () => {
    if (!category) return;
    setLoading(true);
    try {
      const { start, end } = monthRange(year, month);
      const params = new URLSearchParams({
        categoryIds: category.id,
        startDate: start,
        endDate: end,
        includeTransfers: 'true',
      });
      const res = await fetch(`/api/transactions?${params}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      const data = await res.json();
      setTransactions(data.transactions);
    } catch (error) {
      console.error('Failed to fetch category transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [category, year, month]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  const displayTotal = category?.type === 'INCOME' ? -total : total;

  return (
    <Dialog open={category !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#0a0a0a] border-white/[0.08] text-white max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4 pr-6">
            <DialogTitle className="text-white/90">
              {category?.name}
              <span className="ml-3 text-sm font-normal text-white/40">
                {transactions.length} transaction{transactions.length === 1 ? '' : 's'} ·{' '}
                {formatCurrency(displayTotal)}
              </span>
            </DialogTitle>
            <Select
              value={month === 'all' ? 'all' : month.toString()}
              onValueChange={(v) => setMonth(v === 'all' ? 'all' : parseInt(v, 10))}
            >
              <SelectTrigger className="w-32 bg-white/[0.05] border-white/[0.08] text-white/80 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0a] border-white/[0.08]">
                <SelectItem value="all" className="text-white/80 focus:bg-white/[0.06] focus:text-white">
                  All {year}
                </SelectItem>
                {FULL_MONTHS.map((m, index) => (
                  <SelectItem
                    key={m}
                    value={index.toString()}
                    className="text-white/80 focus:bg-white/[0.06] focus:text-white"
                  >
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 -mx-2 px-2">
          {loading ? (
            <div className="py-12 text-center text-white/40 text-sm">Loading…</div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-white/40 text-sm">
              No transactions for this period
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {transactions.map((txn) => (
                <div key={txn.id} className="flex items-center justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm text-white/80 truncate">
                      {txn.merchantName || txn.name}
                      {txn.pending && (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-400/70">
                          pending
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-white/35 truncate">
                      {new Date(txn.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'UTC',
                      })}
                      {' · '}
                      {txn.account}
                    </p>
                  </div>
                  <span
                    className={
                      'text-sm tabular-nums shrink-0 ' +
                      (txn.amount < 0 ? 'text-emerald-400' : 'text-white/70')
                    }
                  >
                    {formatCurrency(Math.abs(txn.amount))}
                    {txn.amount < 0 && category?.type !== 'INCOME' ? ' cr' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
