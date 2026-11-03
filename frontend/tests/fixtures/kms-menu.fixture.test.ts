import { KMS_MENU_STOCK_STATUSES } from '@/types/kms-menu';

import { MENU_CATEGORIES_FIXTURE, MENU_ITEMS_FIXTURE } from './kms-menu.fixture';

describe('R-01 typed menu test fixtures', () => {
  it('TC-KMS-R01-01: Given sample categories, when checked, then IDs and names are unique', () => {
    expect(MENU_CATEGORIES_FIXTURE).toHaveLength(4);
    expect(new Set(MENU_CATEGORIES_FIXTURE.map((category) => category.categoryId)).size).toBe(4);
    expect(new Set(MENU_CATEGORIES_FIXTURE.map((category) => category.name)).size).toBe(4);
  });

  it('TC-KMS-R01-02: Given sample menu items, when checked, then DB field constraints are respected', () => {
    const categoryIds = new Set(MENU_CATEGORIES_FIXTURE.map((category) => category.categoryId));
    const itemIds = MENU_ITEMS_FIXTURE.map((item) => item.menuItemId);

    expect(new Set(itemIds).size).toBe(itemIds.length);
    for (const item of MENU_ITEMS_FIXTURE) {
      expect(categoryIds.has(item.categoryId)).toBe(true);
      expect(Number.isInteger(item.price) && item.price > 0).toBe(true);
      expect(Number.isInteger(item.preparationTime) && item.preparationTime > 0).toBe(true);
      expect(Number.isInteger(item.portionLimit) && item.portionLimit > 0).toBe(true);
      expect(KMS_MENU_STOCK_STATUSES).toContain(item.stockStatus);
    }
  });

  it('TC-KMS-R01-03: Given menu fixtures, when checked, then all four stock statuses are covered', () => {
    expect(MENU_ITEMS_FIXTURE.map((item) => item.stockStatus).sort()).toEqual(
      [...KMS_MENU_STOCK_STATUSES].sort(),
    );
  });
});
