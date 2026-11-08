'use server';

import { redirect } from 'next/navigation';

import { managerMenuRequest } from '../../menu/server/menu-management.api';
import { mapMenuCategories } from '@/features/menu/utils/menu-api.mapping';
import type { KmsMealCategoryData } from '@/types/kms-menu';

import { normalizeTime, type OrderingWindowPatch } from '../utils/ordering-window.util';

const CATEGORY_ID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

/** DDP-267: categories are the authoritative source of ordering windows. */
export async function reloadOrderingWindows(): Promise<KmsMealCategoryData[]> {
  return mapMenuCategories(await managerMenuRequest('/categories'));
}

/** Persist only the approved window fields; the backend checks the effective time range. */
export async function updateOrderingWindow(
  categoryId: string,
  patch: OrderingWindowPatch,
): Promise<void> {
  if (typeof categoryId !== 'string' || !CATEGORY_ID.test(categoryId)) {
    throw new Error('A valid meal category ID is required.');
  }
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new Error('Invalid ordering-window changes.');
  }
  const entries = Object.entries(patch);
  if (entries.length === 0) throw new Error('No ordering-window changes to save.');

  const normalized: OrderingWindowPatch = {};
  for (const [field, value] of entries) {
    if (field !== 'orderStartTime' && field !== 'orderCutoffTime') {
      throw new Error('Unsupported ordering-window field.');
    }
    const time = typeof value === 'string' ? normalizeTime(value) : null;
    if (!time) throw new Error('Enter valid ordering times (HH:mm or HH:mm:ss).');
    normalized[field] = time;
  }

  await managerMenuRequest(`/categories/${categoryId}/window`, {
    method: 'PATCH',
    body: normalized,
  });
}

export async function retryOrderingWindowsPage(): Promise<void> {
  redirect('/time-windows');
}
