import { NextRequest, NextResponse } from 'next/server';
import { importJWK, jwtVerify } from 'jose';
import { createHash, timingSafeEqual } from 'crypto';
import { plaidClient } from '@/lib/plaid';
import prisma from '@/lib/prisma';
import {
  isRelinkRequiredError,
  markItemNeedsRelink,
  syncTransactionsForItem,
} from '@/lib/plaid-sync';

async function verifyPlaidWebhook(rawBody: string, signedJwt: string): Promise<boolean> {
  try {
    const [headerB64] = signedJwt.split('.');
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());

    if (header.alg !== 'ES256') return false;

    const keyResponse = await plaidClient.webhookVerificationKeyGet({ key_id: header.kid });
    const jwk = keyResponse.data.key;

    const publicKey = await importJWK(jwk as Parameters<typeof importJWK>[0]);
    const { payload } = await jwtVerify(signedJwt, publicKey, { maxTokenAge: '5m' });

    const bodyHash = createHash('sha256').update(rawBody).digest('hex');
    const claimedHash = Buffer.from(payload.request_body_sha256 as string, 'hex');
    const computedHash = Buffer.from(bodyHash, 'hex');

    return (
      claimedHash.length === computedHash.length &&
      timingSafeEqual(claimedHash, computedHash)
    );
  } catch {
    return false;
  }
}

async function handleSyncUpdatesAvailable(plaidItemId: string) {
  const item = await prisma.plaidItem.findFirst({
    where: { plaidItemId },
  });
  if (!item) return;
  await syncTransactionsForItem(item);
}

async function handleItemError(plaidItemId: string, errorCode: string) {
  if (!isRelinkRequiredError(errorCode)) return;
  await markItemNeedsRelink({ plaidItemId }, errorCode);
}

async function handleLoginRepaired(plaidItemId: string) {
  await prisma.plaidItem.updateMany({
    where: { plaidItemId },
    data: { needsRelink: false, relinkError: null },
  });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signedJwt = request.headers.get('plaid-verification') ?? '';

  if (!signedJwt) {
    return NextResponse.json({ error: 'Missing verification header' }, { status: 400 });
  }

  const isValid = await verifyPlaidWebhook(rawBody, signedJwt);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  try {
    const body = JSON.parse(rawBody);
    const { webhook_type, webhook_code, item_id, error } = body;

    if (webhook_type === 'TRANSACTIONS' && webhook_code === 'SYNC_UPDATES_AVAILABLE') {
      await handleSyncUpdatesAvailable(item_id);
    } else if (webhook_type === 'ITEM' && webhook_code === 'ERROR') {
      await handleItemError(item_id, error?.error_code ?? '');
    } else if (
      webhook_type === 'ITEM' &&
      (webhook_code === 'PENDING_EXPIRATION' || webhook_code === 'PENDING_DISCONNECT')
    ) {
      // Plaid delivers these as standalone webhook codes (not ITEM/ERROR):
      // consent is about to expire / the institution connection is winding
      // down, so prompt the user to relink proactively.
      await markItemNeedsRelink({ plaidItemId: item_id }, webhook_code);
    } else if (webhook_type === 'ITEM' && webhook_code === 'LOGIN_REPAIRED') {
      await handleLoginRepaired(item_id);
    }
    // Other webhook types acknowledged but not acted on
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
