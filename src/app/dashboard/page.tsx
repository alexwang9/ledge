'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlaidLinkButton } from '@/components/plaid-link-button';
import { useToast } from '@/hooks/use-toast';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DashboardData {
  monthlyData: Record<
    number,
    { income: number; expenses: number; byCategory: Record<string, number> }
  >;
  categories: Array<{ id: string; name: string; type: 'EXPENSE' | 'INCOME' }>;
}

interface AccountBalance {
  type: string;
  currentBalance: number | null;
}

interface AccountsData {
  institutions: Array<{ accounts: AccountBalance[] }>;
}

interface BalanceTotals {
  cash: number;
  credit: number;
  investments: number;
  loans: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#a855f7', '#f43f5e', '#22c55e', '#eab308'];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
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
      <div className="h-12 bg-white/[0.02] border border-white/[0.06] rounded-lg animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 bg-white/[0.03] border border-white/[0.06] rounded-xl animate-pulse" />
        <div className="h-96 bg-white/[0.03] border border-white/[0.06] rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [accountsData, setAccountsData] = useState<AccountsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const { toast } = useToast();

  const fetchDashboardData = useCallback(async () => {
    // Fetch both endpoints in parallel; account-balance failures don't block the dashboard.
    const [dashboardResult, accountsResult] = await Promise.allSettled([
      fetch('/api/dashboard').then((r) => {
        if (!r.ok) throw new Error('Failed to fetch dashboard data');
        return r.json();
      }),
      fetch('/api/accounts').then((r) => {
        if (!r.ok) throw new Error('Failed to fetch accounts');
        return r.json();
      }),
    ]);

    if (dashboardResult.status === 'fulfilled') {
      setData(dashboardResult.value);
    } else {
      console.error('Failed to fetch dashboard data:', dashboardResult.reason);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load dashboard data. Please try again.',
      });
    }

    if (accountsResult.status === 'fulfilled') {
      setAccountsData(accountsResult.value);
    } else {
      console.error('Failed to fetch accounts:', accountsResult.reason);
      setAccountsData({ institutions: [] });
    }

    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handlePlaidSuccess = useCallback(() => {
    toast({
      title: 'Account linked!',
      description: 'Your transactions are being synced.',
    });
    fetchDashboardData();
  }, [fetchDashboardData, toast]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  const monthlyData = data?.monthlyData || {};
  const categories = data?.categories || [];

  const institutions = accountsData?.institutions || [];
  const totals: BalanceTotals = institutions.reduce<BalanceTotals>(
    (acc, inst) => {
      for (const account of inst.accounts) {
        const balance = account.currentBalance || 0;
        if (account.type === 'depository') acc.cash += balance;
        else if (account.type === 'credit') acc.credit += balance;
        else if (account.type === 'investment' || account.type === 'brokerage') acc.investments += balance;
        else if (account.type === 'loan' || account.type === 'mortgage') acc.loans += balance;
      }
      return acc;
    },
    { cash: 0, credit: 0, investments: 0, loans: 0 }
  );
  const netBalance = totals.cash + totals.investments - totals.credit - totals.loans;
  const chartData = MONTHS.map((month, index) => ({
    month,
    Income: monthlyData[index]?.income || 0,
    Expenses: monthlyData[index]?.expenses || 0,
  }));

  const selectedMonthData = monthlyData[selectedMonth]?.byCategory || {};
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');
  const pieChartData = expenseCategories
    .map((cat) => ({ name: cat.name, value: selectedMonthData[cat.name] || 0 }))
    .filter((item) => item.value > 0);

  const incomeCategories = categories.filter((c) => c.type === 'INCOME');

  const getCategoryTotal = (categoryName: string): number => {
    return Object.values(monthlyData).reduce((sum, month) => sum + (month.byCategory[categoryName] || 0), 0);
  };

  const getCategoryAverage = (categoryName: string): number => {
    const total = getCategoryTotal(categoryName);
    const monthsWithData = Object.values(monthlyData).filter((month) => month.byCategory[categoryName] > 0).length;
    return monthsWithData > 0 ? total / monthsWithData : 0;
  };

  return (
    <div className="p-4 md:p-8 pt-16 lg:pt-8 space-y-6 text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-white/50 text-sm">
            {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
          </p>
        </div>
        <PlaidLinkButton onSuccess={handlePlaidSuccess} />
      </div>

      {/* Balance Stats Bar */}
      <div className="flex items-center gap-6 md:gap-8 py-3 px-4 rounded-lg bg-white/[0.02] border border-white/[0.06] overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-white/40 uppercase tracking-wide">Cash</span>
          <span className="text-sm font-medium text-emerald-400">{formatCurrency(totals.cash)}</span>
        </div>
        {totals.credit > 0 && (
          <>
            <div className="w-px h-4 bg-white/[0.08]" />
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-white/40 uppercase tracking-wide">Credit</span>
              <span className="text-sm font-medium text-rose-400">{formatCurrency(totals.credit)}</span>
            </div>
          </>
        )}
        {totals.investments > 0 && (
          <>
            <div className="w-px h-4 bg-white/[0.08]" />
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-white/40 uppercase tracking-wide">Investments</span>
              <span className="text-sm font-medium text-blue-400">{formatCurrency(totals.investments)}</span>
            </div>
          </>
        )}
        {totals.loans > 0 && (
          <>
            <div className="w-px h-4 bg-white/[0.08]" />
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-white/40 uppercase tracking-wide">Loans</span>
              <span className="text-sm font-medium text-rose-400">{formatCurrency(totals.loans)}</span>
            </div>
          </>
        )}
        <div className="w-px h-4 bg-white/[0.08]" />
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-white/40 uppercase tracking-wide">Net Balance</span>
          <span className={`text-sm font-medium ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(netBalance)}
          </span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Bar Chart */}
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm lg:col-span-2">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-white/90 text-base md:text-lg font-medium">Monthly Overview</CardTitle>
            <p className="text-[11px] text-white/30 mt-1">
              ↔ Transfers between your accounts (e.g. credit-card payments, Venmo) are excluded.
            </p>
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-0">
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.4)" tickFormatter={(v) => `$${v}`} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(10,10,10,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                    labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                    itemStyle={{ color: 'rgba(255,255,255,0.9)' }}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={2} fill="url(#incomeGradient)" />
                  <Area type="monotone" dataKey="Expenses" stroke="#f43f5e" strokeWidth={2} fill="url(#expensesGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
          <CardHeader className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <CardTitle className="text-white/90 text-base md:text-lg font-medium">Spending</CardTitle>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-28 md:w-32 bg-white/[0.05] border-white/[0.08] text-white/80 text-sm hover:bg-white/[0.08] transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0a0a] border-white/[0.08]">
                  {FULL_MONTHS.map((month, index) => (
                    <SelectItem key={index} value={index.toString()} className="text-white/80 focus:bg-white/[0.06] focus:text-white">
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="h-48 md:h-64">
              {pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                      {pieChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(10,10,10,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-white/40 text-sm">
                  No expenses for {FULL_MONTHS[selectedMonth]}
                </div>
              )}
            </div>
            {pieChartData.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                {pieChartData.slice(0, 6).map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-white/50 truncate">{item.name}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Overview Table - Desktop */}
      <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm hidden md:block">
        <CardHeader>
          <CardTitle className="text-white/90 font-medium">{new Date().getFullYear()} Budget Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto scrollbar-hide">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-white/40 sticky left-0 bg-[#0a0a0a] min-w-[150px]">Category</TableHead>
                  {MONTHS.map((month) => (
                    <TableHead key={month} className="text-white/40 text-right min-w-[100px]">{month}</TableHead>
                  ))}
                  <TableHead className="text-white/40 text-right min-w-[100px] bg-white/[0.02]">Total</TableHead>
                  <TableHead className="text-white/40 text-right min-w-[100px] bg-white/[0.02]">Average</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Income Section */}
                <TableRow className="border-white/[0.06] bg-emerald-500/[0.05]">
                  <TableCell colSpan={15} className="font-medium text-emerald-400">Income</TableCell>
                </TableRow>
                {incomeCategories.map((category) => (
                  <TableRow key={category.id} className="border-white/[0.06] hover:bg-white/[0.02] transition-colors">
                    <TableCell className="sticky left-0 bg-[#0a0a0a] text-white/70">{category.name}</TableCell>
                    {MONTHS.map((_, monthIndex) => {
                      const amount = monthlyData[monthIndex]?.byCategory[category.name] || 0;
                      return <TableCell key={monthIndex} className="text-right text-white/60">{amount > 0 ? formatCurrency(amount) : '-'}</TableCell>;
                    })}
                    <TableCell className="text-right font-medium text-emerald-400 bg-white/[0.02]">{formatCurrency(getCategoryTotal(category.name))}</TableCell>
                    <TableCell className="text-right text-white/50 bg-white/[0.02]">{formatCurrency(getCategoryAverage(category.name))}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-white/[0.06] bg-emerald-500/[0.08]">
                  <TableCell className="sticky left-0 bg-emerald-500/[0.08] font-medium text-emerald-400">Total Income</TableCell>
                  {MONTHS.map((_, monthIndex) => (
                    <TableCell key={monthIndex} className="text-right font-medium text-emerald-400">
                      {monthlyData[monthIndex]?.income > 0 ? formatCurrency(monthlyData[monthIndex].income) : '-'}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold text-emerald-400">{formatCurrency(Object.values(monthlyData).reduce((sum, m) => sum + m.income, 0))}</TableCell>
                  <TableCell className="text-right text-emerald-400/70">{formatCurrency(Object.values(monthlyData).reduce((sum, m) => sum + m.income, 0) / 12)}</TableCell>
                </TableRow>

                <TableRow className="border-white/[0.06]"><TableCell colSpan={15} className="h-4"></TableCell></TableRow>

                {/* Expenses Section */}
                <TableRow className="border-white/[0.06] bg-rose-500/[0.05]">
                  <TableCell colSpan={15} className="font-medium text-rose-400">Expenses</TableCell>
                </TableRow>
                {expenseCategories.map((category) => (
                  <TableRow key={category.id} className="border-white/[0.06] hover:bg-white/[0.02] transition-colors">
                    <TableCell className="sticky left-0 bg-[#0a0a0a] text-white/70">{category.name}</TableCell>
                    {MONTHS.map((_, monthIndex) => {
                      const amount = monthlyData[monthIndex]?.byCategory[category.name] || 0;
                      return <TableCell key={monthIndex} className="text-right text-white/60">{amount > 0 ? formatCurrency(amount) : '-'}</TableCell>;
                    })}
                    <TableCell className="text-right font-medium text-rose-400 bg-white/[0.02]">{formatCurrency(getCategoryTotal(category.name))}</TableCell>
                    <TableCell className="text-right text-white/50 bg-white/[0.02]">{formatCurrency(getCategoryAverage(category.name))}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-white/[0.06] bg-rose-500/[0.08]">
                  <TableCell className="sticky left-0 bg-rose-500/[0.08] font-medium text-rose-400">Total Expenses</TableCell>
                  {MONTHS.map((_, monthIndex) => (
                    <TableCell key={monthIndex} className="text-right font-medium text-rose-400">
                      {monthlyData[monthIndex]?.expenses > 0 ? formatCurrency(monthlyData[monthIndex].expenses) : '-'}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold text-rose-400">{formatCurrency(Object.values(monthlyData).reduce((sum, m) => sum + m.expenses, 0))}</TableCell>
                  <TableCell className="text-right text-rose-400/70">{formatCurrency(Object.values(monthlyData).reduce((sum, m) => sum + m.expenses, 0) / 12)}</TableCell>
                </TableRow>

                <TableRow className="border-white/[0.06]"><TableCell colSpan={15} className="h-4"></TableCell></TableRow>

                {/* Net Savings Row */}
                <TableRow className="border-white/[0.06] bg-white/[0.04]">
                  <TableCell className="sticky left-0 bg-white/[0.04] font-semibold text-white">Net Savings</TableCell>
                  {MONTHS.map((_, monthIndex) => {
                    const net = (monthlyData[monthIndex]?.income || 0) - (monthlyData[monthIndex]?.expenses || 0);
                    return <TableCell key={monthIndex} className={`text-right font-medium ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{net !== 0 ? formatCurrency(net) : '-'}</TableCell>;
                  })}
                  <TableCell className={`text-right font-semibold ${Object.values(monthlyData).reduce((sum, m) => sum + m.income - m.expenses, 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(Object.values(monthlyData).reduce((sum, m) => sum + m.income - m.expenses, 0))}
                  </TableCell>
                  <TableCell className="text-right text-white/50">{formatCurrency(Object.values(monthlyData).reduce((sum, m) => sum + m.income - m.expenses, 0) / 12)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Summary Card */}
      <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm md:hidden">
        <CardHeader>
          <CardTitle className="text-white/90 text-base font-medium">Year-to-Date Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-white/50">Total Income</span>
            <span className="text-emerald-400 font-medium">{formatCurrency(Object.values(monthlyData).reduce((sum, m) => sum + m.income, 0))}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/50">Total Expenses</span>
            <span className="text-rose-400 font-medium">{formatCurrency(Object.values(monthlyData).reduce((sum, m) => sum + m.expenses, 0))}</span>
          </div>
          <div className="border-t border-white/[0.06] pt-4 flex justify-between items-center">
            <span className="text-white font-medium">Net Savings</span>
            <span className={`font-semibold ${Object.values(monthlyData).reduce((sum, m) => sum + m.income - m.expenses, 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(Object.values(monthlyData).reduce((sum, m) => sum + m.income - m.expenses, 0))}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
