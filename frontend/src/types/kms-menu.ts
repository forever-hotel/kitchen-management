/**
 * Shared KMS menu data types.
 *
 * Based on the existing KMS backend entities.
 * These do not yet define finalized REST response DTOs.
 */

export const KMS_MENU_STOCK_STATUSES = [
  'AVAILABLE',
  'LOW_STOCK',
  'UNAVAILABLE',
  'TEMPORARILY_DISABLED',
] as const;

export type KmsMenuStockStatus = (typeof KMS_MENU_STOCK_STATUSES)[number];

export function isKmsMenuStockStatus(value: unknown): value is KmsMenuStockStatus {
  return typeof value === 'string' && KMS_MENU_STOCK_STATUSES.some((status) => status === value);
}

/**
 * KMS meal category data.
 *
 * Ordering windows currently belong to meal categories
 * in the KMS persistence model.
 */
export interface KmsMealCategoryData {
  categoryId: string;
  name: string;
  orderStartTime: string;
  orderCutoffTime: string;
}

/**
 * Existing KMS menu item data fields.
 *
 * Price representation remains an integer in the
 * backend entity. Currency and API units require
 * agreement before external integration.
 */
export interface KmsMenuItemData {
  menuItemId: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  preparationTime: number;
  portionLimit: number;
  stockStatus: KmsMenuStockStatus;
  imageUrl: string | null;
}

/**
 * Ordering window fields from the meal category.
 *
 * The final API contract may use a different DTO.
 */
export type KmsOrderingWindowData = Pick<
  KmsMealCategoryData,
  'categoryId' | 'orderStartTime' | 'orderCutoffTime'
>;
