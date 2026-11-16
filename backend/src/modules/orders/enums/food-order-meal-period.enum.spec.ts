import { FoodOrderMealPeriod } from './food-order-meal-period.enum.js';

describe('FoodOrderMealPeriod', () => {
  it('TC-KMS-ORDER-002: Given the meal-period model, when enum values are inspected, then only approved periods exist', () => {
    // Arrange / Act
    const values = Object.values(FoodOrderMealPeriod);

    // Assert
    expect(values).toEqual(['BREAKFAST', 'LUNCH', 'DINNER', 'TEA_TIME']);
  });
});
