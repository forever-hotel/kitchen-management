import type { KmsMealCategoryData, KmsMenuItemData } from '@/types/kms-menu';

import type { CreateCategoryInput } from '../utils/create-category.validation';
import type { MenuItemEditPayload } from '../utils/menu-item-edit.validation';
import type {
  MenuAllergenOption,
  MenuDietaryLabelOption,
  MenuItemWritePayload,
} from '../utils/menu-item-write.validation';

/** The read-only R-02 response extends the initial R-01 menu fields. */
export interface MenuItemLabel {
  name: string;
  allergenId?: string;
  dietaryLabelId?: string;
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
  /** Both write AND subsequent reload must be connected to trusted authenticated BFF endpoints. */
  onCreateMenuItem?: (payload: MenuItemWritePayload) => Promise<unknown>;
  onUpdateMenuItem?: (menuItemId: string, payload: MenuItemEditPayload) => Promise<unknown>;
  onReloadMenuItems?: () => Promise<readonly MenuManagementItem[]>;
  allergenOptions?: readonly MenuAllergenOption[];
  dietaryLabelOptions?: readonly MenuDietaryLabelOption[];
  /** A display-only form in a local fixture preview. Never enables saving. */
  enableMenuModalPreview?: boolean;
}
