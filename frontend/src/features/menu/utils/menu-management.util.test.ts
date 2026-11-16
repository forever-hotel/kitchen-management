import { MENU_ITEMS_R03_FIXTURE } from '../../../../tests/fixtures/kms-menu-r03.fixture';

import { filterMenuItems, formatCategoryTime, getStockCounts } from './menu-management.util';

describe('R-03 menu list helpers', () => {
  it('TC-KMS-R03-008: counts all stock statuses and groups temporarily disabled as unavailable', () => {
    expect(getStockCounts(MENU_ITEMS_R03_FIXTURE)).toEqual({
      ALL: 4,
      AVAILABLE: 1,
      LOW_STOCK: 1,
      UNAVAILABLE: 2,
    });
  });

  it('TC-KMS-R03-009: category and case-insensitive search never leak other categories', () => {
    expect(
      filterMenuItems(
        MENU_ITEMS_R03_FIXTURE,
        MENU_ITEMS_R03_FIXTURE[1].categoryId,
        'CHICKEN',
        'LOW_STOCK',
      ).map((item) => item.name),
    ).toEqual(['Chicken Fried Rice']);
  });

  it('TC-KMS-R03-010: renders database time values without guessing the current window status', () => {
    expect(formatCategoryTime('11:30:00')).toBe('11:30');
  });
});
