import { NextRequest, NextResponse } from 'next/server';
import { CountryCode, Products } from 'plaid';
import { plaidClient } from '@/lib/plaid';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const { plaid_item_id } = body as { plaid_item_id?: unknown };

    // Update mode (re-link): resolve the access token server-side, scoped to
    // the session user. The token itself never leaves the server.
    let accessToken: string | undefined;
    if (plaid_item_id !== undefined) {
      if (typeof plaid_item_id !== 'string' || !plaid_item_id) {
        return NextResponse.json({ error: 'Invalid plaid_item_id' }, { status: 400 });
      }
      const item = await prisma.plaidItem.findFirst({
        where: { id: plaid_item_id, userId: auth.userId },
        select: { accessToken: true },
      });
      if (!item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
      accessToken = item.accessToken;
    }

    const baseParams = {
      user: { client_user_id: auth.userId },
      client_name: 'Ledge',
      country_codes: [CountryCode.Us],
      language: 'en' as const,
      ...(process.env.PLAID_REDIRECT_URI
        ? { redirect_uri: process.env.PLAID_REDIRECT_URI }
        : {}),
    };

    // Update mode: pass access_token instead of products
    const params = accessToken
      ? { ...baseParams, access_token: accessToken }
      : { ...baseParams, products: [Products.Transactions] };

    const response = await plaidClient.linkTokenCreate(params);

    return NextResponse.json({
      link_token: response.data.link_token,
      expiration: response.data.expiration,
    });
  } catch (error) {
    console.error('Error creating link token:', error);
    return NextResponse.json(
      { error: 'Failed to create link token' },
      { status: 500 }
    );
  }
}
