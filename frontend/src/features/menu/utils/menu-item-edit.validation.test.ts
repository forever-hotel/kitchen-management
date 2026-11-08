import type { KmsMealCategoryData } from '@/types/kms-menu';
import type { MenuManagementItem } from '../types/menu-management.type';
import type { MenuItemDraft } from './menu-item-write.validation';
import { buildMenuItemEditPayload, resolveEditAllergens } from './menu-item-edit.validation';

const categories: KmsMealCategoryData[] = [
  {
    categoryId: '22222222-2222-4222-8222-222222222222',
    name: 'Lunch',
    orderStartTime: '11:30:00',
    orderCutoffTime: '14:30:00',
  },
  {
    categoryId: '44444444-4444-4444-8444-444444444444',
    name: 'Dinner',
    orderStartTime: '18:00:00',
    orderCutoffTime: '22:00:00',
  },
];
const allergens = [
  { allergenId: 'a1111111-1111-4111-8111-111111111111', name: 'Eggs' },
  { allergenId: 'a2222222-2222-4222-8222-222222222222', name: 'Milk' },
];
const dietary = [{ dietaryLabelId: 'b1111111-1111-4111-8111-111111111111', name: 'Vegetarian' }];
const item: MenuManagementItem = {
  menuItemId: '91111111-1111-4111-8111-111111111111',
  categoryId: categories[0].categoryId,
  name: 'Egg Fried Rice',
  description: 'With sambol',
  price: 1200,
  preparationTime: 15,
  portionLimit: 3,
  stockStatus: 'LOW_STOCK',
  imageUrl: 'https://example.com/menu.jpg',
  allergens: [{ allergenId: allergens[0].allergenId, name: 'Eggs' }],
  dietaryLabels: [{ dietaryLabelId: dietary[0].dietaryLabelId, name: 'Vegetarian' }],
};
function draft(overrides: Partial<MenuItemDraft> = {}): MenuItemDraft {
  return {
    categoryId: item.categoryId,
    name: item.name,
    description: item.description ?? '',
    price: String(item.price),
    preparationTime: String(item.preparationTime),
    portionLimit: String(item.portionLimit),
    stockStatus: item.stockStatus,
    imageUrl: item.imageUrl ?? '',
    allergenIds: [allergens[0].allergenId],
    dietaryLabelIds: [dietary[0].dietaryLabelId],
    ...overrides,
  };
}

describe('R-09 safe partial menu updates', () => {
  it('TC-KMS-R09-001: changed scalar fields never rewrite unchanged tag associations', () => {
    const patch = buildMenuItemEditPayload(
      item,
      draft({ name: 'Egg Rice Deluxe', price: '1300' }),
      categories,
      allergens,
      dietary,
    );
    expect(patch).toEqual({ name: 'Egg Rice Deluxe', price: 1300 });
    expect(patch).not.toHaveProperty('allergenIds');
    expect(patch).not.toHaveProperty('dietaryLabelIds');
  });

  it('TC-KMS-R09-002: explicitly changed tags send new lists; an empty list clears intentionally', () => {
    const patch = buildMenuItemEditPayload(
      item,
      draft({ allergenIds: [], dietaryLabelIds: [] }),
      categories,
      allergens,
      dietary,
    );
    expect(patch).toEqual({ allergenIds: [], dietaryLabelIds: [] });
  });

  it('TC-KMS-R09-003: unchanged edit does not send an empty PATCH request', () => {
    expect(() => buildMenuItemEditPayload(item, draft(), categories, allergens, dietary)).toThrow(
      'No changes to save.',
    );
  });

  it('TC-KMS-R09-004: unresolved existing associations remain untouched during other edits', () => {
    const patch = buildMenuItemEditPayload(
      item,
      draft({ name: 'Updated rice', allergenIds: [], dietaryLabelIds: [] }),
      categories,
      [],
      [],
    );
    expect(patch).toEqual({ name: 'Updated rice' });
  });

  it('TC-KMS-R09-005: an explicit unknown tag ID never silently remaps to an unrelated name match', () => {
    const changed = {
      ...item,
      allergens: [{ allergenId: 'c1111111-1111-4111-8111-111111111111', name: 'Eggs' }],
    };
    const resolved = resolveEditAllergens(changed, allergens);
    expect(resolved.ids).toEqual([]);
    expect(resolved.unresolved).toEqual(['Eggs']);
  });

  it('TC-KMS-R09-006: validates all numeric values before PATCH creation', () => {
    expect(() =>
      buildMenuItemEditPayload(item, draft({ price: '0' }), categories, allergens, dietary),
    ).toThrow(/Price must be/);
    expect(() =>
      buildMenuItemEditPayload(
        item,
        draft({ portionLimit: '2147483648' }),
        categories,
        allergens,
        dietary,
      ),
    ).toThrow(/portion limit/);
  });
});
