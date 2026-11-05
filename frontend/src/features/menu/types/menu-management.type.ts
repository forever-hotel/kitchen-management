import type { KmsMealCategoryData, KmsMenuItemData } from '@/types/kms-menu';

import type { CreateCategoryInput } from '../utils/create-category.validation';

/** The read-only R-02 response extends the initial R-01 menu fields. */
export interface MenuItemLabel {
  name: string;
}

export interface MenuManagementItem extends KmsMenuItemData {
  allergens?: readonly MenuItemLabel[];
  dietaryLabels?: readonly MenuItemLabel[];
}

export type MenuStockFilter = 'ALL' | 'AVAILABLE' | 'LOW_STOCK' | 'UNAVAILABLE';
export type MenuLoadState = 'ready' | 'loading' | 'error';

export interface MenuManagementScreenProps {
  categories: readonly KmsMealCategoryData[];
  items: readonly MenuManagementItem[];
  loadState?: MenuLoadState;
  errorMessage?: string;
  /** Must explicitly identify fixture previews; never pretend fixtures are live records. */
  dataMode?: 'fixtures' | 'api';
  onRetry?: () => void;
  onAddCategory?: () => void;
  /** These callbacks must call authenticated, server-backed APIs through an approved BFF. */
  onCreateCategory?: (input: CreateCategoryInput) => Promise<KmsMealCategoryData>;
  onRefreshCategories?: () => Promise<readonly KmsMealCategoryData[]>;
  onAddMenuItem?: (categoryId: string) => void;
  onEditItem?: (item: MenuManagementItem) => void;
  onEditWindow?: (categoryId: string) => void;
}
