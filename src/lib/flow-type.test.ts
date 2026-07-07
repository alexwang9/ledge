import { describe, it, expect } from 'vitest';
import { classifyFlow, mapAccountType } from '@/lib/flow-type';

describe('classifyFlow', () => {
  it('classifies Venmo activity on depository accounts as TRANSFER', () => {
    expect(classifyFlow(null, null, 'depository', 'Venmo Cashout')).toBe('TRANSFER');
    expect(classifyFlow(null, null, 'credit', 'Venmo Payment')).toBe('EXPENSE');
  });

  it('classifies credit-card payments as TRANSFER', () => {
    expect(
      classifyFlow('LOAN_PAYMENTS', 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT', 'credit', 'Payment')
    ).toBe('TRANSFER');
  });

  it('classifies Plaid TRANSFER_IN/OUT as TRANSFER', () => {
    expect(classifyFlow('TRANSFER_IN', null, 'depository', 'Deposit')).toBe('TRANSFER');
    expect(classifyFlow('TRANSFER_OUT', null, 'depository', 'Withdrawal')).toBe('TRANSFER');
  });

  it('classifies INCOME as INCOME', () => {
    expect(classifyFlow('INCOME', 'INCOME_WAGES', 'depository', 'Paycheck')).toBe('INCOME');
  });

  it('defaults to EXPENSE', () => {
    expect(classifyFlow('FOOD_AND_DRINK', null, 'credit', 'Restaurant')).toBe('EXPENSE');
    expect(classifyFlow(null, null, null, 'Unknown')).toBe('EXPENSE');
  });
});

describe('mapAccountType', () => {
  it('maps known Plaid types', () => {
    expect(mapAccountType('depository')).toBe('depository');
    expect(mapAccountType('credit')).toBe('credit');
    expect(mapAccountType('loan')).toBe('loan');
    expect(mapAccountType('investment')).toBe('investment');
    expect(mapAccountType('brokerage')).toBe('investment');
  });

  it('defaults unknown/missing types to other', () => {
    expect(mapAccountType('mortgage')).toBe('other');
    expect(mapAccountType(null)).toBe('other');
    expect(mapAccountType(undefined)).toBe('other');
  });
});
