'use server';

import { redirect } from 'next/navigation';
import { ApiError } from '@/lib/api/api-error';

import type { KmsMealCategoryData, KmsMenuStockStatus } from '@/types/kms-menu';
import { isKmsMenuStockStatus } from '@/types/kms-menu';

import type { MenuManagementItem } from '../types/menu-management.type';
import {
  normalizeCreateCategory,
  type CreateCategoryInput,
} from '../utils/create-category.validation';
import type { MenuItemEditPayload } from '../utils/menu-item-edit.validation';
import type { MenuItemWritePayload } from '../utils/menu-item-write.validation';
import { mapMenuCategories, mapMenuItems, mapOneMenuCategory } from '../utils/menu-api.mapping';
import { managerMenuRequest } from './menu-management.api';

const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;

function validId(id: string): string {
  if (!UUID.test(id)) throw new Error('A valid menu item ID is required.');
  return id;
}

export async function reloadMenuCategories(): Promise<readonly KmsMealCategoryData[]> {
  return mapMenuCategories(await managerMenuRequest('/categories'));
}

export async function reloadMenuItems(): Promise<readonly MenuManagementItem[]> {
  return mapMenuItems(await managerMenuRequest('/items'));
}

export async function createMenuCategory(input: CreateCategoryInput): Promise<KmsMealCategoryData> {
  return mapOneMenuCategory(
    await managerMenuRequest('/categories', {
      method: 'POST',
      body: normalizeCreateCategory(input),
    }),
  );
}

/** Expected menu-write failures cross the Server Action boundary as safe JSON. */
type MenuItemWriteResult = { ok: true } | { ok: false; status: number | null; message: string };

function expectedMenuWriteFailure(error: unknown): MenuItemWriteResult {
  if (!(error instanceof ApiError)) throw error;

  const status = error.status;
  let message: string;
  switch (status) {
    case 400:
      message = 'Menu details were rejected. Review the entered values.';
      break;
    case 401:
      message = 'Your session expired. Sign in and try again.';
      break;
    case 403:
      message = 'Only Kitchen Managers can save menu items.';
      break;
    case 404:
      message = 'A category or tag no longer exists. Reload the options.';
      break;
    case 409:
      message = 'An item with this name already exists in the selected category.';
      break;
    case 429:
      message = 'Too many requests. Please try again shortly.';
      break;
    default:
      message = 'The menu service could not save this item. Please try again.';
  }
  // Never forward arbitrary upstream error strings or stack traces to the browser.
  return { ok: false, status, message };
}

export async function createMenuItem(input: MenuItemWritePayload): Promise<MenuItemWriteResult> {
  try {
    await managerMenuRequest('/items', { method: 'POST', body: input });
    return { ok: true };
  } catch (error) {
    return expectedMenuWriteFailure(error);
  }
}

export async function updateMenuItem(
  id: string,
  patch: MenuItemEditPayload,
): Promise<MenuItemWriteResult> {
  try {
    await managerMenuRequest(`/items/${validId(id)}`, { method: 'PATCH', body: patch });
    return { ok: true };
  } catch (error) {
    return expectedMenuWriteFailure(error);
  }
}

export async function updateMenuStock(
  id: string,
  patch: { stockStatus: KmsMenuStockStatus },
): Promise<void> {
  if (!patch || !isKmsMenuStockStatus(patch.stockStatus)) {
    throw new Error('Invalid menu stock status.');
  }
  await managerMenuRequest(`/items/${validId(id)}`, {
    method: 'PATCH',
    body: { stockStatus: patch.stockStatus },
  });
}

/** Refresh actions are invoked through Next.js server action transport, not a browser JWT. */
export async function retryMenuPage(): Promise<void> {
  redirect('/menu-management');
}

export async function editOrderingWindow(categoryId: string): Promise<void> {
  // DDP-267: preserve the real selected category when opening Time Windows.
  redirect(`/time-windows?categoryId=${validId(categoryId)}`);
}
