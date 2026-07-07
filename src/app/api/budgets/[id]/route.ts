import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { monthlyLimit } = body;

    // null clears the budget; a number must be a non-negative finite value
    // (typeof NaN === 'number', so isFinite is required)
    if (
      monthlyLimit !== null &&
      (typeof monthlyLimit !== 'number' || !Number.isFinite(monthlyLimit) || monthlyLimit < 0)
    ) {
      return NextResponse.json(
        { error: 'Monthly limit must be a non-negative number or null' },
        { status: 400 }
      );
    }

    // Verify the category belongs to the user
    const category = await prisma.budgetCategory.findFirst({
      where: { id, userId: authResult.userId },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Update the budget limit (allow 0 as a valid value)
    const updated = await prisma.budgetCategory.update({
      where: { id },
      data: { monthlyLimit },
    });

    return NextResponse.json({ success: true, category: updated });
  } catch (error) {
    console.error('Failed to update budget:', error);
    return NextResponse.json({ error: 'Failed to update budget' }, { status: 500 });
  }
}
