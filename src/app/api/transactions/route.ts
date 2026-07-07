import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const categories = searchParams.get('categories')?.split(',').filter(Boolean);
  const search = searchParams.get('search');
  const includeTransfers = searchParams.get('includeTransfers') === 'true';

  // Get user's PlaidItems
  const plaidItems = await prisma.plaidItem.findMany({
    where: { userId: auth.userId },
    select: { id: true, institutionName: true },
  });

  const plaidItemIds = plaidItems.map((item) => item.id);
  const plaidItemMap = Object.fromEntries(
    plaidItems.map((item) => [item.id, item.institutionName])
  );

  if (plaidItemIds.length === 0) {
    return NextResponse.json({ transactions: [], categories: [] });
  }

  // Build where clause
  const where: {
    plaidItemId: { in: string[] };
    date?: { gte?: Date; lte?: Date };
    OR?: Array<{ category?: { in: string[] }; categoryOverride?: { in: string[] } }>;
    merchantName?: { contains: string; mode: 'insensitive' };
  } = {
    plaidItemId: { in: plaidItemIds },
  };

  // Ignore unparseable dates rather than filtering on Invalid Date
  const parsedStart = startDate ? new Date(startDate) : null;
  const parsedEnd = endDate ? new Date(endDate) : null;
  const validStart = parsedStart && !isNaN(parsedStart.getTime()) ? parsedStart : null;
  const validEnd = parsedEnd && !isNaN(parsedEnd.getTime()) ? parsedEnd : null;

  if (validStart || validEnd) {
    where.date = {};
    if (validStart) where.date.gte = validStart;
    if (validEnd) where.date.lte = validEnd;
  }

  if (categories && categories.length > 0) {
    where.OR = [
      { categoryOverride: { in: categories } },
      { category: { in: categories } },
    ];
  }

  if (search) {
    where.merchantName = { contains: search, mode: 'insensitive' };
  }

  const rawTransactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: 'desc' },
  });

  // Filter transfers in-memory so we can honor flowTypeOverride (effective flow).
  // Default: hide transfers. With ?includeTransfers=true, show everything.
  const transactions = includeTransfers
    ? rawTransactions
    : rawTransactions.filter(
        (t) => (t.flowTypeOverride ?? t.flowType) !== 'TRANSFER'
      );

  // Get all unique categories for filter
  const allCategories = await prisma.budgetCategory.findMany({
    where: { userId: auth.userId },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });

  // If user has no categories, get defaults
  let categoryList = allCategories;
  if (categoryList.length === 0) {
    const defaultUser = await prisma.user.findUnique({
      where: { email: 'system@default.local' },
    });
    if (defaultUser) {
      categoryList = await prisma.budgetCategory.findMany({
        where: { userId: defaultUser.id },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      });
    }
  }

  return NextResponse.json({
    transactions: transactions.map((t) => ({
      id: t.id,
      date: t.date,
      name: t.name,
      merchantName: t.merchantName,
      amount: t.amount,
      category: t.categoryOverride || t.category || 'Other',
      originalCategory: t.category,
      hasOverride: !!t.categoryOverride,
      flowType: t.flowTypeOverride ?? t.flowType,
      originalFlowType: t.flowType,
      hasFlowOverride: !!t.flowTypeOverride,
      pending: t.pending,
      account: plaidItemMap[t.plaidItemId] || 'Unknown',
    })),
    categories: categoryList.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
    })),
  });
}
