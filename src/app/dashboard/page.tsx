'use client';

import { useCallback, useEffect, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlaidLinkButton } from '@/components/plaid-link-button';
import { useToast } from '@/hooks/use-toast';
import type { BudgetCategoryView } from '@/lib/budget-math';
import { BudgetTable } from '@/components/budget/budget-table';
import { MonthYearPicker, type BudgetView } from '@/components/budget/month-year-picker';
import { CategoryDrilldownDialog } from '@/components/budget/category-drilldown-dialog';
import { UncategorizedBanner } from '@/components/budget/uncategorized-banner';
import { UncategorizedDialog } from '@/components/budget/uncategorized-dialog';
import { ManageCategoriesDialog } from '@/components/budget/manage-categories-dialog';

interface DashboardData {
  year: number;
  categories: BudgetCategoryView[];
  actualsByCategory: Record<string, number[]>;
  uncategorized: {
    monthlyNet: number[];
    countByMonth: number[];
    count: number;
  };
}

function LoadingSkeleton() {
  return (
    <div className="p-4 md:p-8 pt-16 lg:pt-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-8 bg-white/5 rounded w-40 animate-pulse" />
          <div className="h-4 bg-white/5 rounded w-32 animate-pulse" />
        </div>
        <div className="h-10 bg-white/5 rounded w-36 animate-pulse" />
      </div>
      <div className="h-[32rem] bg-white/[0.03] border border-white/[0.06] rounded-xl animate-pulse" />
    </div>
  );
}

export default function BudgetPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [view, setView] = useState<BudgetView>('annual');
  const [drilldownCategory, setDrilldownCategory] = useState<BudgetCategoryView | null>(null);
  const [uncategorizedOpen, setUncategorizedOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard?year=${year}`);
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      setData(await res.json());
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load budget data. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }, [year, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePlaidSuccess = useCallback(() => {
    toast({
      title: 'Account linked!',
      description: 'Your transactions are being synced.',
    });
    fetchData();
  }, [fetchData, toast]);

  const handleBudgetSave = useCallback(
    async (categoryId: string, monthlyLimit: number | null) => {
      const res = await fetch(`/api/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyLimit }),
      });
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to update budget.',
        });
        return;
      }
      await fetchData();
    },
    [fetchData, toast]
  );

  if (loading && !data) {
    return <LoadingSkeleton />;
  }

  const categories = data?.categories ?? [];
  const actualsByCategory = data?.actualsByCategory ?? {};
  const uncategorized = data?.uncategorized ?? { monthlyNet: [], countByMonth: [], count: 0 };
  const uncategorizedTotal = uncategorized.monthlyNet.reduce((sum, v) => sum + v, 0);

  return (
    <div className="p-4 md:p-8 pt-16 lg:pt-8 space-y-4 text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Budget</h1>
          <p className="text-white/50 text-sm">
            {view === 'annual'
              ? `${year} annual overview`
              : new Date(year, view).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <MonthYearPicker year={year} view={view} onYearChange={setYear} onViewChange={setView} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setManageOpen(true)}
            className="text-white/50 hover:text-white hover:bg-white/[0.06]"
            title="Manage categories & rules"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
          <PlaidLinkButton onSuccess={handlePlaidSuccess} />
        </div>
      </div>

      {/* Uncategorized triage */}
      <UncategorizedBanner
        count={uncategorized.count}
        totalNet={uncategorizedTotal}
        onClick={() => setUncategorizedOpen(true)}
      />

      {/* Budget table */}
      <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
        <CardContent className="p-2 md:p-4">
          <BudgetTable
            categories={categories}
            actualsByCategory={actualsByCategory}
            view={view}
            year={year}
            onCategoryClick={setDrilldownCategory}
            onBudgetSave={handleBudgetSave}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CategoryDrilldownDialog
        category={drilldownCategory}
        year={year}
        initialView={view}
        onClose={() => setDrilldownCategory(null)}
      />
      <UncategorizedDialog
        open={uncategorizedOpen}
        year={year}
        categories={categories}
        onClose={() => setUncategorizedOpen(false)}
        onAssigned={fetchData}
      />
      <ManageCategoriesDialog
        open={manageOpen}
        categories={categories}
        onClose={() => setManageOpen(false)}
        onChanged={fetchData}
      />
    </div>
  );
}
