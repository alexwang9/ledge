import { describe, it, expect } from 'vitest';
import {
  resolveCategory,
  ruleKey,
  categoryKey,
  type RuleEntry,
  type CategoryEntry,
} from '@/lib/category-resolution';

const categories = new Map<string, CategoryEntry>([
  [categoryKey('EXPENSE', 'Everyday'), { id: 'cat-everyday', type: 'EXPENSE' }],
  [categoryKey('INCOME', 'Wages'), { id: 'cat-wages', type: 'INCOME' }],
  [categoryKey('EXPENSE', 'Other'), { id: 'cat-other-exp', type: 'EXPENSE' }],
  [categoryKey('INCOME', 'Other'), { id: 'cat-other-inc', type: 'INCOME' }],
]);

const noRules = new Map<string, RuleEntry>();

describe('resolveCategory', () => {
  it('matches the Plaid-mapped name against expense categories', () => {
    const result = resolveCategory({
      merchantName: 'Trader Joes',
      name: 'TRADER JOES #123',
      plaidMappedName: 'Everyday',
      flowType: 'EXPENSE',
      rulesByMerchant: noRules,
      categoriesByKey: categories,
    });
    expect(result).toEqual({
      budgetCategoryId: 'cat-everyday',
      ignored: false,
      source: 'AUTO',
    });
  });

  it('matches case-insensitively', () => {
    const result = resolveCategory({
      merchantName: null,
      name: 'store',
      plaidMappedName: 'EVERYDAY',
      flowType: 'EXPENSE',
      rulesByMerchant: noRules,
      categoriesByKey: categories,
    });
    expect(result.budgetCategoryId).toBe('cat-everyday');
  });

  it('INCOME flow only matches INCOME categories', () => {
    const income = resolveCategory({
      merchantName: 'Employer',
      name: 'PAYROLL',
      plaidMappedName: 'Other',
      flowType: 'INCOME',
      rulesByMerchant: noRules,
      categoriesByKey: categories,
    });
    expect(income.budgetCategoryId).toBe('cat-other-inc');

    const expense = resolveCategory({
      merchantName: 'Shop',
      name: 'SHOP',
      plaidMappedName: 'Other',
      flowType: 'EXPENSE',
      rulesByMerchant: noRules,
      categoriesByKey: categories,
    });
    expect(expense.budgetCategoryId).toBe('cat-other-exp');
  });

  it('unmatched Plaid name resolves to uncategorized', () => {
    const result = resolveCategory({
      merchantName: 'Mystery Inc',
      name: 'MYSTERY',
      plaidMappedName: 'Nonexistent',
      flowType: 'EXPENSE',
      rulesByMerchant: noRules,
      categoriesByKey: categories,
    });
    expect(result).toEqual({ budgetCategoryId: null, ignored: false, source: 'AUTO' });
  });

  it('transfers resolve to uncategorized rather than a Plaid match', () => {
    const result = resolveCategory({
      merchantName: 'Vanguard',
      name: 'VANGUARD BUY',
      plaidMappedName: 'Everyday',
      flowType: 'TRANSFER',
      rulesByMerchant: noRules,
      categoriesByKey: categories,
    });
    expect(result).toEqual({ budgetCategoryId: null, ignored: false, source: 'AUTO' });
  });

  it('a rule beats the Plaid mapping', () => {
    const rules = new Map<string, RuleEntry>([
      ['trader joes', { budgetCategoryId: 'cat-other-exp', ignore: false }],
    ]);
    const result = resolveCategory({
      merchantName: 'Trader Joes',
      name: 'TRADER JOES #123',
      plaidMappedName: 'Everyday',
      flowType: 'EXPENSE',
      rulesByMerchant: rules,
      categoriesByKey: categories,
    });
    expect(result).toEqual({
      budgetCategoryId: 'cat-other-exp',
      ignored: false,
      source: 'RULE',
    });
  });

  it('a rule also wins for transfers', () => {
    const rules = new Map<string, RuleEntry>([
      ['vanguard', { budgetCategoryId: 'cat-savings', ignore: false }],
    ]);
    const result = resolveCategory({
      merchantName: 'Vanguard',
      name: 'VANGUARD BUY',
      plaidMappedName: 'Everyday',
      flowType: 'TRANSFER',
      rulesByMerchant: rules,
      categoriesByKey: categories,
    });
    expect(result.budgetCategoryId).toBe('cat-savings');
    expect(result.source).toBe('RULE');
  });

  it('an ignore rule marks the transaction ignored and uncategorized', () => {
    const rules = new Map<string, RuleEntry>([
      ['chase credit card payment', { budgetCategoryId: null, ignore: true }],
    ]);
    const result = resolveCategory({
      merchantName: null,
      name: 'CHASE CREDIT CARD PAYMENT',
      plaidMappedName: 'Other',
      flowType: 'TRANSFER',
      rulesByMerchant: rules,
      categoriesByKey: categories,
    });
    expect(result).toEqual({ budgetCategoryId: null, ignored: true, source: 'RULE' });
  });

  it('rule lookup falls back to the description when merchantName is null', () => {
    expect(ruleKey(null, 'ACME PAYROLL')).toBe('acme payroll');
    expect(ruleKey('Acme', 'ACME PAYROLL')).toBe('acme');
  });
});
