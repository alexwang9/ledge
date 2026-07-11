import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  MAX_CATEGORY_NAME_LENGTH,
  validateCategoryName,
  validateMonthlyLimit,
} from '@/lib/category-validation';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();

    const data: { name?: string; monthlyLimit?: number | null } = {};

    if (body.name !== undefined) {
      const name = validateCategoryName(body.name);
      if (!name) {
        return NextResponse.json(
          { error: `Name must be 1-${MAX_CATEGORY_NAME_LENGTH} characters` },
          { status: 400 }
        );
      }
      data.name = name;
    }

    if (body.monthlyLimit !== undefined) {
      const limit = validateMonthlyLimit(body.monthlyLimit);
      if (!limit.ok) {
        return NextResponse.json(
          { error: 'Monthly budget must be a non-negative number or null' },
          { status: 400 }
        );
      }
      data.monthlyLimit = limit.value;
    }

    // Type changes are deliberately unsupported: silently moving a category
    // between sections flips the sign convention of all its history.
    if (body.type !== undefined) {
      return NextResponse.json({ error: 'Category type cannot be changed' }, { status: 400 });
    }

    const existing = await prisma.budgetCategory.findFirst({
      where: { id, userId: auth.userId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const category = await prisma.budgetCategory.update({
      where: { id },
      data,
      select: { id: true, name: true, type: true, monthlyLimit: true, sortOrder: true },
    });

    return NextResponse.json({ category });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 409 }
      );
    }
    console.error('Failed to update category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;

    const existing = await prisma.budgetCategory.findFirst({
      where: { id, userId: auth.userId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // FK behavior: transactions SetNull (become uncategorized), rules Cascade.
    await prisma.budgetCategory.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
