import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { roundCents } from '@/lib/money';
import { clampYear } from '@/lib/validation';
import { ensureUserCategories } from '@/lib/default-categories';
import { normalizeActual, zeroMonths, MONTHS_PER_YEAR } from '@/lib/budget-math';

/**
 * Budget dashboard aggregate for one calendar year. Actuals are computed at
 * read time from transactions, so synced data is always current. Pending
 * transactions are included (Plaid sync replaces pending rows with posted
 * ones); ignored transactions are excluded from everything.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
    const year = clampYear(request.nextUrl.searchParams.get('year'));
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    await ensureUserCategories(auth.userId);

    const [categories, transactions] = await Promise.all([
      prisma.budgetCategory.findMany({
        where: { userId: auth.userId },
        orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, type: true, monthlyLimit: true, sortOrder: true },
      }),
      prisma.transaction.findMany({
        where: {
          plaidItem: { userId: auth.userId },
          date: { gte: startOfYear, lte: endOfYear },
          ignored: false,
        },
        select: { budgetCategoryId: true, amount: true, date: true },
      }),
    ]);

    const typeById = new Map(categories.map((c) => [c.id, c.type]));

    // Raw signed sums per category per month, then normalized per section so
    // income reads positive (see budget-math.ts).
    const rawSums: Record<string, number[]> = {};
    const uncategorizedNet = zeroMonths();
    const uncategorizedCountByMonth = new Array<number>(MONTHS_PER_YEAR).fill(0);

    for (const txn of transactions) {
      const month = new Date(txn.date).getMonth();
      if (txn.budgetCategoryId === null || !typeById.has(txn.budgetCategoryId)) {
        uncategorizedNet[month] += txn.amount;
        uncategorizedCountByMonth[month] += 1;
        continue;
      }
      if (!rawSums[txn.budgetCategoryId]) {
        rawSums[txn.budgetCategoryId] = zeroMonths();
      }
      rawSums[txn.budgetCategoryId][month] += txn.amount;
    }

    const actualsByCategory: Record<string, number[]> = {};
    for (const [categoryId, sums] of Object.entries(rawSums)) {
      const type = typeById.get(categoryId)!;
      actualsByCategory[categoryId] = sums.map((sum) =>
        roundCents(normalizeActual(type, sum))
      );
    }

    return NextResponse.json({
      year,
      categories,
      actualsByCategory,
      uncategorized: {
        monthlyNet: uncategorizedNet.map(roundCents),
        countByMonth: uncategorizedCountByMonth,
        count: uncategorizedCountByMonth.reduce((sum, c) => sum + c, 0),
      },
    });
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
