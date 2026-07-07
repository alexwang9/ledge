import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { name } = body;

    const updateData: { name?: string | null } = {};

    if (typeof name === 'string') {
      if (name.length > 200) {
        return NextResponse.json({ error: 'Name is too long' }, { status: 400 });
      }
      updateData.name = name.trim() || null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: auth.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE() {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
    // Delete user (cascades to PlaidItems, Transactions, BudgetCategories, MerchantBudgets)
    await prisma.user.delete({
      where: { id: auth.userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
