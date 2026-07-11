import { BudgetCategoryType } from '@prisma/client';

export const CATEGORY_TYPES: BudgetCategoryType[] = [
  'INCOME',
  'EXPENSE',
  'SAVINGS_TRANSFER',
];

export const MAX_CATEGORY_NAME_LENGTH = 100;

export function isCategoryType(value: unknown): value is BudgetCategoryType {
  return typeof value === 'string' && (CATEGORY_TYPES as string[]).includes(value);
}

/** Returns the trimmed name, or null if invalid. */
export function validateCategoryName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_CATEGORY_NAME_LENGTH) return null;
  return trimmed;
}

/** null/undefined clears the budget; a number must be finite and >= 0. */
export function validateMonthlyLimit(limit: unknown): { ok: boolean; value: number | null } {
  if (limit === undefined || limit === null) return { ok: true, value: null };
  if (typeof limit !== 'number' || !Number.isFinite(limit) || limit < 0) {
    return { ok: false, value: null };
  }
  return { ok: true, value: limit };
}
