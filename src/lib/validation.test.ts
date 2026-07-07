import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword, clampMonthYear } from '@/lib/validation';

describe('validateEmail', () => {
  it('accepts a normal address', () => {
    expect(validateEmail('user@example.com').valid).toBe(true);
  });

  it('rejects missing @ or domain dot', () => {
    expect(validateEmail('userexample.com').valid).toBe(false);
    expect(validateEmail('user@example').valid).toBe(false);
    expect(validateEmail('user @example.com').valid).toBe(false);
  });
});

describe('validatePassword', () => {
  it('accepts a compliant password', () => {
    expect(validatePassword('Abcdef12').valid).toBe(true);
  });

  it('rejects short / missing-class passwords', () => {
    expect(validatePassword('Ab1').valid).toBe(false); // too short
    expect(validatePassword('abcdefg1').valid).toBe(false); // no uppercase
    expect(validatePassword('ABCDEFG1').valid).toBe(false); // no lowercase
    expect(validatePassword('Abcdefgh').valid).toBe(false); // no number
  });
});

describe('clampMonthYear', () => {
  const now = new Date(2026, 6, 15); // July 2026

  it('parses valid params', () => {
    expect(clampMonthYear('0', '2025', now)).toEqual({ month: 0, year: 2025 });
    expect(clampMonthYear('11', '2027', now)).toEqual({ month: 11, year: 2027 });
  });

  it('falls back to current month/year when missing', () => {
    expect(clampMonthYear(null, null, now)).toEqual({ month: 6, year: 2026 });
  });

  it('falls back on non-numeric input', () => {
    expect(clampMonthYear('abc', 'xyz', now)).toEqual({ month: 6, year: 2026 });
  });

  it('falls back on out-of-range values', () => {
    expect(clampMonthYear('-1', '2026', now)).toEqual({ month: 6, year: 2026 });
    expect(clampMonthYear('12', '2026', now)).toEqual({ month: 6, year: 2026 });
    expect(clampMonthYear('5', '1999', now)).toEqual({ month: 5, year: 2026 });
    expect(clampMonthYear('5', '2028', now)).toEqual({ month: 5, year: 2026 });
  });
});
