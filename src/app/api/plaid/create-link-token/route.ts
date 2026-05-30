import { NextRequest, NextResponse } from 'next/server';
import { CountryCode, Products } from 'plaid';
import { plaidClient } from '@/lib/plaid';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const { access_token } = body as { access_token?: string };

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
    const params = access_token
      ? { ...baseParams, access_token }
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
