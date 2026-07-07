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

    if (typeof monthlyLimit !== 'number' || !Number.isFinite(monthlyLimit) || monthlyLimit < 0) {
      return NextResponse.json({ error: 'Valid monthly limit is required' }, { status: 400 });
    }

    // Verify the merchant budget belongs to this user
    const merchantBudget = await prisma.merchantBudget.findFirst({
      where: {
        id,
        userId: authResult.userId,
      },
    });

    if (!merchantBudget) {
      return NextResponse.json({ error: 'Merchant budget not found' }, { status: 404 });
    }

    const updated = await prisma.merchantBudget.update({
      where: { id },
      data: { monthlyLimit },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update merchant budget:', error);
    return NextResponse.json({ error: 'Failed to update merchant budget' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if ('error' in authResult) {
    return authResult.error;
  }

  try {
    const { id } = await params;

    // Verify the merchant budget belongs to this user
    const merchantBudget = await prisma.merchantBudget.findFirst({
      where: {
        id,
        userId: authResult.userId,
      },
    });

    if (!merchantBudget) {
      return NextResponse.json({ error: 'Merchant budget not found' }, { status: 404 });
    }

    await prisma.merchantBudget.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete merchant budget:', error);
    return NextResponse.json({ error: 'Failed to delete merchant budget' }, { status: 500 });
  }
}
