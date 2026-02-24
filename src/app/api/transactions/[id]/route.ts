import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { category } = body;

    // Get the transaction and verify ownership
    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: { plaidItem: true },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    if (transaction.plaidItem.userId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update the category override
    const updated = await prisma.transaction.update({
      where: { id: params.id },
      data: { categoryOverride: category },
    });

    return NextResponse.json({
      success: true,
      transaction: {
        id: updated.id,
        category: updated.categoryOverride || updated.category,
        hasOverride: !!updated.categoryOverride,
      },
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}
