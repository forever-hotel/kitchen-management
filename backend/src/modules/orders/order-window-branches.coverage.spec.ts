import type { MealCategory } from '../menu-categories/entities/meal-category.entity.js';
import type { MenuItem } from '../menu/entities/menu-item.entity.js';
import {
  isCategoryOrderingOpen,
  matchesMealPeriod,
} from './order-intake-logic.js';

const hotelTime = new Date('2026-11-09T07:00:00.000Z'); // 12:30 Asia/Colombo
const window = {
  name: 'Lunch',
  orderStartTime: '11:00:00',
  orderCutoffTime: '14:00:00',
  orderingEnabled: true,
} as MealCategory;

describe('Guest order intake: saved hotel-local window validation', () => {
  it('honours the enabled current window', () => {
    expect(isCategoryOrderingOpen(window, hotelTime)).toBe(true);
  });

  it.each([
    ['manager-disabled category', { orderingEnabled: false }],
    ['incorrect start format', { orderStartTime: 'bad' }],
    ['incorrect cutoff format', { orderCutoffTime: 'bad' }],
    ['start hour outside 24-hour range', { orderStartTime: '24:00:00' }],
    ['start minute outside range', { orderStartTime: '10:60:00' }],
    ['start second outside range', { orderStartTime: '10:00:60' }],
    ['cutoff earlier than start', { orderCutoffTime: '10:00:00' }],
    ['zero-length ordering window', { orderCutoffTime: '11:00:00' }],
  ] as [string, Partial<MealCategory>][])(
    'refuses orders with %s',
    (...[, changes]: [string, Partial<MealCategory>]) => {
      expect(isCategoryOrderingOpen({ ...window, ...changes }, hotelTime)).toBe(
        false,
      );
    },
  );

  it('prevents guest intake before start and at the exact exclusive cutoff', () => {
    expect(
      isCategoryOrderingOpen(window, new Date('2026-11-09T05:29:59.000Z')),
    ).toBe(false);
    expect(
      isCategoryOrderingOpen(window, new Date('2026-11-09T05:30:00.000Z')),
    ).toBe(true);
    expect(
      isCategoryOrderingOpen(window, new Date('2026-11-09T08:30:00.000Z')),
    ).toBe(false);
  });

  it('checks canonical category-name matching rather than assuming a fixed meal', () => {
    const lunch = { category: { name: '  Lunch  ' } } as MenuItem;
    const tea = { category: { name: 'Tea Time' } } as MenuItem;
    expect(matchesMealPeriod(lunch, 'LUNCH')).toBe(true);
    expect(matchesMealPeriod(tea, 'TEA_TIME')).toBe(true);
    expect(matchesMealPeriod(lunch, 'DINNER')).toBe(false);
    expect(
      matchesMealPeriod({ category: undefined } as MenuItem, 'LUNCH'),
    ).toBe(false);
  });
});
