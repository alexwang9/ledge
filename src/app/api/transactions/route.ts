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

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
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

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: 'desc' },
  });

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
