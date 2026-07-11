import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { ensureUserCategories } from '@/lib/default-categories';

/** Special categoryIds token selecting transactions with no category. */
const UNCATEGORIZED = 'uncategorized';

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const categoryIds = searchParams.get('categoryIds')?.split(',').filter(Boolean);
  const search = searchParams.get('search');
  const includeTransfers = searchParams.get('includeTransfers') === 'true';
  const includeIgnored = searchParams.get('includeIgnored') === 'true';

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
    OR?: Array<{ budgetCategoryId: { in: string[] } | null }>;
    merchantName?: { contains: string; mode: 'insensitive' };
    ignored?: boolean;
  } = {
    plaidItemId: { in: plaidItemIds },
  };

  if (!includeIgnored) {
    where.ignored = false;
  }

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

  if (categoryIds && categoryIds.length > 0) {
    const ids = categoryIds.filter((id) => id !== UNCATEGORIZED);
    const filters: Array<{ budgetCategoryId: { in: string[] } | null }> = [];
    if (ids.length > 0) filters.push({ budgetCategoryId: { in: ids } });
    if (categoryIds.includes(UNCATEGORIZED)) filters.push({ budgetCategoryId: null });
    where.OR = filters;
  }

  if (search) {
    where.merchantName = { contains: search, mode: 'insensitive' };
  }

  const rawTransactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: 'desc' },
    include: {
      account: { select: { name: true, mask: true } },
      budgetCategory: { select: { name: true } },
    },
  });

  // Filter transfers in-memory so we can honor flowTypeOverride (effective flow).
  // Default: hide transfers. With ?includeTransfers=true, show everything.
  const transactions = includeTransfers
    ? rawTransactions
    : rawTransactions.filter(
        (t) => (t.flowTypeOverride ?? t.flowType) !== 'TRANSFER'
      );

  await ensureUserCategories(auth.userId);
  const categoryList = await prisma.budgetCategory.findMany({
    where: { userId: auth.userId },
    orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
  });

  return NextResponse.json({
    transactions: transactions.map((t) => ({
      id: t.id,
      date: t.date,
      name: t.name,
      merchantName: t.merchantName,
      amount: t.amount,
      budgetCategoryId: t.budgetCategoryId,
      categoryName: t.budgetCategory?.name ?? 'Uncategorized',
      categorySource: t.categorySource,
      ignored: t.ignored,
      flowType: t.flowTypeOverride ?? t.flowType,
      originalFlowType: t.flowType,
      hasFlowOverride: !!t.flowTypeOverride,
      pending: t.pending,
      account: t.account
        ? `${t.account.name}${t.account.mask ? ` •${t.account.mask}` : ''}`
        : plaidItemMap[t.plaidItemId] || 'Unknown',
      institution: plaidItemMap[t.plaidItemId] || 'Unknown',
    })),
    categories: categoryList.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
    })),
  });
}
