/**
 * Escapes a value for inclusion in a CSV cell.
 *
 * Besides RFC 4180 quoting, values starting with a formula trigger
 * (= + - @, or a stray tab/CR) are prefixed with a single quote so that
 * spreadsheet applications render them as text instead of executing them
 * (CSV/formula injection).
 */
export function escapeCsvField(field: string): string {
  let value = field;
  if (/^[=+\-@\t\r]/.test(value)) {
    value = `'${value}`;
  }
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
