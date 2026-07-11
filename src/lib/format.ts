const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

// Accounting style renders negatives in parentheses: ($123.45)
const accountingFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  currencySign: 'accounting',
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

/**
 * Formats a budget delta: parentheses for negative values, "—" when there is
 * no budget to compare against (delta is null).
 */
export function formatDelta(delta: number | null): string {
  if (delta === null) return '—';
  return accountingFormatter.format(delta);
}
