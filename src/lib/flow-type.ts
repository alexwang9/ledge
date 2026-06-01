import { AccountType, FlowType } from '@prisma/client';

/**
 * Classifies a Plaid transaction into INCOME, EXPENSE, or TRANSFER.
 *
 * TRANSFER means money moving between the user's own accounts (credit-card
 * payoffs, Venmo cashouts, internal transfers). Transfers are excluded from
 * income/expense totals to prevent double-counting.
 */
export function classifyFlow(
  plaidPrimaryCategory: string | null,
  plaidDetailedCategory: string | null,
  accountType: AccountType | null,
  transactionName: string
): FlowType {
  if (accountType === 'depository' && /venmo/i.test(transactionName)) {
    return 'TRANSFER';
  }

  if (plaidDetailedCategory === 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT') {
    return 'TRANSFER';
  }

  if (
    plaidPrimaryCategory === 'TRANSFER_IN' ||
    plaidPrimaryCategory === 'TRANSFER_OUT'
  ) {
    return 'TRANSFER';
  }

  if (plaidPrimaryCategory === 'INCOME') {
    return 'INCOME';
  }

  return 'EXPENSE';
}

/**
 * Maps Plaid's account type string to our AccountType enum.
 * Defaults to `other` for unknown types.
 */
export function mapAccountType(plaidType: string | null | undefined): AccountType {
  switch (plaidType) {
    case 'depository':
      return 'depository';
    case 'credit':
      return 'credit';
    case 'loan':
      return 'loan';
    case 'investment':
    case 'brokerage':
      return 'investment';
    default:
      return 'other';
  }
}
