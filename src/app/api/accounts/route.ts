import { NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
    // Get all PlaidItems for this user
    const plaidItems = await prisma.plaidItem.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'asc' },
    });

    if (plaidItems.length === 0) {
      return NextResponse.json({ institutions: [] });
    }

    // Fetch accounts for each PlaidItem
    const institutions = await Promise.all(
      plaidItems.map(async (item) => {
        try {
          const response = await plaidClient.accountsBalanceGet({
            access_token: item.accessToken,
          });

          const accounts = response.data.accounts.map((account) => ({
            id: account.account_id,
            name: account.name,
            officialName: account.official_name,
            type: account.type,
            subtype: account.subtype,
            mask: account.mask,
            currentBalance: account.balances.current,
            availableBalance: account.balances.available,
            limit: account.balances.limit,
            isoCurrencyCode: account.balances.iso_currency_code,
          }));

          return {
            id: item.id,
            institutionId: item.institutionId,
            institutionName: item.institutionName,
            connectedAt: item.createdAt,
            needsRelink: item.needsRelink,
            accounts,
            error: null,
          };
        } catch (error) {
          console.error(`Error fetching accounts for ${item.institutionName}:`, error);
          // Return institution with error state instead of failing entirely
          return {
            id: item.id,
            institutionId: item.institutionId,
            institutionName: item.institutionName,
            connectedAt: item.createdAt,
            needsRelink: item.needsRelink,
            accounts: [],
            error: 'Failed to fetch accounts',
          };
        }
      })
    );

    return NextResponse.json({ institutions });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}
