import { MenuItemStockStatus } from './menu-item-stock-status.enum.js';

describe('MenuItemStockStatus', () => {
  it('TC-KMS-MENU-001: Given the menu stock model, when enum values are inspected, then only approved stock states exist', () => {
    // Arrange / Act
    const values = Object.values(MenuItemStockStatus);

    // Assert
    expect(values).toEqual([
      'AVAILABLE',
      'LOW_STOCK',
      'UNAVAILABLE',
      'TEMPORARILY_DISABLED',
    ]);
  });
});
