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

    // Get selected month's date range
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

    // Get all merchant budgets for the user
    const merchantBudgets = await prisma.merchantBudget.findMany({
      where: { userId: authResult.userId },
      orderBy: { merchantName: 'asc' },
    });

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

    // Calculate spending by merchant — EXPENSE flow only, excludes transfers.
    const spendingByMerchant: Record<string, number> = {};
    for (const txn of transactions) {
      const effectiveFlow = txn.flowTypeOverride ?? txn.flowType;
      if (effectiveFlow !== 'EXPENSE') continue;
      if (!txn.merchantName) continue;

      spendingByMerchant[txn.merchantName] =
        (spendingByMerchant[txn.merchantName] || 0) + txn.amount;
    }

    // Build merchant budget data with spending
    const budgetedMerchantNames = new Set(merchantBudgets.map((mb) => mb.merchantName));

    const merchants = merchantBudgets.map((mb) => {
      const spent = spendingByMerchant[mb.merchantName] || 0;
      return {
        id: mb.id,
        merchantName: mb.merchantName,
        monthlyLimit: mb.monthlyLimit,
        spent,
        remaining: mb.monthlyLimit - spent,
      };
    });

    // Available merchants: merchants from transactions that don't have budgets yet
    // Sorted by spending (highest first)
    const availableMerchants = Object.entries(spendingByMerchant)
      .filter(([merchantName]) => !budgetedMerchantNames.has(merchantName))
      .map(([merchantName, spent]) => ({ merchantName, spent }))
      .sort((a, b) => b.spent - a.spent);

    return NextResponse.json({
      merchants,
      availableMerchants,
      currentMonth: {
        month,
        year,
        label: new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      },
    });
  } catch (error) {
    console.error('Failed to fetch merchant budgets:', error);
    return NextResponse.json({ error: 'Failed to fetch merchant budgets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const body = await request.json();
    const { merchantName, monthlyLimit } = body;

    if (!merchantName || typeof merchantName !== 'string') {
      return NextResponse.json({ error: 'Merchant name is required' }, { status: 400 });
    }

    if (typeof monthlyLimit !== 'number' || monthlyLimit < 0) {
      return NextResponse.json({ error: 'Valid monthly limit is required' }, { status: 400 });
    }

    // Check if budget already exists for this merchant
    const existing = await prisma.merchantBudget.findUnique({
      where: {
        userId_merchantName: {
          userId: authResult.userId,
          merchantName,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Budget already exists for this merchant' }, { status: 409 });
    }

    const merchantBudget = await prisma.merchantBudget.create({
      data: {
        userId: authResult.userId,
        merchantName,
        monthlyLimit,
      },
    });

    return NextResponse.json(merchantBudget, { status: 201 });
  } catch (error) {
    console.error('Failed to create merchant budget:', error);
    return NextResponse.json({ error: 'Failed to create merchant budget' }, { status: 500 });
  }
}
