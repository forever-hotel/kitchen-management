import { MENU_CATEGORIES_FIXTURE } from './kms-menu.fixture';
import { ORDERING_WINDOWS_FIXTURE } from './kms-ordering-windows.fixture';

describe('R-01 typed ordering-window test fixtures', () => {
  it('TC-KMS-R01-05: Given four meal categories, when windows are derived, then each category maps to one window', () => {
    expect(ORDERING_WINDOWS_FIXTURE).toHaveLength(MENU_CATEGORIES_FIXTURE.length);
    expect(ORDERING_WINDOWS_FIXTURE.map((window) => window.categoryId)).toEqual(
      MENU_CATEGORIES_FIXTURE.map((category) => category.categoryId),
    );
  });

  it('TC-KMS-R01-06: Given ordering windows, when checked, then time strings and same-day ranges are valid', () => {
    for (const window of ORDERING_WINDOWS_FIXTURE) {
      expect(window.orderStartTime).toMatch(/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/);
      expect(window.orderCutoffTime).toMatch(/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/);
      expect(window.orderStartTime < window.orderCutoffTime).toBe(true);
    }
  });
});
