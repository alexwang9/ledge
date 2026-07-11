import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

const MAX_MERCHANT_NAME_LENGTH = 200;

export async function GET() {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
    const rules = await prisma.categoryRule.findMany({
      where: { userId: auth.userId },
      orderBy: { merchantName: 'asc' },
      include: { budgetCategory: { select: { name: true } } },
    });

    return NextResponse.json({
      rules: rules.map((rule) => ({
        id: rule.id,
        merchantName: rule.merchantName,
        budgetCategoryId: rule.budgetCategoryId,
        categoryName: rule.budgetCategory?.name ?? null,
        ignore: rule.ignore,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch rules:', error);
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { budgetCategoryId, applyRetroactively } = body as {
      budgetCategoryId?: string | null;
      applyRetroactively?: boolean;
    };
    const ignore = body.ignore === true;

    if (
      typeof body.merchantName !== 'string' ||
      body.merchantName.trim().length === 0 ||
      body.merchantName.trim().length > MAX_MERCHANT_NAME_LENGTH
    ) {
      return NextResponse.json({ error: 'Invalid merchant name' }, { status: 400 });
    }
    const merchantName = body.merchantName.trim().toLowerCase();

    // A rule either assigns a category or ignores the merchant — never both,
    // never neither.
    if (ignore === (typeof budgetCategoryId === 'string')) {
      return NextResponse.json(
        { error: 'Provide either budgetCategoryId or ignore: true' },
        { status: 400 }
      );
    }

    if (typeof budgetCategoryId === 'string') {
      const category = await prisma.budgetCategory.findFirst({
        where: { id: budgetCategoryId, userId: auth.userId },
      });
      if (!category) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }
    }

    const rule = await prisma.categoryRule.upsert({
      where: { userId_merchantName: { userId: auth.userId, merchantName } },
      update: { budgetCategoryId: ignore ? null : budgetCategoryId, ignore },
      create: {
        userId: auth.userId,
        merchantName,
        budgetCategoryId: ignore ? null : budgetCategoryId,
        ignore,
      },
    });

    // Retroactively categorize existing uncategorized transactions of this
    // merchant. Manual (USER) assignments are never touched.
    let applied = 0;
    if (applyRetroactively) {
      const result = await prisma.transaction.updateMany({
        where: {
          plaidItem: { userId: auth.userId },
          budgetCategoryId: null,
          ignored: false,
          categorySource: { not: 'USER' },
          OR: [
            { merchantName: { equals: merchantName, mode: 'insensitive' } },
            { merchantName: null, name: { equals: merchantName, mode: 'insensitive' } },
          ],
        },
        data: {
          budgetCategoryId: ignore ? null : budgetCategoryId,
          ignored: ignore,
          categorySource: 'RULE',
        },
      });
      applied = result.count;
    }

    return NextResponse.json({ rule, applied }, { status: 201 });
  } catch (error) {
    console.error('Failed to create rule:', error);
    return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 });
  }
}
