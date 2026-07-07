import { NextRequest, NextResponse } from 'next/server';
import { FlowType } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

const VALID_FLOW_TYPES: FlowType[] = ['INCOME', 'EXPENSE', 'TRANSFER'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { category, flowType } = body as {
      category?: string | null;
      flowType?: FlowType | null;
    };

    if (flowType !== undefined && flowType !== null && !VALID_FLOW_TYPES.includes(flowType)) {
      return NextResponse.json({ error: 'Invalid flowType' }, { status: 400 });
    }

    if (
      category !== undefined &&
      category !== null &&
      (typeof category !== 'string' || category.length > 200)
    ) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // Get the transaction and verify ownership
    const transaction = await prisma.transaction.findUnique({
      where: { id },
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

    const data: { categoryOverride?: string | null; flowTypeOverride?: FlowType | null } = {};
    if (category !== undefined) data.categoryOverride = category;
    if (flowType !== undefined) data.flowTypeOverride = flowType;

    const updated = await prisma.transaction.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      success: true,
      transaction: {
        id: updated.id,
        category: updated.categoryOverride || updated.category,
        hasOverride: !!updated.categoryOverride,
        flowType: updated.flowTypeOverride ?? updated.flowType,
        originalFlowType: updated.flowType,
        hasFlowOverride: !!updated.flowTypeOverride,
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
