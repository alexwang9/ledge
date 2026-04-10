import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

  // Get all transactions for the current year
  const plaidItems = await prisma.plaidItem.findMany({
    where: { userId: auth.userId },
    select: { id: true },
  });

  const plaidItemIds = plaidItems.map((item) => item.id);

  const transactions = await prisma.transaction.findMany({
    where: {
      plaidItemId: { in: plaidItemIds },
      date: {
        gte: startOfYear,
        lte: endOfYear,
      },
    },
    orderBy: { date: 'desc' },
  });

  // Get all budget categories
  const budgetCategories = await prisma.budgetCategory.findMany({
    where: { userId: auth.userId },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });

  // If user has no categories, get the default ones
  let categories = budgetCategories;
  if (categories.length === 0) {
    const defaultUser = await prisma.user.findUnique({
      where: { email: 'system@default.local' },
    });
    if (defaultUser) {
      categories = await prisma.budgetCategory.findMany({
        where: { userId: defaultUser.id },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      });
    }
  }

  // Calculate monthly data
  const monthlyData: Record<
    number,
    { income: number; expenses: number; byCategory: Record<string, number> }
  > = {};

  // Initialize all months
  for (let month = 0; month < 12; month++) {
    monthlyData[month] = { income: 0, expenses: 0, byCategory: {} };
  }

  // Process transactions
  for (const txn of transactions) {
    const month = new Date(txn.date).getMonth();
    const category = txn.categoryOverride || txn.category || 'Other';

    // In Plaid, positive amounts are money leaving the account (expenses)
    // Negative amounts are money coming in (income)
    if (txn.amount < 0) {
      // Income (negative in Plaid)
      monthlyData[month].income += Math.abs(txn.amount);
    } else {
      // Expense (positive in Plaid)
      monthlyData[month].expenses += txn.amount;
    }

    // Track by category
    if (!monthlyData[month].byCategory[category]) {
      monthlyData[month].byCategory[category] = 0;
    }
    monthlyData[month].byCategory[category] += Math.abs(txn.amount);
  }

  // Calculate current month summary
  const currentMonth = new Date().getMonth();
  const currentMonthData = monthlyData[currentMonth];

  // Calculate cumulative net savings
  let cumulativeNetSavings = 0;
  for (let month = 0; month <= currentMonth; month++) {
    cumulativeNetSavings +=
      monthlyData[month].income - monthlyData[month].expenses;
  }

  const startingBalance = 0;
  const endingBalance = startingBalance + cumulativeNetSavings;

  return NextResponse.json({
    summary: {
      totalIncomeThisMonth: currentMonthData.income,
      totalExpensesThisMonth: currentMonthData.expenses,
      netSavingsThisMonth: currentMonthData.income - currentMonthData.expenses,
      endingBalance,
      startingBalance,
    },
    monthlyData,
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
    })),
    transactions: transactions.map((t) => ({
      id: t.id,
      date: t.date,
      name: t.name,
      merchantName: t.merchantName,
      amount: t.amount,
      category: t.category,
      pending: t.pending,
    })),
  });
}
