import { NextResponse } from 'next/server';
import { CountryCode, Products } from 'plaid';
import { plaidClient } from '@/lib/plaid';
import { requireAuth } from '@/lib/auth';

export async function POST() {
  const auth = await requireAuth();
  if ('error' in auth) return auth.error;

  try {
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: auth.userId,
      },
      client_name: 'Vizio Finance',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    });

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
