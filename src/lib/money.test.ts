import { describe, it, expect } from 'vitest';
import { roundCents } from '@/lib/money';

describe('roundCents', () => {
  it('rounds accumulated float error to cents', () => {
    expect(roundCents(0.1 + 0.2)).toBe(0.3);
    expect(roundCents(10.005000000001)).toBe(10.01);
  });

  it('preserves sign and exact values', () => {
    expect(roundCents(-12.345)).toBe(-12.34);
    expect(roundCents(100)).toBe(100);
    expect(roundCents(0)).toBe(0);
  });
});
