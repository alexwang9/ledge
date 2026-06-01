'use client';

import { useCallback, useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, RefreshCw, Search } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { DateRangePicker } from '@/components/date-range-picker';
import { MultiSelect } from '@/components/multi-select';
import { CategorySelector } from '@/components/category-selector';
import { FlowSelector, type FlowType } from '@/components/flow-selector';
import { useToast } from '@/hooks/use-toast';

interface Transaction {
  id: string;
  date: string;
  name: string;
  merchantName: string | null;
  amount: number;
  category: string;
  originalCategory: string | null;
  hasOverride: boolean;
  flowType: FlowType;
  originalFlowType: FlowType;
  hasFlowOverride: boolean;
  pending: boolean;
  account: string;
}

interface Category {
  id: string;
  name: string;
  type: 'EXPENSE' | 'INCOME';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Math.abs(amount));
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showTransfers, setShowTransfers] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange?.from) params.set('startDate', dateRange.from.toISOString());
      if (dateRange?.to) params.set('endDate', dateRange.to.toISOString());
      if (selectedCategories.length > 0) params.set('categories', selectedCategories.join(','));
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (showTransfers) params.set('includeTransfers', 'true');

      const response = await fetch(`/api/transactions?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setTransactions(data.transactions || []);
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load transactions' });
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedCategories, debouncedSearch, showTransfers, toast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/plaid/sync-transactions', { method: 'POST' });
      if (!response.ok) throw new Error('Sync failed');
      const data = await response.json();
      toast({ title: 'Sync complete', description: `Added ${data.added} transactions` });
      await fetchTransactions();
    } catch (error) {
      console.error('Failed to sync:', error);
      toast({ variant: 'destructive', title: 'Sync failed', description: 'Could not sync transactions' });
    } finally {
      setSyncing(false);
    }
  };

  const handleCategoryChange = async (transactionId: string, newCategory: string) => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCategory }),
      });
      if (!response.ok) throw new Error('Update failed');
      setTransactions((prev) =>
        prev.map((t) => (t.id === transactionId ? { ...t, category: newCategory, hasOverride: true } : t))
      );
      toast({ title: 'Category updated', description: `Changed to ${newCategory}` });
    } catch (error) {
      console.error('Failed to update category:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update category' });
    }
  };

  const handleFlowChange = async (transactionId: string, newFlow: FlowType) => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowType: newFlow }),
      });
      if (!response.ok) throw new Error('Update failed');
      setTransactions((prev) =>
        prev.map((t) => (t.id === transactionId ? { ...t, flowType: newFlow, hasFlowOverride: true } : t))
      );
      toast({ title: 'Flow updated', description: `Marked as ${newFlow.toLowerCase()}` });
    } catch (error) {
      console.error('Failed to update flow:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update flow type' });
    }
  };

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: 'date',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="text-white/40 hover:text-white/70 hover:bg-transparent p-0 font-medium"
        >
          Date
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="whitespace-nowrap text-sm text-white/60">
          {format(new Date(row.getValue('date')), 'MMM d, yyyy')}
        </div>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="text-white/40 hover:text-white/70 hover:bg-transparent p-0 font-medium"
        >
          Name
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const name = row.getValue('name') as string;
        const merchant = row.original.merchantName;
        return (
          <div className="max-w-[200px]">
            <div className="font-medium text-white/80 truncate">{merchant || name}</div>
            {merchant && merchant !== name && <div className="text-xs text-white/40 truncate">{name}</div>}
            {row.original.pending && <span className="text-xs text-amber-400/70">(Pending)</span>}
          </div>
        );
      },
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="text-white/40 hover:text-white/70 hover:bg-transparent p-0 font-medium"
        >
          Amount
          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const amount = row.getValue('amount') as number;
        return (
          <FlowSelector
            value={row.original.flowType}
            hasOverride={row.original.hasFlowOverride}
            amount={amount}
            formattedAmount={formatCurrency(amount)}
            onSelect={(flow) => handleFlowChange(row.original.id, flow)}
          />
        );
      },
    },
    {
      accessorKey: 'category',
      header: () => <span className="text-white/40 font-medium">Category</span>,
      cell: ({ row }) => (
        <CategorySelector
          value={row.original.category}
          categories={categories}
          hasOverride={row.original.hasOverride}
          onSelect={(category) => handleCategoryChange(row.original.id, category)}
        />
      ),
    },
    {
      accessorKey: 'account',
      header: () => <span className="text-white/40 font-medium">Account</span>,
      cell: ({ row }) => <div className="text-white/40 text-sm truncate max-w-[120px]">{row.getValue('account')}</div>,
    },
  ];

  const categoryOptions = categories.map((c) => ({ value: c.name, label: c.name }));

  return (
    <div className="p-4 md:p-8 pt-16 lg:pt-8 space-y-6 text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-white/40 text-sm">View and manage your transactions</p>
        </div>
        <Button
          onClick={handleSync}
          disabled={syncing}
          className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row flex-wrap gap-3 md:gap-4 items-start md:items-center">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <MultiSelect
          options={categoryOptions}
          value={selectedCategories}
          onChange={setSelectedCategories}
          placeholder="Filter by category"
        />
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input
            placeholder="Search merchant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full md:w-64 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 focus:border-white/20 focus:ring-0"
          />
        </div>
        <Button
          variant="ghost"
          onClick={() => setShowTransfers((v) => !v)}
          className={`text-sm transition-colors ${
            showTransfers
              ? 'text-slate-200 bg-white/[0.06] hover:bg-white/[0.08]'
              : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
          }`}
        >
          {showTransfers ? '↔ Showing transfers' : '↔ Show transfers'}
        </Button>
        {(dateRange || selectedCategories.length > 0 || searchQuery || showTransfers) && (
          <Button
            variant="ghost"
            onClick={() => {
              setDateRange(undefined);
              setSelectedCategories([]);
              setSearchQuery('');
              setShowTransfers(false);
            }}
            className="text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Data Table - Desktop */}
      <div className="hidden md:block">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-12 bg-white/[0.02] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <DataTable columns={columns} data={transactions} />
        )}
      </div>

      {/* Mobile Transaction List */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="bg-white/[0.03] border-white/[0.06]">
                <CardContent className="p-4">
                  <div className="h-16 bg-white/[0.03] rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : transactions.length === 0 ? (
          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardContent className="p-8 text-center text-white/40">
              No transactions found
            </CardContent>
          </Card>
        ) : (
          transactions.map((txn) => (
            <Card key={txn.id} className="bg-white/[0.03] border-white/[0.06]">
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white/80 truncate">{txn.merchantName || txn.name}</div>
                    <div className="text-xs text-white/40">{format(new Date(txn.date), 'MMM d, yyyy')}</div>
                    <div className="mt-2">
                      <CategorySelector
                        value={txn.category}
                        categories={categories}
                        hasOverride={txn.hasOverride}
                        onSelect={(category) => handleCategoryChange(txn.id, category)}
                      />
                    </div>
                  </div>
                  <FlowSelector
                    value={txn.flowType}
                    hasOverride={txn.hasFlowOverride}
                    amount={txn.amount}
                    formattedAmount={formatCurrency(txn.amount)}
                    onSelect={(flow) => handleFlowChange(txn.id, flow)}
                  />
                </div>
              </CardContent>
            </Card>
          ))
        )}
        {transactions.length > 0 && (
          <p className="text-center text-white/30 text-sm py-4">
            {transactions.length} transactions
          </p>
        )}
      </div>
    </div>
  );
}
