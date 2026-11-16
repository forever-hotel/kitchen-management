/**
 * Test-only ordering-window data derived from meal-category fixtures.
 * No enabled toggle or soft cutoff is present in the current database model.
 */
import type { KmsOrderingWindowData } from '@/types/kms-menu';

import { MENU_CATEGORIES_FIXTURE } from './kms-menu.fixture';

export const ORDERING_WINDOWS_FIXTURE: readonly KmsOrderingWindowData[] =
  MENU_CATEGORIES_FIXTURE.map(({ categoryId, orderStartTime, orderCutoffTime }) => ({
    categoryId,
    orderStartTime,
    orderCutoffTime,
  }));
