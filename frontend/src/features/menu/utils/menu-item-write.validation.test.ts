import type { KmsMealCategoryData } from '@/types/kms-menu';

import {
  menuItemDraftToPayload,
  normalizeMenuImageUrl,
  validateMenuItemDraft,
  type MenuItemDraft,
} from './menu-item-write.validation';

const category: KmsMealCategoryData = {
  categoryId: '22222222-2222-4222-8222-222222222222',
  name: 'Lunch',
  orderStartTime: '11:30:00',
  orderCutoffTime: '14:30:00',
};
const allergens = [{ allergenId: 'a1111111-1111-4111-8111-111111111111', name: 'Eggs' }];
const dietaryLabels = [
  { dietaryLabelId: 'b1111111-1111-4111-8111-111111111111', name: 'Vegetarian' },
];
const valid: MenuItemDraft = {
  categoryId: category.categoryId,
  name: '  Vegetable Rice  ',
  description: '  Seasonal vegetables  ',
  price: '1650',
  preparationTime: '18',
  portionLimit: '5',
  stockStatus: 'AVAILABLE',
  imageUrl: 'https://example.com/rice.jpg',
  allergenIds: [allergens[0].allergenId],
  dietaryLabelIds: [dietaryLabels[0].dietaryLabelId],
};
const validate = (override: Partial<MenuItemDraft> = {}) =>
  validateMenuItemDraft({ ...valid, ...override }, [category], allergens, dietaryLabels);

describe('R-08 menu item form validation', () => {
  it('TC-KMS-R08-001: validates required category/name and normalizes a valid payload', () => {
    expect(validate({ name: ' ' })).toMatch(/Item name is required/);
    expect(validate({ categoryId: '' })).toMatch(/Choose an existing/);
    expect(validate()).toBeNull();
    expect(menuItemDraftToPayload(valid, [category], allergens, dietaryLabels)).toEqual({
      categoryId: category.categoryId,
      name: 'Vegetable Rice',
      description: 'Seasonal vegetables',
      price: 1650,
      preparationTime: 18,
      portionLimit: 5,
      stockStatus: 'AVAILABLE',
      imageUrl: 'https://example.com/rice.jpg',
      allergenIds: [allergens[0].allergenId],
      dietaryLabelIds: [dietaryLabels[0].dietaryLabelId],
    });
  });

  it('TC-KMS-R08-002: rejects zero, negatives, decimals, numeric strings beyond PostgreSQL int32', () => {
    ['0', '-1', '1.25', '2147483648', 'abc', ''].forEach((price) => {
      expect(validate({ price })).toMatch(/Price must be/);
    });
    expect(validate({ price: '2147483647' })).toBeNull();
    expect(validate({ preparationTime: '0' })).toMatch(/Preparation minutes/);
    expect(validate({ portionLimit: '0' })).toMatch(/portion limit/);
  });

  it('TC-KMS-R08-003: only accepts selected existing unique allergen and dietary-label UUIDs', () => {
    expect(validate({ allergenIds: ['bad'] })).toMatch(/allergen/);
    expect(validate({ allergenIds: [allergens[0].allergenId, allergens[0].allergenId] })).toMatch(
      /unique allergen/,
    );
    expect(validate({ dietaryLabelIds: ['b2222222-2222-4222-8222-222222222222'] })).toMatch(
      /dietary labels/,
    );
    expect(validate({ allergenIds: [], dietaryLabelIds: [] })).toBeNull();
  });

  it('TC-KMS-R08-004: disallows unsafe image schemes, credentials and overlong URLs', () => {
    expect(normalizeMenuImageUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeMenuImageUrl('data:image/svg+xml,<svg/>')).toBeNull();
    expect(normalizeMenuImageUrl('https://user:pass@example.com/pic.jpg')).toBeNull();
    expect(validate({ imageUrl: 'javascript:alert(1)' })).toMatch(/Image URL/);
    expect(validate({ imageUrl: `https://example.com/${'x'.repeat(501)}` })).toMatch(/Image URL/);
    expect(normalizeMenuImageUrl(' https://example.com/a.png ')).toBe('https://example.com/a.png');
    expect(validate({ imageUrl: '' })).toBeNull();
  });
});
