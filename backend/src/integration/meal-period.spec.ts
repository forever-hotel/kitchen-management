import { categoryMealPeriod } from './meal-period.js';
import { matchesMealPeriod } from '../modules/orders/order-intake-logic.js';
import type { MenuItem } from '../modules/menu/entities/menu-item.entity.js';

describe('Cross-service meal periods', () => {
  it.each([
    ['Demo Lunch', 'LUNCH'],
    ['Breakfast Specials', 'BREAKFAST'],
    ['Dinner', 'DINNER'],
    ['Tea Time', 'TEA_TIME'],
    ['Demo Tea', 'TEA_TIME'],
    ['Lunch Dinner', null],
    ['Mains', null],
    ['Luncheon', null],
    [undefined, null],
  ])('maps %s without inventing enum values', (name, expected) => {
    expect(categoryMealPeriod(name)).toBe(expected);
    expect(matchesMealPeriod({ category: { name } } as MenuItem, 'LUNCH')).toBe(
      expected === 'LUNCH',
    );
  });
});
