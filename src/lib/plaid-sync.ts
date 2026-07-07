import { AccountType, FlowType } from '@prisma/client';
import { RemovedTransaction, Transaction as PlaidTransaction } from 'plaid';
import { plaidClient } from '@/lib/plaid';
import prisma from '@/lib/prisma';
import { mapPlaidCategory } from '@/lib/category-mapping';
import { classifyFlow, mapAccountType } from '@/lib/flow-type';
import { decryptToken } from '@/lib/crypto';

type PlaidItemRecord = {
  id: string;
  accessToken: string;
  cursor: string | null;
};

type AccountInfo = {
  id: string;
  type: AccountType;
};

async function upsertAccountsForItem(
  plaidItem: PlaidItemRecord
): Promise<Map<string, AccountInfo>> {
  const accountsResp = await plaidClient.accountsGet({
    access_token: plaidItem.accessToken,
  });

  const accountMap = new Map<string, AccountInfo>();

  for (const acct of accountsResp.data.accounts) {
    const type = mapAccountType(acct.type);
    const upserted = await prisma.account.upsert({
      where: { plaidAccountId: acct.account_id },
      create: {
        plaidItemId: plaidItem.id,
        plaidAccountId: acct.account_id,
        name: acct.name,
        officialName: acct.official_name ?? null,
        mask: acct.mask ?? null,
        type,
        subtype: acct.subtype ?? null,
      },
      update: {
        name: acct.name,
        officialName: acct.official_name ?? null,
        mask: acct.mask ?? null,
        type,
        subtype: acct.subtype ?? null,
      },
    });
    accountMap.set(acct.account_id, { id: upserted.id, type });
  }

  return accountMap;
}

function buildCategoryArray(txn: PlaidTransaction): string[] | null {
  const pfc = txn.personal_finance_category;
  if (!pfc?.primary) return null;
  if (pfc.detailed) {
    return [pfc.primary, pfc.detailed.replace(`${pfc.primary}_`, '')];
  }
  return [pfc.primary];
}

function getFlowType(
  txn: PlaidTransaction,
  accountType: AccountType | null
): FlowType {
  const pfc = txn.personal_finance_category;
  return classifyFlow(
    pfc?.primary ?? null,
    pfc?.detailed ?? null,
    accountType,
    txn.name
  );
}

/**
 * Extracts Plaid's error_code from an axios-shaped SDK error, or null.
 */
export function getPlaidErrorCode(err: unknown): string | null {
  const data = (err as { response?: { data?: { error_code?: unknown } } })?.response?.data;
  return typeof data?.error_code === 'string' ? data.error_code : null;
}

async function upsertTransaction(
  txn: PlaidTransaction,
  plaidItemId: string,
  accountMap: Map<string, AccountInfo>
): Promise<void> {
  const { category, subcategory } = mapPlaidCategory(buildCategoryArray(txn));
  const acct = accountMap.get(txn.account_id);
  const flowType = getFlowType(txn, acct?.type ?? null);

  const fields = {
    date: new Date(txn.date),
    name: txn.name,
    merchantName: txn.merchant_name || null,
    amount: txn.amount,
    category,
    subcategory,
    accountId: acct?.id ?? null,
    flowType,
    pending: txn.pending,
  };

  await prisma.transaction.upsert({
    where: { plaidTransactionId: txn.transaction_id },
    update: fields,
    create: {
      plaidItemId,
      plaidTransactionId: txn.transaction_id,
      ...fields,
    },
  });
}

const MAX_SYNC_ATTEMPTS = 3;

export async function syncTransactionsForItem(rawItem: PlaidItemRecord) {
  // Decrypt here (rather than in callers) so both the sync route and the
  // webhook handler get it for free.
  const plaidItem = { ...rawItem, accessToken: decryptToken(rawItem.accessToken) };

  const accountMap = await upsertAccountsForItem(plaidItem);

  // Fetch all pages before applying anything, so a mid-pagination failure
  // never leaves partial state, and a mutation-during-pagination restart is
  // just "throw away the accumulators and start over from the saved cursor".
  let cursor = plaidItem.cursor;
  let allAdded: PlaidTransaction[] = [];
  let allModified: PlaidTransaction[] = [];
  let allRemoved: RemovedTransaction[] = [];

  for (let attempt = 1; ; attempt++) {
    try {
      let hasMore = true;
      while (hasMore) {
        const response = await plaidClient.transactionsSync({
          access_token: plaidItem.accessToken,
          cursor: cursor || undefined,
          count: 500,
        });

        const data = response.data;
        allAdded.push(...data.added);
        allModified.push(...data.modified);
        allRemoved.push(...data.removed);

        hasMore = data.has_more;
        cursor = data.next_cursor;
      }
      break;
    } catch (err) {
      const shouldRetry =
        getPlaidErrorCode(err) === 'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION' &&
        attempt < MAX_SYNC_ATTEMPTS;
      if (!shouldRetry) throw err;
      cursor = plaidItem.cursor;
      allAdded = [];
      allModified = [];
      allRemoved = [];
    }
  }

  // Plaid can report a transaction as modified that we never stored (e.g. a
  // cursor race), so modified rows go through the same upsert as added rows.
  for (const txn of [...allAdded, ...allModified]) {
    await upsertTransaction(txn, plaidItem.id, accountMap);
  }

  for (const removed of allRemoved) {
    if (removed.transaction_id) {
      await prisma.transaction.deleteMany({
        where: { plaidTransactionId: removed.transaction_id },
      });
    }
  }

  // Optimistic write: only advance the cursor if no concurrent sync (webhook
  // vs. manual) advanced it first. Losing the race is safe to skip — both
  // syncs started from the same cursor and all writes above are idempotent,
  // so the next sync simply re-fetches a suffix of already-applied deltas.
  await prisma.plaidItem.updateMany({
    where: { id: plaidItem.id, cursor: plaidItem.cursor },
    data: { cursor },
  });

  return {
    added: allAdded.length,
    modified: allModified.length,
    removed: allRemoved.length,
  };
}
