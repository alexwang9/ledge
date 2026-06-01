import { NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { mapAccountType } from '@/lib/flow-type';

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
        plaidItemId: itemId,
        institutionId,
        institutionName,
        cursor: null, // Will be set after first sync
      },
    });

    // Seed Account rows immediately so the user sees them before the first sync.
    // The sync pipeline will also upsert these, so this is a best-effort prefetch.
    try {
      const accountsResp = await plaidClient.accountsGet({ access_token: accessToken });
      for (const acct of accountsResp.data.accounts) {
        await prisma.account.upsert({
          where: { plaidAccountId: acct.account_id },
          create: {
            plaidItemId: plaidItem.id,
            plaidAccountId: acct.account_id,
            name: acct.name,
            officialName: acct.official_name ?? null,
            mask: acct.mask ?? null,
            type: mapAccountType(acct.type),
            subtype: acct.subtype ?? null,
          },
          update: {
            name: acct.name,
            officialName: acct.official_name ?? null,
            mask: acct.mask ?? null,
            type: mapAccountType(acct.type),
            subtype: acct.subtype ?? null,
          },
        });
      }
    } catch (err) {
      // Non-fatal: next sync will upsert accounts.
      console.error('Failed to prefetch accounts on link:', err);
    }

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
