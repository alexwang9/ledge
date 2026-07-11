import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { escapeCsvField } from '@/lib/csv';

export async function GET() {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
    // Get all PlaidItems for this user
    const plaidItems = await prisma.plaidItem.findMany({
      where: { userId: auth.userId },
      select: { id: true, institutionName: true },
    });

    const plaidItemIds = plaidItems.map((item) => item.id);
    const institutionMap = Object.fromEntries(
      plaidItems.map((item) => [item.id, item.institutionName])
    );

    // Get all transactions
    const transactions = await prisma.transaction.findMany({
      where: { plaidItemId: { in: plaidItemIds } },
      orderBy: { date: 'desc' },
      include: { budgetCategory: { select: { name: true } } },
    });

    // Build CSV
    const headers = [
      'Date',
      'Name',
      'Merchant',
      'Amount',
      'Category',
      'Subcategory',
      'Institution',
      'Pending',
      'Ignored',
    ];

    const rows = transactions.map((txn) => [
      txn.date.toISOString().split('T')[0],
      escapeCsvField(txn.name),
      escapeCsvField(txn.merchantName || ''),
      txn.amount.toFixed(2),
      escapeCsvField(txn.budgetCategory?.name ?? txn.category ?? ''),
      escapeCsvField(txn.subcategory || ''),
      escapeCsvField(institutionMap[txn.plaidItemId] || ''),
      txn.pending ? 'Yes' : 'No',
      txn.ignored ? 'Yes' : 'No',
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    // Return as downloadable CSV
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="transactions-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Failed to export transactions:', error);
    return NextResponse.json({ error: 'Failed to export transactions' }, { status: 500 });
  }
}
