import { roundCents } from '@/lib/money';

/**
 * Pure budget-table math shared by the dashboard API (normalization) and the
 * homepage client (subtotals, deltas, net cash flow). String union rather
 * than the Prisma enum so client components don't import @prisma/client.
 */
export type CategoryType = 'INCOME' | 'EXPENSE' | 'SAVINGS_TRANSFER';

export interface BudgetCategoryView {
  id: string;
  name: string;
  type: CategoryType;
  monthlyLimit: number | null;
  sortOrder: number;
}

export const MONTHS_PER_YEAR = 12;

export function zeroMonths(): number[] {
  return new Array<number>(MONTHS_PER_YEAR).fill(0);
}

/**
 * Normalizes a raw signed sum of transaction amounts (Plaid convention:
 * positive = money out) so each section's expected direction reads positive:
 * income actuals flip sign (paychecks are negative amounts); expense and
 * savings actuals keep sign so refunds/reversals net out.
 */
export function normalizeActual(type: CategoryType, rawSum: number): number {
  return type === 'INCOME' ? -rawSum : rawSum;
}

export function annualBudget(monthlyLimit: number | null): number | null {
  return monthlyLimit === null ? null : roundCents(monthlyLimit * MONTHS_PER_YEAR);
}

/** Δ = Actual − Budget in every section; null when no budget is set. */
export function delta(actual: number, budget: number | null): number | null {
  return budget === null ? null : roundCents(actual - budget);
}

/**
 * Whether a delta is favorable for its section — drives color only, never
 * the sign: under-budget is good for expenses, over-budget is good for
 * income and savings.
 */
export function isFavorableDelta(type: CategoryType, deltaValue: number): boolean {
  return type === 'EXPENSE' ? deltaValue <= 0 : deltaValue >= 0;
}

export interface SectionTotals {
  monthlyActuals: number[];
  annualActual: number;
  monthlyBudget: number;
  annualBudget: number;
}

/**
 * Subtotals for one section. Categories without a budget contribute 0 to the
 * budget totals (their own rows render "—", but a subtotal must be a number).
 */
export function sectionTotals(
  categories: readonly BudgetCategoryView[],
  actualsByCategory: Record<string, number[]>,
  type: CategoryType
): SectionTotals {
  const monthlyActuals = zeroMonths();
  let monthlyBudget = 0;

  for (const category of categories) {
    if (category.type !== type) continue;
    monthlyBudget += category.monthlyLimit ?? 0;
    const actuals = actualsByCategory[category.id];
    if (!actuals) continue;
    for (let month = 0; month < MONTHS_PER_YEAR; month++) {
      monthlyActuals[month] += actuals[month] ?? 0;
    }
  }

  const rounded = monthlyActuals.map(roundCents);
  return {
    monthlyActuals: rounded,
    annualActual: roundCents(rounded.reduce((sum, v) => sum + v, 0)),
    monthlyBudget: roundCents(monthlyBudget),
    annualBudget: roundCents(monthlyBudget * MONTHS_PER_YEAR),
  };
}

/** Net Cash Flow = Income − Expenses − Savings, for actuals and budgets alike. */
export function netCashFlow(
  income: SectionTotals,
  expenses: SectionTotals,
  savings: SectionTotals
): SectionTotals {
  const monthlyActuals = zeroMonths().map((_, month) =>
    roundCents(
      income.monthlyActuals[month] -
        expenses.monthlyActuals[month] -
        savings.monthlyActuals[month]
    )
  );
  const monthlyBudget = roundCents(
    income.monthlyBudget - expenses.monthlyBudget - savings.monthlyBudget
  );
  return {
    monthlyActuals,
    annualActual: roundCents(monthlyActuals.reduce((sum, v) => sum + v, 0)),
    monthlyBudget,
    annualBudget: roundCents(monthlyBudget * MONTHS_PER_YEAR),
  };
}
