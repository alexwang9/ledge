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
    const { budgetCategoryId, ignored, flowType } = body as {
      budgetCategoryId?: string | null;
      ignored?: boolean;
      flowType?: FlowType | null;
    };

    if (flowType !== undefined && flowType !== null && !VALID_FLOW_TYPES.includes(flowType)) {
      return NextResponse.json({ error: 'Invalid flowType' }, { status: 400 });
    }

    if (
      budgetCategoryId !== undefined &&
      budgetCategoryId !== null &&
      typeof budgetCategoryId !== 'string'
    ) {
      return NextResponse.json({ error: 'Invalid budgetCategoryId' }, { status: 400 });
    }

    if (ignored !== undefined && typeof ignored !== 'boolean') {
      return NextResponse.json({ error: 'Invalid ignored flag' }, { status: 400 });
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

    if (typeof budgetCategoryId === 'string') {
      const category = await prisma.budgetCategory.findFirst({
        where: { id: budgetCategoryId, userId: auth.userId },
      });
      if (!category) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }
    }

    const data: {
      budgetCategoryId?: string | null;
      ignored?: boolean;
      categorySource?: 'USER';
      flowTypeOverride?: FlowType | null;
    } = {};
    if (budgetCategoryId !== undefined) data.budgetCategoryId = budgetCategoryId;
    if (ignored !== undefined) data.ignored = ignored;
    // Any manual category/ignore change is pinned so sync never clobbers it.
    if (budgetCategoryId !== undefined || ignored !== undefined) {
      data.categorySource = 'USER';
    }
    if (flowType !== undefined) data.flowTypeOverride = flowType;

    const updated = await prisma.transaction.update({
      where: { id },
      data,
      include: { budgetCategory: { select: { name: true } } },
    });

    return NextResponse.json({
      success: true,
      transaction: {
        id: updated.id,
        budgetCategoryId: updated.budgetCategoryId,
        categoryName: updated.budgetCategory?.name ?? null,
        categorySource: updated.categorySource,
        ignored: updated.ignored,
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
