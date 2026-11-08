import type { MenuManagementItem } from '../types/menu-management.type';
import type {
  MenuAllergenOption,
  MenuDietaryLabelOption,
  MenuItemDraft,
  MenuItemWritePayload,
} from './menu-item-write.validation';
import { menuItemDraftToPayload } from './menu-item-write.validation';
import type { KmsMealCategoryData } from '@/types/kms-menu';

/** PATCH is intentionally partial: absent tag arrays preserve the R-07 database relationships. */
export type MenuItemEditPayload = Partial<MenuItemWritePayload>;

interface ResolvedTags {
  ids: string[];
  unresolved: string[];
}

function resolveTags<T extends { name: string }>(
  existing: readonly T[],
  options: readonly { id: string; name: string }[],
  getId: (tag: T) => string | undefined,
): ResolvedTags {
  const ids: string[] = [];
  const unresolved: string[] = [];
  for (const tag of existing) {
    const explicitId = getId(tag);
    // An explicit ID must match that exact record; never silently remap it by name.
    const candidates = explicitId
      ? options.filter((option) => option.id.toLowerCase() === explicitId.toLowerCase())
      : options.filter(
          (option) => option.name.trim().toLowerCase() === tag.name.trim().toLowerCase(),
        );
    if (
      candidates.length !== 1 ||
      ids.some((id) => id.toLowerCase() === candidates[0].id.toLowerCase())
    ) {
      unresolved.push(tag.name);
    } else {
      ids.push(candidates[0].id);
    }
  }
  return { ids, unresolved };
}

export function resolveEditAllergens(
  item: MenuManagementItem,
  options: readonly MenuAllergenOption[],
): ResolvedTags {
  return resolveTags(
    item.allergens ?? [],
    options.map((option) => ({ id: option.allergenId, name: option.name })),
    (tag) => tag.allergenId,
  );
}

export function resolveEditDietaryLabels(
  item: MenuManagementItem,
  options: readonly MenuDietaryLabelOption[],
): ResolvedTags {
  return resolveTags(
    item.dietaryLabels ?? [],
    options.map((option) => ({ id: option.dietaryLabelId, name: option.name })),
    (tag) => tag.dietaryLabelId,
  );
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const known = new Set(a.map((id) => id.toLowerCase()));
  return b.every((id) => known.has(id.toLowerCase()));
}

/**
 * Compare validated, normalized form values with the server item. Arrays are sent only
 * when modified; unknown existing associations can never be dropped by the update.
 */
export function buildMenuItemEditPayload(
  item: MenuManagementItem,
  draft: MenuItemDraft,
  categories: readonly KmsMealCategoryData[],
  allergens: readonly MenuAllergenOption[],
  dietaryLabels: readonly MenuDietaryLabelOption[],
): MenuItemEditPayload {
  const values = menuItemDraftToPayload(draft, categories, allergens, dietaryLabels);
  const patch: MenuItemEditPayload = {};

  if (values.categoryId !== item.categoryId) patch.categoryId = values.categoryId;
  if (values.name !== item.name.trim()) patch.name = values.name;
  if (values.description !== (item.description?.trim() || null))
    patch.description = values.description;
  if (values.price !== item.price) patch.price = values.price;
  if (values.preparationTime !== item.preparationTime)
    patch.preparationTime = values.preparationTime;
  if (values.portionLimit !== item.portionLimit) patch.portionLimit = values.portionLimit;
  if (values.stockStatus !== item.stockStatus) patch.stockStatus = values.stockStatus;
  if (values.imageUrl !== (item.imageUrl?.trim() || null)) patch.imageUrl = values.imageUrl;

  const originalAllergens = resolveEditAllergens(item, allergens);
  const originalDietary = resolveEditDietaryLabels(item, dietaryLabels);

  if (!sameIds(values.allergenIds, originalAllergens.ids)) {
    if (originalAllergens.unresolved.length) {
      throw new Error('Reload all existing allergen options before changing their selections.');
    }
    patch.allergenIds = values.allergenIds;
  }
  if (!sameIds(values.dietaryLabelIds, originalDietary.ids)) {
    if (originalDietary.unresolved.length) {
      throw new Error('Reload all existing dietary labels before changing their selections.');
    }
    patch.dietaryLabelIds = values.dietaryLabelIds;
  }

  if (!Object.keys(patch).length) throw new Error('No changes to save.');
  return patch;
}
