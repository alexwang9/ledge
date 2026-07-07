import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { decryptToken } from '@/lib/crypto';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;

    // Verify the PlaidItem belongs to this user
    const plaidItem = await prisma.plaidItem.findFirst({
      where: {
        id,
        userId: auth.userId,
      },
    });

    if (!plaidItem) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Remove the item from Plaid (optional but good practice)
    try {
      await plaidClient.itemRemove({
        access_token: decryptToken(plaidItem.accessToken),
      });
    } catch (error) {
      // Log but don't fail if Plaid removal fails
      console.error('Failed to remove item from Plaid:', error);
    }

    // Delete the PlaidItem (cascades to transactions)
    await prisma.plaidItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unlinking account:', error);
    return NextResponse.json(
      { error: 'Failed to unlink account' },
      { status: 500 }
    );
  }
}
