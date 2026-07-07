import { describe, it, expect } from 'vitest';
import { mapPlaidCategory } from '@/lib/category-mapping';

describe('mapPlaidCategory', () => {
  it('returns Other for missing categories', () => {
    expect(mapPlaidCategory(null)).toEqual({ category: 'Other', subcategory: null });
    expect(mapPlaidCategory(undefined)).toEqual({ category: 'Other', subcategory: null });
    expect(mapPlaidCategory([])).toEqual({ category: 'Other', subcategory: null });
  });

  it('maps primary categories', () => {
    expect(mapPlaidCategory(['FOOD_AND_DRINK', 'RESTAURANTS'])).toEqual({
      category: 'Everyday',
      subcategory: 'restaurants',
    });
    expect(mapPlaidCategory(['INCOME'])).toEqual({ category: 'Wages', subcategory: null });
    expect(mapPlaidCategory(['TRAVEL'])).toEqual({ category: 'Travel', subcategory: null });
  });

  it('applies detailed-category overrides before primary mapping', () => {
    // RENT_AND_UTILITIES normally maps to Utilities, but rent goes to Home
    expect(mapPlaidCategory(['RENT_AND_UTILITIES', 'RENT'])).toEqual({
      category: 'Home',
      subcategory: 'rent',
    });
    // MEDICAL normally maps to Health/Medical, but veterinary goes to Pets
    expect(mapPlaidCategory(['MEDICAL', 'VETERINARY_SERVICES'])).toEqual({
      category: 'Pets',
      subcategory: 'veterinary services',
    });
  });

  it('falls back to Other for unknown primaries', () => {
    expect(mapPlaidCategory(['SOMETHING_NEW', 'DETAIL'])).toEqual({
      category: 'Other',
      subcategory: 'detail',
    });
  });
});
