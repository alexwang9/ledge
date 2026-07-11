import { describe, it, expect } from 'vitest';
import {
  normalizeActual,
  annualBudget,
  delta,
  isFavorableDelta,
  sectionTotals,
  netCashFlow,
  zeroMonths,
  type BudgetCategoryView,
} from '@/lib/budget-math';
import { formatDelta } from '@/lib/format';

function cat(overrides: Partial<BudgetCategoryView>): BudgetCategoryView {
  return {
    id: 'c1',
    name: 'Test',
    type: 'EXPENSE',
    monthlyLimit: null,
    sortOrder: 0,
    ...overrides,
  };
}

describe('normalizeActual', () => {
  it('flips sign for income so paychecks (negative amounts) read positive', () => {
    expect(normalizeActual('INCOME', -5000)).toBe(5000);
  });

  it('income reversals net out against paychecks', () => {
    expect(normalizeActual('INCOME', -5000 + 200)).toBe(4800);
  });

  it('keeps sign for expenses so refunds net out', () => {
    expect(normalizeActual('EXPENSE', 120 - 20)).toBe(100);
  });

  it('savings outflows read positive', () => {
    expect(normalizeActual('SAVINGS_TRANSFER', 500)).toBe(500);
  });
});

describe('annualBudget', () => {
  it('multiplies the monthly limit by 12', () => {
    expect(annualBudget(250)).toBe(3000);
  });

  it('is null when no budget is set', () => {
    expect(annualBudget(null)).toBeNull();
  });
});

describe('delta', () => {
  it('is actual minus budget in every section', () => {
    expect(delta(1200, 1000)).toBe(200);
    expect(delta(800, 1000)).toBe(-200);
  });

  it('is null when no budget is set', () => {
    expect(delta(500, null)).toBeNull();
  });
});

describe('isFavorableDelta', () => {
  it('under budget is favorable for expenses', () => {
    expect(isFavorableDelta('EXPENSE', -50)).toBe(true);
    expect(isFavorableDelta('EXPENSE', 50)).toBe(false);
  });

  it('over budget is favorable for income and savings', () => {
    expect(isFavorableDelta('INCOME', 50)).toBe(true);
    expect(isFavorableDelta('INCOME', -50)).toBe(false);
    expect(isFavorableDelta('SAVINGS_TRANSFER', 50)).toBe(true);
    expect(isFavorableDelta('SAVINGS_TRANSFER', -50)).toBe(false);
  });
});

describe('formatDelta', () => {
  it('renders negatives in parentheses', () => {
    expect(formatDelta(-123.45)).toBe('($123.45)');
  });

  it('renders positives normally', () => {
    expect(formatDelta(123.45)).toBe('$123.45');
  });

  it('renders a dash when there is no budget', () => {
    expect(formatDelta(null)).toBe('—');
  });
});

describe('sectionTotals', () => {
  const categories: BudgetCategoryView[] = [
    cat({ id: 'rent', name: 'Rent', type: 'EXPENSE', monthlyLimit: 2000 }),
    cat({ id: 'food', name: 'Food', type: 'EXPENSE', monthlyLimit: null }),
    cat({ id: 'wages', name: 'Wages', type: 'INCOME', monthlyLimit: 6000 }),
  ];
  const actuals: Record<string, number[]> = {
    rent: [2000, 2000, ...zeroMonths().slice(2)],
    food: [100.1, 200.2, ...zeroMonths().slice(2)],
    wages: [6000, 6000, ...zeroMonths().slice(2)],
  };

  it('sums actuals across categories of the section only', () => {
    const totals = sectionTotals(categories, actuals, 'EXPENSE');
    expect(totals.monthlyActuals[0]).toBe(2100.1);
    expect(totals.monthlyActuals[1]).toBe(2200.2);
    expect(totals.annualActual).toBe(4300.3);
  });

  it('treats missing budgets as zero in the subtotal', () => {
    const totals = sectionTotals(categories, actuals, 'EXPENSE');
    expect(totals.monthlyBudget).toBe(2000);
    expect(totals.annualBudget).toBe(24000);
  });

  it('handles categories with no transactions', () => {
    const totals = sectionTotals(categories, {}, 'INCOME');
    expect(totals.monthlyActuals).toEqual(zeroMonths());
    expect(totals.monthlyBudget).toBe(6000);
  });
});

describe('netCashFlow', () => {
  it('is income minus expenses minus savings for actuals and budgets', () => {
    const income = sectionTotals(
      [cat({ id: 'w', type: 'INCOME', monthlyLimit: 6000 })],
      { w: [6000, ...zeroMonths().slice(1)] },
      'INCOME'
    );
    const expenses = sectionTotals(
      [cat({ id: 'r', type: 'EXPENSE', monthlyLimit: 2000 })],
      { r: [2500, ...zeroMonths().slice(1)] },
      'EXPENSE'
    );
    const savings = sectionTotals(
      [cat({ id: 's', type: 'SAVINGS_TRANSFER', monthlyLimit: 1000 })],
      { s: [1000, ...zeroMonths().slice(1)] },
      'SAVINGS_TRANSFER'
    );

    const net = netCashFlow(income, expenses, savings);
    expect(net.monthlyActuals[0]).toBe(2500);
    expect(net.annualActual).toBe(2500);
    expect(net.monthlyBudget).toBe(3000);
    expect(net.annualBudget).toBe(36000);
  });
});
