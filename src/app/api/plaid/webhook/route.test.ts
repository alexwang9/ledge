import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'crypto';
import type { NextRequest } from 'next/server';

const { prismaMock, plaidClientMock, syncMock, joseMocks } = vi.hoisted(() => ({
  prismaMock: {
    plaidItem: { findFirst: vi.fn(), updateMany: vi.fn() },
  },
  plaidClientMock: {
    webhookVerificationKeyGet: vi.fn(),
  },
  syncMock: vi.fn(),
  joseMocks: {
    importJWK: vi.fn(),
    jwtVerify: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({ default: prismaMock, prisma: prismaMock }));
vi.mock('@/lib/plaid', () => ({ plaidClient: plaidClientMock }));
vi.mock('jose', () => ({ importJWK: joseMocks.importJWK, jwtVerify: joseMocks.jwtVerify }));
// Keep the real isRelinkRequiredError/markItemNeedsRelink so the webhook tests
// exercise the actual relink-code set; only the sync itself is stubbed.
vi.mock('@/lib/plaid-sync', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/plaid-sync')>();
  return { ...actual, syncTransactionsForItem: syncMock };
});

import { POST } from './route';

function fakeJwt(alg = 'ES256'): string {
  const header = Buffer.from(JSON.stringify({ alg, kid: 'key-1' })).toString('base64url');
  return `${header}.payload.signature`;
}

function sha256hex(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

/**
 * Builds a webhook request whose JWT "verifies" (jwtVerify resolves with the
 * body's real sha256, matching what Plaid would sign).
 */
function makeRequest(body: unknown, jwt: string | null = fakeJwt()): NextRequest {
  const rawBody = JSON.stringify(body);
  joseMocks.jwtVerify.mockResolvedValue({
    payload: { request_body_sha256: sha256hex(rawBody) },
  });
  const headers = new Headers(jwt ? { 'plaid-verification': jwt } : {});
  return { text: async () => rawBody, headers } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  plaidClientMock.webhookVerificationKeyGet.mockResolvedValue({ data: { key: { kty: 'EC' } } });
  joseMocks.importJWK.mockResolvedValue({});
  prismaMock.plaidItem.findFirst.mockResolvedValue(null);
  prismaMock.plaidItem.updateMany.mockResolvedValue({ count: 1 });
  syncMock.mockResolvedValue({ added: 0, modified: 0, removed: 0 });
});

describe('POST /api/plaid/webhook', () => {
  it('returns 400 when the plaid-verification header is missing', async () => {
    const res = await POST(makeRequest({ webhook_type: 'TRANSACTIONS' }, null));

    expect(res.status).toBe(400);
    expect(syncMock).not.toHaveBeenCalled();
  });

  it('returns 401 when JWT verification fails', async () => {
    const req = makeRequest({ webhook_type: 'TRANSACTIONS' });
    joseMocks.jwtVerify.mockRejectedValue(new Error('bad signature'));

    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(syncMock).not.toHaveBeenCalled();
  });

  it('returns 401 when the body hash does not match the JWT claim', async () => {
    const req = makeRequest({ webhook_type: 'TRANSACTIONS' });
    joseMocks.jwtVerify.mockResolvedValue({
      payload: { request_body_sha256: sha256hex('a different body') },
    });

    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(syncMock).not.toHaveBeenCalled();
  });

  it('rejects non-ES256 JWTs without fetching a verification key', async () => {
    const res = await POST(makeRequest({ webhook_type: 'TRANSACTIONS' }, fakeJwt('RS256')));

    expect(res.status).toBe(401);
    expect(plaidClientMock.webhookVerificationKeyGet).not.toHaveBeenCalled();
  });

  it('syncs the matching item on TRANSACTIONS/SYNC_UPDATES_AVAILABLE', async () => {
    const row = { id: 'db-1', accessToken: 'enc', cursor: 'c0', plaidItemId: 'item-abc' };
    prismaMock.plaidItem.findFirst.mockResolvedValue(row);

    const res = await POST(
      makeRequest({
        webhook_type: 'TRANSACTIONS',
        webhook_code: 'SYNC_UPDATES_AVAILABLE',
        item_id: 'item-abc',
      })
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(prismaMock.plaidItem.findFirst).toHaveBeenCalledWith({
      where: { plaidItemId: 'item-abc' },
    });
    expect(syncMock).toHaveBeenCalledWith(row);
  });

  it('acknowledges sync webhooks for unknown items without syncing', async () => {
    prismaMock.plaidItem.findFirst.mockResolvedValue(null);

    const res = await POST(
      makeRequest({
        webhook_type: 'TRANSACTIONS',
        webhook_code: 'SYNC_UPDATES_AVAILABLE',
        item_id: 'item-unknown',
      })
    );

    expect(res.status).toBe(200);
    expect(syncMock).not.toHaveBeenCalled();
  });

  it('flags relink on ITEM/ERROR with a relink-requiring code', async () => {
    const res = await POST(
      makeRequest({
        webhook_type: 'ITEM',
        webhook_code: 'ERROR',
        item_id: 'item-abc',
        error: { error_code: 'ACCESS_NOT_GRANTED' },
      })
    );

    expect(res.status).toBe(200);
    expect(prismaMock.plaidItem.updateMany).toHaveBeenCalledWith({
      where: { plaidItemId: 'item-abc' },
      data: { needsRelink: true, relinkError: 'ACCESS_NOT_GRANTED' },
    });
  });

  it('ignores ITEM/ERROR with a transient code', async () => {
    const res = await POST(
      makeRequest({
        webhook_type: 'ITEM',
        webhook_code: 'ERROR',
        item_id: 'item-abc',
        error: { error_code: 'INSTITUTION_DOWN' },
      })
    );

    expect(res.status).toBe(200);
    expect(prismaMock.plaidItem.updateMany).not.toHaveBeenCalled();
  });

  it.each(['PENDING_EXPIRATION', 'PENDING_DISCONNECT'])(
    'flags relink on standalone ITEM/%s webhooks',
    async (code) => {
      const res = await POST(
        makeRequest({ webhook_type: 'ITEM', webhook_code: code, item_id: 'item-abc' })
      );

      expect(res.status).toBe(200);
      expect(prismaMock.plaidItem.updateMany).toHaveBeenCalledWith({
        where: { plaidItemId: 'item-abc' },
        data: { needsRelink: true, relinkError: code },
      });
    }
  );

  it('clears the relink flag on ITEM/LOGIN_REPAIRED', async () => {
    const res = await POST(
      makeRequest({ webhook_type: 'ITEM', webhook_code: 'LOGIN_REPAIRED', item_id: 'item-abc' })
    );

    expect(res.status).toBe(200);
    expect(prismaMock.plaidItem.updateMany).toHaveBeenCalledWith({
      where: { plaidItemId: 'item-abc' },
      data: { needsRelink: false, relinkError: null },
    });
  });

  it('returns 500 when the sync itself throws (so Plaid retries)', async () => {
    prismaMock.plaidItem.findFirst.mockResolvedValue({ id: 'db-1' });
    syncMock.mockRejectedValue(new Error('db down'));

    const res = await POST(
      makeRequest({
        webhook_type: 'TRANSACTIONS',
        webhook_code: 'SYNC_UPDATES_AVAILABLE',
        item_id: 'item-abc',
      })
    );

    expect(res.status).toBe(500);
  });
});
