import { FoodOrderStatus } from './food-order-status.enum.js';

describe('FoodOrderStatus', () => {
  it('TC-KMS-ORDER-001: Given the food-order status model, when enum values are inspected, then only approved states exist', () => {
    // Arrange / Act
    const values = Object.values(FoodOrderStatus);

    // Assert
    expect(values).toEqual([
      'PLACED',
      'IN_PREPARATION',
      'READY',
      'DELIVERED',
      'CANCELLED',
    ]);
  });
});
