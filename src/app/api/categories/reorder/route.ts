import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { isCategoryType } from '@/lib/category-validation';

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { type, orderedIds } = body as { type?: unknown; orderedIds?: unknown };

    if (!isCategoryType(type)) {
      return NextResponse.json({ error: 'Invalid category type' }, { status: 400 });
    }
    if (
      !Array.isArray(orderedIds) ||
      orderedIds.length === 0 ||
      !orderedIds.every((id) => typeof id === 'string')
    ) {
      return NextResponse.json({ error: 'orderedIds must be a list of ids' }, { status: 400 });
    }

    // The list must be exactly the user's categories of this type — no
    // omissions, duplicates, or foreign ids.
    const existing = await prisma.budgetCategory.findMany({
      where: { userId: auth.userId, type },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((c) => c.id));
    const uniqueOrdered = new Set(orderedIds);
    if (
      uniqueOrdered.size !== orderedIds.length ||
      existingIds.size !== orderedIds.length ||
      !orderedIds.every((id) => existingIds.has(id))
    ) {
      return NextResponse.json(
        { error: 'orderedIds must contain each category of this type exactly once' },
        { status: 400 }
      );
    }

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.budgetCategory.update({ where: { id }, data: { sortOrder: index } })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to reorder categories:', error);
    return NextResponse.json({ error: 'Failed to reorder categories' }, { status: 500 });
  }
}
