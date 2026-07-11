import { BudgetCategoryType, CategorySource, FlowType } from '@prisma/client';

export interface RuleEntry {
  budgetCategoryId: string | null;
  ignore: boolean;
}

export interface CategoryEntry {
  id: string;
  type: BudgetCategoryType;
}

export interface ResolvedCategory {
  budgetCategoryId: string | null;
  ignored: boolean;
  source: Extract<CategorySource, 'RULE' | 'AUTO'>;
}

/** Key for rule lookup: the merchant name when Plaid provides one, else the
 * transaction description. Lowercased — rules store lowercase names. */
export function ruleKey(merchantName: string | null, name: string): string {
  return (merchantName ?? name).toLowerCase();
}

/** Key for matching a Plaid-mapped category name against user categories. */
export function categoryKey(type: BudgetCategoryType, name: string): string {
  return `${type}:${name.toLowerCase()}`;
}

/**
 * Resolves a synced transaction to a budget category:
 * 1. A merchant rule wins outright (assign or ignore) — including transfers.
 * 2. Transfers have no meaningful Plaid mapping → uncategorized for triage.
 * 3. The Plaid-mapped name is matched (case-insensitively) against the user's
 *    categories of the flow-compatible type: INCOME flow only matches INCOME
 *    categories, everything else matches EXPENSE categories.
 * 4. No match → uncategorized.
 *
 * Never called for transactions with categorySource USER — sync preserves
 * manual assignments (see plaid-sync upsertTransaction).
 */
export function resolveCategory(input: {
  merchantName: string | null;
  name: string;
  plaidMappedName: string;
  flowType: FlowType;
  rulesByMerchant: ReadonlyMap<string, RuleEntry>;
  categoriesByKey: ReadonlyMap<string, CategoryEntry>;
}): ResolvedCategory {
  const rule = input.rulesByMerchant.get(ruleKey(input.merchantName, input.name));
  if (rule) {
    return {
      budgetCategoryId: rule.ignore ? null : rule.budgetCategoryId,
      ignored: rule.ignore,
      source: 'RULE',
    };
  }

  if (input.flowType === 'TRANSFER') {
    return { budgetCategoryId: null, ignored: false, source: 'AUTO' };
  }

  const targetType: BudgetCategoryType =
    input.flowType === 'INCOME' ? 'INCOME' : 'EXPENSE';
  const match = input.categoriesByKey.get(
    categoryKey(targetType, input.plaidMappedName)
  );

  return {
    budgetCategoryId: match?.id ?? null,
    ignored: false,
    source: 'AUTO',
  };
}
