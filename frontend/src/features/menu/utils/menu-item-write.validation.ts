import type { KmsMealCategoryData, KmsMenuStockStatus } from '@/types/kms-menu';

/** Identifiers and names mirror the existing R-02 and R-07 API response fields. */
export interface MenuAllergenOption {
  allergenId: string;
  name: string;
}

export interface MenuDietaryLabelOption {
  dietaryLabelId: string;
  name: string;
}

/** UI fields remain strings so invalid numeric input is never silently coerced. */
export interface MenuItemDraft {
  categoryId: string;
  name: string;
  description: string;
  price: string;
  preparationTime: string;
  portionLimit: string;
  stockStatus: KmsMenuStockStatus;
  imageUrl: string;
  allergenIds: string[];
  dietaryLabelIds: string[];
}

/** Exact R-07 create/update JSON contract. Price is a raw integer, NOT assumed cents. */
export interface MenuItemWritePayload {
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  preparationTime: number;
  portionLimit: number;
  stockStatus: KmsMenuStockStatus;
  imageUrl: string | null;
  allergenIds: string[];
  dietaryLabelIds: string[];
}

const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const MAX_INT = 2147483647;
const STOCK_STATUSES: readonly string[] = [
  'AVAILABLE',
  'LOW_STOCK',
  'UNAVAILABLE',
  'TEMPORARILY_DISABLED',
];

export function normalizeMenuImageUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.length > 500) return null;
  try {
    const parsed = new URL(trimmed);
    if (
      (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password
    ) {
      return null;
    }
    return trimmed;
  } catch {
    return null;
  }
}

function positiveInteger(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const numberValue = Number(value.trim());
  return Number.isInteger(numberValue) && numberValue > 0 && numberValue <= MAX_INT
    ? numberValue
    : null;
}

function validTagIds(ids: readonly string[], choices: readonly string[]): boolean {
  return (
    ids.length <= 100 &&
    new Set(ids.map((id) => id.toLowerCase())).size === ids.length &&
    ids.every((id) => UUID.test(id) && choices.some((choice) => choice === id))
  );
}

/** First actionable field error; server validation remains authoritative. */
export function validateMenuItemDraft(
  draft: MenuItemDraft,
  categories: readonly KmsMealCategoryData[],
  allergens: readonly MenuAllergenOption[],
  dietaryLabels: readonly MenuDietaryLabelOption[],
): string | null {
  if (!UUID.test(draft.categoryId) || !categories.some((c) => c.categoryId === draft.categoryId)) {
    return 'Choose an existing meal category.';
  }
  if (!draft.name.trim() || [...draft.name.trim()].length > 255) {
    return 'Item name is required and must be 255 characters or fewer.';
  }
  if (draft.description.length > 2000) return 'Description must be 2000 characters or fewer.';
  if (positiveInteger(draft.price) === null)
    return 'Price must be a positive whole number (max 2,147,483,647).';
  if (positiveInteger(draft.preparationTime) === null)
    return 'Preparation minutes must be a positive whole number.';
  if (positiveInteger(draft.portionLimit) === null)
    return 'Per-guest portion limit must be a positive whole number.';
  if (!STOCK_STATUSES.includes(draft.stockStatus)) return 'Select a valid stock status.';
  if (draft.imageUrl.trim() && !normalizeMenuImageUrl(draft.imageUrl)) {
    return 'Image URL must be an absolute HTTP(S) link (max 500 characters), without credentials.';
  }
  if (
    !validTagIds(
      draft.allergenIds,
      allergens.map((a) => a.allergenId),
    )
  ) {
    return 'Choose valid, unique allergen tags from the available options.';
  }
  if (
    !validTagIds(
      draft.dietaryLabelIds,
      dietaryLabels.map((d) => d.dietaryLabelId),
    )
  ) {
    return 'Choose valid, unique dietary labels from the available options.';
  }
  return null;
}

export function menuItemDraftToPayload(
  draft: MenuItemDraft,
  categories: readonly KmsMealCategoryData[],
  allergens: readonly MenuAllergenOption[],
  dietaryLabels: readonly MenuDietaryLabelOption[],
): MenuItemWritePayload {
  const error = validateMenuItemDraft(draft, categories, allergens, dietaryLabels);
  if (error) throw new Error(error);
  return {
    categoryId: draft.categoryId,
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    price: Number(draft.price.trim()),
    preparationTime: Number(draft.preparationTime.trim()),
    portionLimit: Number(draft.portionLimit.trim()),
    stockStatus: draft.stockStatus,
    imageUrl: normalizeMenuImageUrl(draft.imageUrl),
    allergenIds: [...draft.allergenIds],
    dietaryLabelIds: [...draft.dietaryLabelIds],
  };
}
