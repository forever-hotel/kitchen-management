/**
 * R-01 test-only data. No production component imports these fixtures.
 * The values follow existing shared KMS frontend types and DB constraints.
 * Prices are positive integers; currency/minor-unit interpretation remains unsettled.
 */
import type { KmsMealCategoryData, KmsMenuItemData } from '@/types/kms-menu';

export const MENU_CATEGORIES_FIXTURE = [
  {
    categoryId: '11111111-1111-4111-8111-111111111111',
    name: 'Breakfast',
    orderStartTime: '06:30:00',
    orderCutoffTime: '10:00:00',
  },
  {
    categoryId: '22222222-2222-4222-8222-222222222222',
    name: 'Lunch',
    orderStartTime: '11:30:00',
    orderCutoffTime: '14:30:00',
  },
  {
    categoryId: '33333333-3333-4333-8333-333333333333',
    name: 'Tea-Time',
    orderStartTime: '15:00:00',
    orderCutoffTime: '17:30:00',
  },
  {
    categoryId: '44444444-4444-4444-8444-444444444444',
    name: 'Dinner',
    orderStartTime: '18:00:00',
    orderCutoffTime: '22:00:00',
  },
] as const satisfies readonly KmsMealCategoryData[];

export const MENU_ITEMS_FIXTURE = [
  {
    menuItemId: '91111111-1111-4111-8111-111111111111',
    categoryId: MENU_CATEGORIES_FIXTURE[0].categoryId,
    name: 'Sri Lankan Breakfast Plate',
    description: 'Hoppers, sambol and a boiled egg.',
    price: 950,
    preparationTime: 15,
    portionLimit: 3,
    stockStatus: 'AVAILABLE',
    imageUrl: null,
  },
  {
    menuItemId: '92222222-2222-4222-8222-222222222222',
    categoryId: MENU_CATEGORIES_FIXTURE[1].categoryId,
    name: 'Chicken Fried Rice',
    description: 'Fried rice with vegetables and chicken.',
    price: 1650,
    preparationTime: 18,
    portionLimit: 4,
    stockStatus: 'LOW_STOCK',
    imageUrl: null,
  },
  {
    menuItemId: '93333333-3333-4333-8333-333333333333',
    categoryId: MENU_CATEGORIES_FIXTURE[2].categoryId,
    name: 'Chocolate Milkshake',
    description: 'Chilled chocolate milkshake.',
    price: 850,
    preparationTime: 6,
    portionLimit: 5,
    stockStatus: 'UNAVAILABLE',
    imageUrl: null,
  },
  {
    menuItemId: '94444444-4444-4444-8444-444444444444',
    categoryId: MENU_CATEGORIES_FIXTURE[3].categoryId,
    name: 'Grilled Fish Fillet',
    description: 'Grilled fish with steamed vegetables.',
    price: 2900,
    preparationTime: 22,
    portionLimit: 3,
    stockStatus: 'TEMPORARILY_DISABLED',
    imageUrl: null,
  },
] as const satisfies readonly KmsMenuItemData[];
