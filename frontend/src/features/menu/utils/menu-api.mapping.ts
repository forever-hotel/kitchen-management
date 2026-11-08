import { isKmsMenuStockStatus, type KmsMealCategoryData } from '@/types/kms-menu';

import type { MenuManagementItem } from '../types/menu-management.type';
import type { MenuAllergenOption, MenuDietaryLabelOption } from './menu-item-write.validation';

/** Reject malformed upstream data instead of presenting it as trusted hotel records. */
function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('KMS returned an invalid menu response.');
  }
  return value as Record<string, unknown>;
}

function nonempty(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`KMS returned an invalid ${field}.`);
  }
  return value;
}

function number(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`KMS returned an invalid ${field}.`);
  }
  return value;
}

function list(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`KMS returned an invalid ${field} list.`);
  return value;
}

function optionalText(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new Error(`KMS returned an invalid ${field}.`);
  return value;
}

export function mapMenuCategories(input: unknown): KmsMealCategoryData[] {
  return list(input, 'category').map((entry) => {
    const data = object(entry);
    return {
      categoryId: nonempty(data.categoryId, 'category ID'),
      name: nonempty(data.name, 'category name'),
      orderStartTime: nonempty(data.orderStartTime, 'order start time'),
      orderCutoffTime: nonempty(data.orderCutoffTime, 'order cutoff time'),
    };
  });
}

export function mapMenuItems(input: unknown): MenuManagementItem[] {
  return list(input, 'menu item').map((entry) => {
    const data = object(entry);
    if (!isKmsMenuStockStatus(data.stockStatus)) {
      throw new Error('KMS returned an invalid stock status.');
    }
    return {
      menuItemId: nonempty(data.menuItemId, 'menu item ID'),
      categoryId: nonempty(data.categoryId, 'menu category ID'),
      name: nonempty(data.name, 'menu item name'),
      description: optionalText(data.description, 'description'),
      imageUrl: optionalText(data.imageUrl, 'image URL'),
      price: number(data.price, 'price'),
      preparationTime: number(data.preparationTime, 'preparation time'),
      portionLimit: number(data.portionLimit, 'portion limit'),
      stockStatus: data.stockStatus,
      allergens: list(data.allergens, 'allergen').map((tag) => {
        const value = object(tag);
        return {
          allergenId: nonempty(value.allergenId, 'allergen ID'),
          name: nonempty(value.name, 'allergen name'),
        };
      }),
      dietaryLabels: list(data.dietaryLabels, 'dietary label').map((tag) => {
        const value = object(tag);
        return {
          dietaryLabelId: nonempty(value.dietaryLabelId, 'dietary label ID'),
          name: nonempty(value.name, 'dietary label name'),
        };
      }),
    };
  });
}

export interface MenuLookupOptions {
  allergens: MenuAllergenOption[];
  dietaryLabels: MenuDietaryLabelOption[];
}

export function mapMenuLookupOptions(input: unknown): MenuLookupOptions {
  const data = object(input);
  return {
    allergens: list(data.allergens, 'allergen option').map((entry) => {
      const value = object(entry);
      return {
        allergenId: nonempty(value.allergenId, 'allergen ID'),
        name: nonempty(value.name, 'allergen name'),
      };
    }),
    dietaryLabels: list(data.dietaryLabels, 'dietary option').map((entry) => {
      const value = object(entry);
      return {
        dietaryLabelId: nonempty(value.dietaryLabelId, 'dietary ID'),
        name: nonempty(value.name, 'dietary name'),
      };
    }),
  };
}

export function mapOneMenuCategory(input: unknown): KmsMealCategoryData {
  return mapMenuCategories([input])[0];
}
