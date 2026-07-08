import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { prismaMock, syncBatchMock } = vi.hoisted(() => ({
  prismaMock: {
    plaidItem: { findMany: vi.fn(), count: vi.fn() },
  },
  syncBatchMock: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ default: prismaMock, prisma: prismaMock }));
// The batch runner's isolation/relink behavior is covered in
// src/lib/plaid-sync.test.ts; here we verify the route's auth, item
// selection, and summary assembly.
vi.mock('@/lib/plaid-sync', () => ({ syncItemsWithIsolation: syncBatchMock }));

import { GET } from './route';

const item = (id: string) => ({
  id,
  accessToken: 'enc',
  cursor: 'c0',
  institutionName: `Bank ${id}`,
  needsRelink: false,
});

function makeRequest(auth?: string): NextRequest {
  const headers = new Headers(auth ? { authorization: auth } : {});
  return { headers } as unknown as NextRequest;
}

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', 'test-secret');
  vi.clearAllMocks();
  prismaMock.plaidItem.findMany.mockResolvedValue([]);
  prismaMock.plaidItem.count.mockResolvedValue(0);
  syncBatchMock.mockResolvedValue({ added: 0, modified: 0, removed: 0, itemErrors: [] });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('GET /api/cron/sync-transactions', () => {
  it('fails closed with 500 when CRON_SECRET is not configured', async () => {
    vi.stubEnv('CRON_SECRET', '');

    const res = await GET(makeRequest('Bearer anything'));

    expect(res.status).toBe(500);
    expect(prismaMock.plaidItem.findMany).not.toHaveBeenCalled();
    expect(syncBatchMock).not.toHaveBeenCalled();
  });

  it('returns 401 without an authorization header', async () => {
    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(prismaMock.plaidItem.findMany).not.toHaveBeenCalled();
  });

  it('returns 401 for a wrong bearer token', async () => {
    const res = await GET(makeRequest('Bearer wrong-secret'));

    expect(res.status).toBe(401);
    expect(prismaMock.plaidItem.findMany).not.toHaveBeenCalled();
  });

  it('syncs all non-relink items across users and reports a summary', async () => {
    const items = [item('item1'), item('item2')];
    prismaMock.plaidItem.findMany.mockResolvedValue(items);
    prismaMock.plaidItem.count.mockResolvedValue(3);
    syncBatchMock.mockResolvedValue({ added: 3, modified: 1, removed: 1, itemErrors: [] });

    const res = await GET(makeRequest('Bearer test-secret'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      itemsProcessed: 2,
      itemsSkippedNeedsRelink: 3,
      added: 3,
      modified: 1,
      removed: 1,
      itemErrors: [],
    });
    expect(prismaMock.plaidItem.findMany).toHaveBeenCalledWith({
      where: { needsRelink: false },
    });
    expect(prismaMock.plaidItem.count).toHaveBeenCalledWith({
      where: { needsRelink: true },
    });
    expect(syncBatchMock).toHaveBeenCalledWith(items);
  });

  it('reports partial failure without failing the run', async () => {
    prismaMock.plaidItem.findMany.mockResolvedValue([item('item1'), item('item2')]);
    syncBatchMock.mockResolvedValue({
      added: 1,
      modified: 0,
      removed: 0,
      itemErrors: [
        { plaidItemId: 'item1', institutionName: 'Bank item1', error: 'ITEM_LOGIN_REQUIRED' },
      ],
    });

    const res = await GET(makeRequest('Bearer test-secret'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.added).toBe(1);
    expect(body.itemErrors).toEqual([
      { plaidItemId: 'item1', institutionName: 'Bank item1', error: 'ITEM_LOGIN_REQUIRED' },
    ]);
  });

  it('returns 500 when the item query itself fails', async () => {
    prismaMock.plaidItem.findMany.mockRejectedValue(new Error('db down'));

    const res = await GET(makeRequest('Bearer test-secret'));

    expect(res.status).toBe(500);
  });
});
