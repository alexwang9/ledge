import { NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { public_token, metadata } = body;

    if (!public_token) {
      return NextResponse.json(
        { error: 'public_token is required' },
        { status: 400 }
      );
    }

    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Get institution info
    const institutionId = metadata?.institution?.institution_id || '';
    const institutionName = metadata?.institution?.name || 'Unknown Institution';

    // Store the PlaidItem
    const plaidItem = await prisma.plaidItem.create({
      data: {
        userId: auth.userId,
        accessToken,
        institutionId,
        institutionName,
        cursor: null, // Will be set after first sync
      },
    });

    return NextResponse.json({
      success: true,
      plaidItemId: plaidItem.id,
      itemId,
      institutionName,
    });
  } catch (error) {
    console.error('Error exchanging token:', error);
    return NextResponse.json(
      { error: 'Failed to exchange token' },
      { status: 500 }
    );
  }
}
