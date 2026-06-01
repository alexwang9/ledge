import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    // Get month/year from query params, default to current month
    const searchParams = request.nextUrl.searchParams;
    const now = new Date();
    const month = parseInt(searchParams.get('month') || String(now.getMonth()));
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()));

    // Get all budget categories for the user
    const categories = await prisma.budgetCategory.findMany({
      where: { userId: authResult.userId },
      orderBy: { name: 'asc' },
    });

    // Get selected month's date range
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

    // Get all transactions for the current month
    const plaidItems = await prisma.plaidItem.findMany({
      where: { userId: authResult.userId },
      select: { id: true },
    });

    const plaidItemIds = plaidItems.map((item) => item.id);

    const transactions = await prisma.transaction.findMany({
      where: {
        plaidItemId: { in: plaidItemIds },
        date: { gte: startOfMonth, lte: endOfMonth },
        pending: false,
      },
    });

    // Calculate spending by category
    const spendingByCategory: Record<string, number> = {};

    for (const txn of transactions) {
      const effectiveFlow = txn.flowTypeOverride ?? txn.flowType;
      if (effectiveFlow !== 'EXPENSE') continue;

      const category = txn.categoryOverride || txn.category || 'Uncategorized';
      // Sign-preserving sum so credit-card refunds reduce the category total.
      spendingByCategory[category] = (spendingByCategory[category] || 0) + txn.amount;
    }

    // Build budget data with spending
    const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');

    const budgets = expenseCategories.map((category) => ({
      id: category.id,
      name: category.name,
      budgeted: category.monthlyLimit ?? 0,
      spent: spendingByCategory[category.name] || 0,
      remaining: (category.monthlyLimit ?? 0) - (spendingByCategory[category.name] || 0),
      hasExplicitBudget: category.monthlyLimit !== null,
    }));

    // Calculate totals
    const totalBudgeted = budgets.reduce((sum, b) => sum + b.budgeted, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
    const totalRemaining = totalBudgeted - totalSpent;

    // Calculate categories with budgets set
    const budgetedCategories = budgets.filter((b) => b.budgeted > 0);

    // Categories with no budget (null) and no spending (available to add)
    const availableCategories = expenseCategories
      .filter((c) => c.monthlyLimit === null && !spendingByCategory[c.name])
      .map((c) => ({ id: c.id, name: c.name }));

    return NextResponse.json({
      summary: {
        totalBudgeted,
        totalSpent,
        totalRemaining,
        categoriesWithBudget: budgetedCategories.length,
        totalCategories: expenseCategories.length,
      },
      budgets,
      available: availableCategories,
      currentMonth: {
        month,
        year,
        label: new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      },
      isCurrentMonth: month === now.getMonth() && year === now.getFullYear(),
    });
  } catch (error) {
    console.error('Failed to fetch budgets:', error);
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 });
  }
}
