import type { MenuManagementItem } from '@/features/menu';

import { MENU_ITEMS_FIXTURE } from './kms-menu.fixture';

/** Test-only relationship examples, not real hotel records. */
export const MENU_ITEMS_R03_FIXTURE: readonly MenuManagementItem[] = MENU_ITEMS_FIXTURE.map(
  (item, index) => ({
    ...item,
    allergens: index === 0 ? [{ name: 'Eggs' }] : index === 1 ? [{ name: 'Soy' }] : [],
    dietaryLabels:
      index === 2 ? [{ name: 'Vegetarian option' }] : index === 3 ? [{ name: 'Gluten-free' }] : [],
  }),
);
