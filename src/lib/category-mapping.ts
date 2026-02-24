/**
 * Maps Plaid's detailed category to our BudgetCategory names.
 * Plaid returns categories as an array like ["FOOD_AND_DRINK", "RESTAURANTS"]
 * We use the primary category (first element) to determine the mapping.
 *
 * See: https://plaid.com/documents/transactions-personal-finance-category-taxonomy.csv
 */

type CategoryMapping = {
  category: string;
  subcategory: string | null;
};

const PLAID_TO_BUDGET_CATEGORY: Record<string, string> = {
  // Income categories
  INCOME: 'Wages',
  TRANSFER_IN: 'Other', // Income: Other

  // Expense categories
  BANK_FEES: 'Other',
  ENTERTAINMENT: 'Entertainment',
  FOOD_AND_DRINK: 'Everyday',
  GENERAL_MERCHANDISE: 'Everyday',
  GENERAL_SERVICES: 'Other',
  GOVERNMENT_AND_NON_PROFIT: 'Other',
  HOME_IMPROVEMENT: 'Home',
  LOAN_PAYMENTS: 'Debt',
  MEDICAL: 'Health/Medical',
  PERSONAL_CARE: 'Everyday',
  RENT_AND_UTILITIES: 'Utilities',
  TRANSPORTATION: 'Transportation',
  TRAVEL: 'Travel',
  TRANSFER_OUT: 'Other',
};

// More specific mappings for detailed categories (secondary level)
const DETAILED_CATEGORY_OVERRIDES: Record<string, string> = {
  // Education
  'GENERAL_MERCHANDISE_BOOKSTORES_AND_NEWSSTANDS': 'Education',
  'GENERAL_SERVICES_EDUCATION': 'Education',

  // Gifts
  'GENERAL_MERCHANDISE_GIFT_AND_NOVELTY': 'Gifts',
  'TRANSFER_OUT_GIFT': 'Gifts',

  // Health/Medical
  'PERSONAL_CARE_PHARMACIES': 'Health/Medical',
  'MEDICAL_DENTAL_CARE': 'Health/Medical',
  'MEDICAL_EYE_CARE': 'Health/Medical',
  'MEDICAL_HOSPITALS': 'Health/Medical',
  'MEDICAL_MEDICAL_SUPPLIES_AND_LABS': 'Health/Medical',
  'MEDICAL_MENTAL_HEALTH': 'Health/Medical',
  'MEDICAL_PHYSICIANS': 'Health/Medical',
  'MEDICAL_VETERINARY_SERVICES': 'Pets',

  // Home
  'RENT_AND_UTILITIES_RENT': 'Home',
  'HOME_IMPROVEMENT_FURNITURE': 'Home',
  'HOME_IMPROVEMENT_HARDWARE': 'Home',
  'GENERAL_MERCHANDISE_DEPARTMENT_STORES': 'Home',

  // Insurance
  'LOAN_PAYMENTS_INSURANCE': 'Insurance',
  'TRANSFER_OUT_INSURANCE': 'Insurance',

  // Pets
  'GENERAL_MERCHANDISE_PET_SUPPLIES': 'Pets',
  'GENERAL_SERVICES_PET_SERVICES': 'Pets',

  // Technology
  'GENERAL_MERCHANDISE_ELECTRONICS': 'Technology',
  'GENERAL_SERVICES_COMPUTERS_AND_ELECTRONICS': 'Technology',
  'RENT_AND_UTILITIES_INTERNET_AND_CABLE': 'Technology',
  'RENT_AND_UTILITIES_TELEPHONE': 'Technology',

  // Entertainment specifics
  'ENTERTAINMENT_CASINOS_AND_GAMBLING': 'Entertainment',
  'ENTERTAINMENT_MUSIC_AND_AUDIO': 'Entertainment',
  'ENTERTAINMENT_SPORTING_EVENTS_AMUSEMENT_PARKS_AND_MUSEUMS': 'Entertainment',
  'ENTERTAINMENT_TV_AND_MOVIES': 'Entertainment',
  'ENTERTAINMENT_VIDEO_GAMES': 'Entertainment',

  // Travel specifics
  'TRAVEL_FLIGHTS': 'Travel',
  'TRAVEL_LODGING': 'Travel',
  'TRAVEL_RENTAL_CARS': 'Travel',
  'TRANSPORTATION_TAXI': 'Transportation',
  'TRANSPORTATION_PUBLIC_TRANSIT': 'Transportation',
  'TRANSPORTATION_PARKING': 'Transportation',
  'TRANSPORTATION_GAS': 'Transportation',

  // Utilities specifics
  'RENT_AND_UTILITIES_GAS_AND_ELECTRICITY': 'Utilities',
  'RENT_AND_UTILITIES_SEWAGE_AND_WASTE_MANAGEMENT': 'Utilities',
  'RENT_AND_UTILITIES_WATER': 'Utilities',

  // Debt
  'LOAN_PAYMENTS_CAR_PAYMENT': 'Debt',
  'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT': 'Debt',
  'LOAN_PAYMENTS_MORTGAGE_PAYMENT': 'Debt',
  'LOAN_PAYMENTS_STUDENT_LOAN': 'Debt',
};

/**
 * Maps Plaid's personal finance category to our budget category names.
 *
 * @param detailedCategory - Plaid's detailed category array (e.g., ["FOOD_AND_DRINK", "RESTAURANTS"])
 * @returns Object with category and subcategory strings
 */
export function mapPlaidCategory(
  detailedCategory: string[] | null | undefined
): CategoryMapping {
  if (!detailedCategory || detailedCategory.length === 0) {
    return { category: 'Other', subcategory: null };
  }

  const primary = detailedCategory[0];
  const secondary = detailedCategory[1] || null;

  // Build the detailed key for override lookup
  const detailedKey = secondary ? `${primary}_${secondary}` : primary;

  // Check for specific override first
  if (DETAILED_CATEGORY_OVERRIDES[detailedKey]) {
    return {
      category: DETAILED_CATEGORY_OVERRIDES[detailedKey],
      subcategory: secondary?.toLowerCase().replace(/_/g, ' ') || null,
    };
  }

  // Fall back to primary category mapping
  const category = PLAID_TO_BUDGET_CATEGORY[primary] || 'Other';

  return {
    category,
    subcategory: secondary?.toLowerCase().replace(/_/g, ' ') || null,
  };
}

/**
 * Determines if a transaction is income based on Plaid's category
 */
export function isIncomeCategory(
  detailedCategory: string[] | null | undefined
): boolean {
  if (!detailedCategory || detailedCategory.length === 0) {
    return false;
  }

  const primary = detailedCategory[0];
  return primary === 'INCOME' || primary === 'TRANSFER_IN';
}
