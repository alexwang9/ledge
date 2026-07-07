/**
 * Rounds a dollar amount to cents. Transaction amounts are stored as floats,
 * so sums accumulate IEEE 754 error; apply this at aggregation/response
 * boundaries.
 */
export function roundCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}
