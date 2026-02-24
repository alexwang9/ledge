'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Budget {
  id: string;
  name: string;
  budgeted: number;
  spent: number;
  remaining: number;
  hasExplicitBudget: boolean;
}

interface AvailableCategory {
  id: string;
  name: string;
}

interface MerchantBudget {
  id: string;
  merchantName: string;
  monthlyLimit: number;
  spent: number;
  remaining: number;
}

interface AvailableMerchant {
  merchantName: string;
  spent: number;
}

interface MerchantData {
  merchants: MerchantBudget[];
  availableMerchants: AvailableMerchant[];
}

interface BudgetData {
  summary: {
    totalBudgeted: number;
    totalSpent: number;
    totalRemaining: number;
    categoriesWithBudget: number;
    totalCategories: number;
  };
  budgets: Budget[];
  available: AvailableCategory[];
  currentMonth: {
    month: number;
    year: number;
    label: string;
  };
  isCurrentMonth: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// Generate last 12 months for the selector
function getLast12Months(): { month: number; year: number; label: string }[] {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: date.getMonth(),
      year: date.getFullYear(),
      label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    });
  }
  return months;
}

// Inline edit component
function InlineEdit({
  value,
  onSave,
  disabled,
}: {
  value: number;
  onSave: (newValue: number) => Promise<void>;
  disabled?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const numValue = parseFloat(editValue) || 0;
    if (numValue !== value) {
      setSaving(true);
      try {
        await onSave(numValue);
      } finally {
        setSaving(false);
      }
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value.toString());
      setIsEditing(false);
    }
  };

  if (disabled) {
    return <span className="text-white/30">{formatCurrency(value)}</span>;
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={saving}
        className="w-20 px-2 py-0.5 text-sm bg-white/[0.08] border border-white/[0.15] rounded text-white text-right focus:outline-none focus:border-emerald-500/50"
      />
    );
  }

  return (
    <button
      onClick={() => {
        setEditValue(value.toString());
        setIsEditing(true);
      }}
      className="text-white/50 hover:text-white/80 hover:bg-white/[0.04] px-1.5 py-0.5 rounded transition-colors cursor-pointer"
    >
      {formatCurrency(value)}
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-4 md:p-8 pt-16 lg:pt-8 space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-8 bg-white/5 rounded w-32 animate-pulse" />
        </div>
        <div className="h-10 bg-white/5 rounded w-40 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-64 bg-white/[0.03] border border-white/[0.06] rounded-xl animate-pulse" />
        <div className="lg:col-span-2 h-96 bg-white/[0.03] border border-white/[0.06] rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

export default function BudgetsPage() {
  const [data, setData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getMonth()}-${now.getFullYear()}`;
  });
  const [unbudgetedExpanded, setUnbudgetedExpanded] = useState(true);
  const [addBudgetOpen, setAddBudgetOpen] = useState(false);
  const [merchantData, setMerchantData] = useState<MerchantData | null>(null);
  const [addMerchantOpen, setAddMerchantOpen] = useState(false);
  const { toast } = useToast();

  const months = getLast12Months();

  const fetchBudgets = useCallback(async (monthYear: string) => {
    try {
      const [month, year] = monthYear.split('-').map(Number);
      const response = await fetch(`/api/budgets?month=${month}&year=${year}`);
      if (!response.ok) throw new Error('Failed to fetch budgets');
      const budgetData = await response.json();
      setData(budgetData);
    } catch (error) {
      console.error('Failed to fetch budgets:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load budgets',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchMerchantBudgets = useCallback(async (monthYear: string) => {
    try {
      const [month, year] = monthYear.split('-').map(Number);
      const response = await fetch(`/api/budgets/merchants?month=${month}&year=${year}`);
      if (!response.ok) throw new Error('Failed to fetch merchant budgets');
      const data = await response.json();
      setMerchantData(data);
    } catch (error) {
      console.error('Failed to fetch merchant budgets:', error);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchBudgets(selectedMonth);
    fetchMerchantBudgets(selectedMonth);
  }, [fetchBudgets, fetchMerchantBudgets, selectedMonth]);

  const handleUpdateBudget = async (id: string, newLimit: number) => {
    try {
      const response = await fetch(`/api/budgets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyLimit: newLimit }),
      });
      if (!response.ok) throw new Error('Failed to update budget');

      // Refresh data
      await fetchBudgets(selectedMonth);
      toast({
        title: 'Budget updated',
        description: `Budget set to ${formatCurrency(newLimit)}`,
      });
    } catch (error) {
      console.error('Failed to update budget:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update budget',
      });
    }
  };

  const handleAddBudgetCategory = async (id: string, name: string) => {
    try {
      const response = await fetch(`/api/budgets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyLimit: 0 }),
      });
      if (!response.ok) throw new Error('Failed to add budget category');

      setAddBudgetOpen(false);
      await fetchBudgets(selectedMonth);
      toast({
        title: 'Category added',
        description: `${name} added to budgets. Click the amount to set a budget.`,
      });
    } catch (error) {
      console.error('Failed to add budget category:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add budget category',
      });
    }
  };

  const handleAddMerchantBudget = async (merchantName: string, spent: number) => {
    try {
      // Default to next $50 increment above current spending
      const defaultLimit = Math.ceil(spent / 50) * 50 || 50;
      const response = await fetch('/api/budgets/merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantName, monthlyLimit: defaultLimit }),
      });
      if (!response.ok) throw new Error('Failed to add merchant budget');

      setAddMerchantOpen(false);
      await fetchMerchantBudgets(selectedMonth);
      toast({
        title: 'Merchant budget added',
        description: `${merchantName} budget set to ${formatCurrency(defaultLimit)}`,
      });
    } catch (error) {
      console.error('Failed to add merchant budget:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add merchant budget',
      });
    }
  };

  const handleUpdateMerchantBudget = async (id: string, newLimit: number) => {
    try {
      const response = await fetch(`/api/budgets/merchants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyLimit: newLimit }),
      });
      if (!response.ok) throw new Error('Failed to update merchant budget');

      await fetchMerchantBudgets(selectedMonth);
      toast({
        title: 'Merchant budget updated',
        description: `Budget set to ${formatCurrency(newLimit)}`,
      });
    } catch (error) {
      console.error('Failed to update merchant budget:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update merchant budget',
      });
    }
  };

  const handleDeleteMerchantBudget = async (id: string, merchantName: string) => {
    try {
      const response = await fetch(`/api/budgets/merchants/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete merchant budget');

      await fetchMerchantBudgets(selectedMonth);
      toast({
        title: 'Merchant budget removed',
        description: `Stopped tracking ${merchantName}`,
      });
    } catch (error) {
      console.error('Failed to delete merchant budget:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete merchant budget',
      });
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  const summary = data?.summary || {
    totalBudgeted: 0,
    totalSpent: 0,
    totalRemaining: 0,
    categoriesWithBudget: 0,
    totalCategories: 0,
  };

  const budgets = data?.budgets || [];
  const availableCategories = data?.available || [];
  const isCurrentMonth = data?.isCurrentMonth ?? true;

  // Separate budgeted and unbudgeted categories
  // Budgeted: either has a budget > 0 OR has explicit budget set (even if 0)
  const budgetedCategories = budgets
    .filter((b) => b.budgeted > 0 || b.hasExplicitBudget)
    .sort((a, b) => b.spent - a.spent);

  // Unbudgeted: has spending but no explicit budget
  const unbudgetedCategories = budgets
    .filter((b) => !b.hasExplicitBudget && b.spent > 0)
    .sort((a, b) => b.spent - a.spent);

  const totalUnbudgetedSpending = unbudgetedCategories.reduce((sum, b) => sum + b.spent, 0);

  const spentPercentage = summary.totalBudgeted > 0
    ? Math.min((summary.totalSpent / summary.totalBudgeted) * 100, 100)
    : 0;

  const isOverBudget = summary.totalRemaining < 0;

  return (
    <div className="p-4 md:p-8 pt-16 lg:pt-8 space-y-6 text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Budgets</h1>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-48 bg-white/[0.03] border-white/[0.08] text-white/80 hover:bg-white/[0.06] transition-colors">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#0f0f0f] border-white/[0.08]">
            {months.map((m) => (
              <SelectItem
                key={`${m.month}-${m.year}`}
                value={`${m.month}-${m.year}`}
                className="text-white/80 focus:bg-white/[0.06] focus:text-white"
              >
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Budget Health Summary */}
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm h-fit">
          <CardHeader className="pb-4">
            <CardTitle className="text-white/90 text-base font-medium">Budget Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Progress */}
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-3xl font-semibold text-white">
                  {formatCurrency(summary.totalSpent)}
                </span>
                <span className="text-sm text-white/40">
                  of {formatCurrency(summary.totalBudgeted)}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isOverBudget
                      ? 'bg-rose-500'
                      : spentPercentage > 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(spentPercentage, 100)}%` }}
                />
              </div>

              <p className="text-xs text-white/40">
                {spentPercentage.toFixed(0)}% of budget used
              </p>
            </div>

            {/* Stats */}
            <div className="space-y-3 pt-2 border-t border-white/[0.06]">
              <div className="flex justify-between">
                <span className="text-sm text-white/50">Remaining</span>
                <span className={`text-sm font-medium ${isOverBudget ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isOverBudget ? '-' : ''}{formatCurrency(Math.abs(summary.totalRemaining))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-white/50">Categories</span>
                <span className="text-sm text-white/70">
                  {summary.categoriesWithBudget} of {summary.totalCategories} budgeted
                </span>
              </div>
              {totalUnbudgetedSpending > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-white/50">Untracked</span>
                  <span className="text-sm text-amber-400">
                    {formatCurrency(totalUnbudgetedSpending)}
                  </span>
                </div>
              )}
            </div>

            {/* Status Message */}
            <div className={`p-3 rounded-lg ${
              isOverBudget
                ? 'bg-rose-500/10 border border-rose-500/20'
                : spentPercentage > 80
                ? 'bg-amber-500/10 border border-amber-500/20'
                : 'bg-emerald-500/10 border border-emerald-500/20'
            }`}>
              <p className={`text-xs ${
                isOverBudget
                  ? 'text-rose-400'
                  : spentPercentage > 80
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {isOverBudget
                  ? `You've exceeded your budget by ${formatCurrency(Math.abs(summary.totalRemaining))}`
                  : spentPercentage > 80
                  ? `You're approaching your budget limit`
                  : `You're on track this month`
                }
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Right Panel - Category Breakdown */}
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-white/90 text-base font-medium">Category Breakdown</CardTitle>
              <div className="flex items-center gap-2">
                {!isCurrentMonth && (
                  <span className="text-xs text-white/40 bg-white/[0.06] px-2 py-1 rounded">
                    Viewing past month
                  </span>
                )}
                {isCurrentMonth && availableCategories.length > 0 && (
                  <Popover open={addBudgetOpen} onOpenChange={setAddBudgetOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-xs text-white/60 hover:text-white hover:bg-white/[0.06]"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Add Budget
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-56 p-0 bg-[#0f0f0f] border-white/[0.1]"
                      align="end"
                    >
                      <div className="p-3 border-b border-white/[0.06]">
                        <p className="text-sm font-medium text-white/90">Add Budget</p>
                        <p className="text-xs text-white/40 mt-0.5">Select a category to budget</p>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {availableCategories.map((category) => (
                          <button
                            key={category.id}
                            onClick={() => handleAddBudgetCategory(category.id, category.name)}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors"
                          >
                            <span>{category.name}</span>
                            <Plus className="h-3.5 w-3.5 text-white/40" />
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Budgeted Categories */}
            {budgetedCategories.length === 0 && unbudgetedCategories.length === 0 ? (
              <div className="text-center py-12 text-white/40">
                <p>No spending this month</p>
                <p className="text-sm mt-1">Transactions will appear here once synced</p>
              </div>
            ) : (
              <>
                {budgetedCategories.length > 0 && (
                  <div className="space-y-4">
                    {budgetedCategories.map((budget) => {
                      const needsBudgetSet = budget.budgeted === 0;
                      const percentage = needsBudgetSet ? 0 : Math.min((budget.spent / budget.budgeted) * 100, 100);
                      const isOver = budget.budgeted > 0 && budget.remaining < 0;

                      return (
                        <div key={budget.id} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-white/80">{budget.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-white/50">
                                {formatCurrency(budget.spent)}
                                <span className="text-white/30"> / </span>
                                <InlineEdit
                                  value={budget.budgeted}
                                  onSave={(newValue) => handleUpdateBudget(budget.id, newValue)}
                                  disabled={!isCurrentMonth}
                                />
                              </span>
                              {needsBudgetSet ? (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                                  Set budget
                                </span>
                              ) : (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  isOver
                                    ? 'bg-rose-500/20 text-rose-400'
                                    : percentage > 80
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-emerald-500/20 text-emerald-400'
                                }`}>
                                  {isOver ? 'Over' : `${percentage.toFixed(0)}%`}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                needsBudgetSet
                                  ? 'bg-blue-500/50'
                                  : isOver
                                  ? 'bg-rose-500'
                                  : percentage > 80
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: needsBudgetSet ? '100%' : `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Unbudgeted Categories Section */}
                {unbudgetedCategories.length > 0 && (
                  <div className="pt-4 border-t border-white/[0.06]">
                    <button
                      onClick={() => setUnbudgetedExpanded(!unbudgetedExpanded)}
                      className="flex items-center justify-between w-full text-left mb-4 group"
                    >
                      <div className="flex items-center gap-2">
                        {unbudgetedExpanded ? (
                          <ChevronDown className="h-4 w-4 text-white/40" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-white/40" />
                        )}
                        <span className="text-sm font-medium text-white/60">Unbudgeted Spending</span>
                        <span className="text-xs text-white/40">({unbudgetedCategories.length})</span>
                      </div>
                      <span className="text-sm text-amber-400 font-medium">
                        {formatCurrency(totalUnbudgetedSpending)}
                      </span>
                    </button>

                    {unbudgetedExpanded && (
                      <div className="space-y-3 pl-6">
                        {unbudgetedCategories.map((budget) => (
                          <div key={budget.id} className="flex justify-between items-center">
                            <span className="text-sm text-white/60">{budget.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-white/50">
                                {formatCurrency(budget.spent)}
                              </span>
                              {isCurrentMonth && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUpdateBudget(budget.id, Math.ceil(budget.spent / 50) * 50)}
                                  className="h-7 px-2 text-xs text-white/40 hover:text-white/80 hover:bg-white/[0.06]"
                                >
                                  Set budget
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Merchant Budgets Section */}
      <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-white/90 text-base font-medium">Merchant Budgets</CardTitle>
            <div className="flex items-center gap-2">
              {!isCurrentMonth && (
                <span className="text-xs text-white/40 bg-white/[0.06] px-2 py-1 rounded">
                  Viewing past month
                </span>
              )}
              {isCurrentMonth && merchantData && merchantData.availableMerchants.length > 0 && (
                <Popover open={addMerchantOpen} onOpenChange={setAddMerchantOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-xs text-white/60 hover:text-white hover:bg-white/[0.06]"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add Merchant
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-72 p-0 bg-[#0f0f0f] border-white/[0.1]"
                    align="end"
                  >
                    <div className="p-3 border-b border-white/[0.06]">
                      <p className="text-sm font-medium text-white/90">Add Merchant Budget</p>
                      <p className="text-xs text-white/40 mt-0.5">Select a merchant to track spending</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {merchantData.availableMerchants.map((merchant) => (
                        <button
                          key={merchant.merchantName}
                          onClick={() => handleAddMerchantBudget(merchant.merchantName, merchant.spent)}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors"
                        >
                          <span className="truncate">{merchant.merchantName}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-white/40">{formatCurrency(merchant.spent)} spent</span>
                            <Plus className="h-3.5 w-3.5 text-white/40" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!merchantData || merchantData.merchants.length === 0 ? (
            <div className="text-center py-8 text-white/40">
              <p>No merchant budgets set</p>
              <p className="text-sm mt-1">Click &quot;Add Merchant&quot; to track spending at specific merchants</p>
            </div>
          ) : (
            <div className="space-y-4">
              {merchantData.merchants.map((merchant) => {
                const percentage = Math.min((merchant.spent / merchant.monthlyLimit) * 100, 100);
                const isOver = merchant.remaining < 0;

                return (
                  <div key={merchant.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-white/80">{merchant.merchantName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-white/50">
                          {formatCurrency(merchant.spent)}
                          <span className="text-white/30"> / </span>
                          <InlineEdit
                            value={merchant.monthlyLimit}
                            onSave={(newValue) => handleUpdateMerchantBudget(merchant.id, newValue)}
                            disabled={!isCurrentMonth}
                          />
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          isOver
                            ? 'bg-rose-500/20 text-rose-400'
                            : percentage > 80
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {isOver ? 'Over' : `${percentage.toFixed(0)}%`}
                        </span>
                        {isCurrentMonth && (
                          <button
                            onClick={() => handleDeleteMerchantBudget(merchant.id, merchant.merchantName)}
                            className="p-1 text-white/30 hover:text-rose-400 hover:bg-white/[0.04] rounded transition-colors"
                            title="Remove merchant budget"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOver
                            ? 'bg-rose-500'
                            : percentage > 80
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
