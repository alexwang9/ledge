'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency } from '@/lib/format';
import {
  CategorySelector,
  type CategorySelection,
  type SelectableCategory,
} from '@/components/category-selector';
import { useToast } from '@/hooks/use-toast';

interface UncategorizedTransaction {
  id: string;
  date: string;
  name: string;
  merchantName: string | null;
  amount: number;
  account: string;
  pending: boolean;
}

interface UncategorizedDialogProps {
  open: boolean;
  year: number;
  categories: SelectableCategory[];
  onClose: () => void;
  /** Called after any assignment so the dashboard refetches. */
  onAssigned: () => void;
}

export function UncategorizedDialog({
  open,
  year,
  categories,
  onClose,
  onAssigned,
}: UncategorizedDialogProps) {
  const [transactions, setTransactions] = useState<UncategorizedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveRuleIds, setSaveRuleIds] = useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        categoryIds: 'uncategorized',
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
        includeTransfers: 'true',
      });
      const res = await fetch(`/api/transactions?${params}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      const data = await res.json();
      setTransactions(data.transactions);
    } catch (error) {
      console.error('Failed to fetch uncategorized transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    if (open) {
      fetchTransactions();
      setSaveRuleIds(new Set());
    }
  }, [open, fetchTransactions]);

  const toggleSaveRule = (txnId: string) => {
    setSaveRuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(txnId)) next.delete(txnId);
      else next.add(txnId);
      return next;
    });
  };

  const handleAssign = async (txn: UncategorizedTransaction, selection: CategorySelection) => {
    if (selection.budgetCategoryId === null && !selection.ignored) return; // already uncategorized

    setSavingIds((prev) => new Set(prev).add(txn.id));
    try {
      const merchant = txn.merchantName || txn.name;
      if (saveRuleIds.has(txn.id)) {
        const res = await fetch('/api/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantName: merchant,
            ...(selection.ignored
              ? { ignore: true }
              : { budgetCategoryId: selection.budgetCategoryId }),
            applyRetroactively: true,
          }),
        });
        if (!res.ok) throw new Error('Failed to save rule');
        const data = await res.json();
        toast({
          title: selection.ignored ? 'Ignore rule saved' : 'Rule saved',
          description: `Applied to ${data.applied} transaction${data.applied === 1 ? '' : 's'} from "${merchant}". Future ones are handled automatically.`,
        });
      } else {
        const res = await fetch(`/api/transactions/${txn.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            budgetCategoryId: selection.ignored ? null : selection.budgetCategoryId,
            ignored: selection.ignored,
          }),
        });
        if (!res.ok) throw new Error('Failed to update transaction');
      }
      await fetchTransactions();
      onAssigned();
    } catch (error) {
      console.error('Failed to assign category:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to assign category. Please try again.',
      });
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(txn.id);
        return next;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-[#0a0a0a] border-white/[0.08] text-white max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white/90">Uncategorized transactions</DialogTitle>
          <p className="text-xs text-white/40">
            Assign a category, or Ignore transactions (like credit-card payments) that
            shouldn&apos;t count anywhere. Check “rule” to auto-apply to that merchant from
            now on.
          </p>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 -mx-2 px-2">
          {loading ? (
            <div className="py-12 text-center text-white/40 text-sm">Loading…</div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-white/40 text-sm">
              All caught up — nothing to categorize for {year}.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {transactions.map((txn) => {
                const merchant = txn.merchantName || txn.name;
                const saving = savingIds.has(txn.id);
                return (
                  <div
                    key={txn.id}
                    className={
                      'flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-2.5 ' +
                      (saving ? 'opacity-40 pointer-events-none' : '')
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white/80 truncate">{merchant}</p>
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
                    <span className="text-sm tabular-nums text-white/70 shrink-0 sm:w-24 sm:text-right">
                      {formatCurrency(Math.abs(txn.amount))}
                      {txn.amount < 0 ? ' in' : ''}
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <CategorySelector
                        budgetCategoryId={null}
                        categories={categories}
                        onSelect={(selection) => handleAssign(txn, selection)}
                      />
                      <label className="flex items-center gap-1.5 text-xs text-white/40 cursor-pointer select-none">
                        <Checkbox
                          checked={saveRuleIds.has(txn.id)}
                          onCheckedChange={() => toggleSaveRule(txn.id)}
                          className="border-white/[0.2]"
                        />
                        rule
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
