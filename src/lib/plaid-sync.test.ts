import { describe, it, expect, vi, beforeEach } from 'vitest';

const { prismaMock, plaidClientMock } = vi.hoisted(() => ({
  prismaMock: {
    account: { upsert: vi.fn() },
    transaction: { upsert: vi.fn(), deleteMany: vi.fn() },
    plaidItem: { updateMany: vi.fn() },
  },
  plaidClientMock: {
    accountsGet: vi.fn(),
    transactionsSync: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({ default: prismaMock, prisma: prismaMock }));
vi.mock('@/lib/plaid', () => ({ plaidClient: plaidClientMock }));

import { syncTransactionsForItem, getPlaidErrorCode } from '@/lib/plaid-sync';

const ITEM = { id: 'item1', accessToken: 'plaintext-token', cursor: 'cursor-0' };

function plaidTxn(id: string, overrides: Record<string, unknown> = {}) {
  return {
    transaction_id: id,
    account_id: 'acct-plaid-1',
    date: '2026-07-01',
    name: `txn ${id}`,
    merchant_name: null,
    amount: 12.34,
    pending: false,
    personal_finance_category: { primary: 'FOOD_AND_DRINK', detailed: null },
    ...overrides,
  };
}

function syncPage(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      added: [],
      modified: [],
      removed: [],
      has_more: false,
      next_cursor: 'cursor-1',
      ...overrides,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  plaidClientMock.accountsGet.mockResolvedValue({
    data: {
      accounts: [
        { account_id: 'acct-plaid-1', name: 'Checking', official_name: null, mask: null, type: 'depository', subtype: null },
      ],
    },
  });
  prismaMock.account.upsert.mockResolvedValue({ id: 'acct-db-1', type: 'depository' });
  prismaMock.transaction.upsert.mockResolvedValue({});
  prismaMock.transaction.deleteMany.mockResolvedValue({ count: 1 });
  prismaMock.plaidItem.updateMany.mockResolvedValue({ count: 1 });
});

describe('getPlaidErrorCode', () => {
  it('extracts the code from an axios-shaped error', () => {
    expect(getPlaidErrorCode({ response: { data: { error_code: 'ITEM_LOGIN_REQUIRED' } } })).toBe(
      'ITEM_LOGIN_REQUIRED'
    );
  });

  it('returns null for anything else', () => {
    expect(getPlaidErrorCode(new Error('boom'))).toBe(null);
    expect(getPlaidErrorCode(undefined)).toBe(null);
    expect(getPlaidErrorCode({ response: { data: { error_code: 42 } } })).toBe(null);
  });
});

describe('syncTransactionsForItem', () => {
  it('paginates until has_more is false and applies all pages', async () => {
    plaidClientMock.transactionsSync
      .mockResolvedValueOnce(
        syncPage({ added: [plaidTxn('t1')], has_more: true, next_cursor: 'cursor-a' })
      )
      .mockResolvedValueOnce(syncPage({ added: [plaidTxn('t2')], next_cursor: 'cursor-b' }));

    const result = await syncTransactionsForItem(ITEM);

    expect(result).toEqual({ added: 2, modified: 0, removed: 0 });
    expect(plaidClientMock.transactionsSync).toHaveBeenCalledTimes(2);
    expect(plaidClientMock.transactionsSync).toHaveBeenNthCalledWith(2, expect.objectContaining({ cursor: 'cursor-a' }));
    expect(prismaMock.transaction.upsert).toHaveBeenCalledTimes(2);
  });

  it('upserts modified transactions (unknown rows must not abort the sync)', async () => {
    plaidClientMock.transactionsSync.mockResolvedValueOnce(
      syncPage({ modified: [plaidTxn('never-seen')] })
    );

    const result = await syncTransactionsForItem(ITEM);

    expect(result.modified).toBe(1);
    expect(prismaMock.transaction.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { plaidTransactionId: 'never-seen' } })
    );
  });

  it('restarts from the original cursor on TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION', async () => {
    const mutationError = {
      response: { data: { error_code: 'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION' } },
    };
    plaidClientMock.transactionsSync
      .mockResolvedValueOnce(
        syncPage({ added: [plaidTxn('stale')], has_more: true, next_cursor: 'cursor-a' })
      )
      .mockRejectedValueOnce(mutationError)
      .mockResolvedValueOnce(syncPage({ added: [plaidTxn('fresh')], next_cursor: 'cursor-b' }));

    const result = await syncTransactionsForItem(ITEM);

    // Accumulators were cleared: only the post-restart transaction is applied.
    expect(result.added).toBe(1);
    expect(prismaMock.transaction.upsert).toHaveBeenCalledTimes(1);
    expect(prismaMock.transaction.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { plaidTransactionId: 'fresh' } })
    );
    // Restarted pagination went back to the item's original cursor.
    expect(plaidClientMock.transactionsSync).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ cursor: 'cursor-0' })
    );
  });

  it('gives up after bounded retries on repeated mutation errors', async () => {
    const mutationError = {
      response: { data: { error_code: 'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION' } },
    };
    plaidClientMock.transactionsSync.mockRejectedValue(mutationError);

    await expect(syncTransactionsForItem(ITEM)).rejects.toBe(mutationError);
    expect(plaidClientMock.transactionsSync).toHaveBeenCalledTimes(3);
  });

  it('advances the cursor with an optimistic guard on the original cursor', async () => {
    plaidClientMock.transactionsSync.mockResolvedValueOnce(syncPage({ next_cursor: 'cursor-new' }));

    await syncTransactionsForItem(ITEM);

    expect(prismaMock.plaidItem.updateMany).toHaveBeenCalledWith({
      where: { id: 'item1', cursor: 'cursor-0' },
      data: { cursor: 'cursor-new' },
    });
  });

  it('deletes removed transactions via deleteMany', async () => {
    plaidClientMock.transactionsSync.mockResolvedValueOnce(
      syncPage({ removed: [{ transaction_id: 'gone' }] })
    );

    const result = await syncTransactionsForItem(ITEM);

    expect(result.removed).toBe(1);
    expect(prismaMock.transaction.deleteMany).toHaveBeenCalledWith({
      where: { plaidTransactionId: 'gone' },
    });
  });
});
