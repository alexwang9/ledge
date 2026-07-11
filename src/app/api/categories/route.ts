import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { ensureUserCategories } from '@/lib/default-categories';
import {
  isCategoryType,
  MAX_CATEGORY_NAME_LENGTH,
  validateCategoryName,
  validateMonthlyLimit,
} from '@/lib/category-validation';

export async function GET() {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
    await ensureUserCategories(auth.userId);
    const categories = await prisma.budgetCategory.findMany({
      where: { userId: auth.userId },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, type: true, monthlyLimit: true, sortOrder: true },
    });
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const name = validateCategoryName(body.name);
    if (!name) {
      return NextResponse.json(
        { error: `Name must be 1-${MAX_CATEGORY_NAME_LENGTH} characters` },
        { status: 400 }
      );
    }
    if (!isCategoryType(body.type)) {
      return NextResponse.json({ error: 'Invalid category type' }, { status: 400 });
    }
    const limit = validateMonthlyLimit(body.monthlyLimit);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Monthly budget must be a non-negative number' },
        { status: 400 }
      );
    }

    const maxSort = await prisma.budgetCategory.aggregate({
      where: { userId: auth.userId, type: body.type },
      _max: { sortOrder: true },
    });

    const category = await prisma.budgetCategory.create({
      data: {
        userId: auth.userId,
        name,
        type: body.type,
        monthlyLimit: limit.value,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
      select: { id: true, name: true, type: true, monthlyLimit: true, sortOrder: true },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 409 }
      );
    }
    console.error('Failed to create category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
