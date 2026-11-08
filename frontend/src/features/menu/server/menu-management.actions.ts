'use server';

import { redirect } from 'next/navigation';

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

export async function createMenuItem(input: MenuItemWritePayload): Promise<void> {
  await managerMenuRequest('/items', { method: 'POST', body: input });
}

export async function updateMenuItem(id: string, patch: MenuItemEditPayload): Promise<void> {
  await managerMenuRequest(`/items/${validId(id)}`, { method: 'PATCH', body: patch });
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
