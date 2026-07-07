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

export async function syncTransactionsForItem(rawItem: PlaidItemRecord) {
  // Decrypt here (rather than in callers) so both the sync route and the
  // webhook handler get it for free.
  const plaidItem = { ...rawItem, accessToken: decryptToken(rawItem.accessToken) };

  const accountMap = await upsertAccountsForItem(plaidItem);

  let cursor = plaidItem.cursor;
  let hasMore = true;

  const allAdded: PlaidTransaction[] = [];
  const allModified: PlaidTransaction[] = [];
  const allRemoved: RemovedTransaction[] = [];

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

  for (const txn of allAdded) {
    const { category, subcategory } = mapPlaidCategory(buildCategoryArray(txn));
    const acct = accountMap.get(txn.account_id);
    const flowType = getFlowType(txn, acct?.type ?? null);

    await prisma.transaction.upsert({
      where: { plaidTransactionId: txn.transaction_id },
      update: {
        date: new Date(txn.date),
        name: txn.name,
        merchantName: txn.merchant_name || null,
        amount: txn.amount,
        category,
        subcategory,
        accountId: acct?.id ?? null,
        flowType,
        pending: txn.pending,
      },
      create: {
        plaidItemId: plaidItem.id,
        plaidTransactionId: txn.transaction_id,
        date: new Date(txn.date),
        name: txn.name,
        merchantName: txn.merchant_name || null,
        amount: txn.amount,
        category,
        subcategory,
        accountId: acct?.id ?? null,
        flowType,
        pending: txn.pending,
      },
    });
  }

  for (const txn of allModified) {
    const { category, subcategory } = mapPlaidCategory(buildCategoryArray(txn));
    const acct = accountMap.get(txn.account_id);
    const flowType = getFlowType(txn, acct?.type ?? null);

    await prisma.transaction.update({
      where: { plaidTransactionId: txn.transaction_id },
      data: {
        date: new Date(txn.date),
        name: txn.name,
        merchantName: txn.merchant_name || null,
        amount: txn.amount,
        category,
        subcategory,
        accountId: acct?.id ?? null,
        flowType,
        pending: txn.pending,
      },
    });
  }

  for (const removed of allRemoved) {
    if (removed.transaction_id) {
      await prisma.transaction
        .delete({ where: { plaidTransactionId: removed.transaction_id } })
        .catch(() => {});
    }
  }

  await prisma.plaidItem.update({
    where: { id: plaidItem.id },
    data: { cursor },
  });

  return {
    added: allAdded.length,
    modified: allModified.length,
    removed: allRemoved.length,
  };
}
