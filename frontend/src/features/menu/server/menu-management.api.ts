import 'server-only';

import { redirect } from 'next/navigation';

import { apiRequest } from '@/lib/api/api-client';
import { getKmsSessionToken } from '@/lib/auth/kms-session-store';
import { requireKmsManagerSession } from '@/lib/auth/kms-workspace-access';
import type { KmsMealCategoryData } from '@/types/kms-menu';

import type { MenuManagementItem } from '../types/menu-management.type';
import {
  mapMenuCategories,
  mapMenuItems,
  mapMenuLookupOptions,
  type MenuLookupOptions,
} from '../utils/menu-api.mapping';

const MENU_PATH = '/kms/api/v1/menu';

/** Reads an encrypted HttpOnly session server-side. JWT is never returned to the browser. */
async function managerHeaders(): Promise<Headers> {
  await requireKmsManagerSession();
  const stored = await getKmsSessionToken();
  if (!stored) redirect('/login');
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${stored.accessToken}`);
  return headers;
}

export async function managerMenuRequest(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown } = {},
): Promise<unknown> {
  if (!/^\/(categories|items|lookups)(\/[a-zA-Z0-9_-]+)*$/.test(path)) {
    throw new Error('Invalid KMS menu operation.');
  }
  const headers = await managerHeaders();
  return apiRequest<unknown>(MENU_PATH + path, {
    method: options.method ?? 'GET',
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
}

/** Fetch three trusted datasets using one validated session and concurrent GET requests. */
export async function getMenuManagementSnapshot(): Promise<{
  categories: KmsMealCategoryData[];
  items: MenuManagementItem[];
  lookups: MenuLookupOptions;
}> {
  const headers = await managerHeaders();
  const [categories, items, lookups] = await Promise.all([
    apiRequest<unknown>(`${MENU_PATH}/categories`, { headers }),
    apiRequest<unknown>(`${MENU_PATH}/items`, { headers }),
    apiRequest<unknown>(`${MENU_PATH}/lookups/tags`, { headers }),
  ]);
  return {
    categories: mapMenuCategories(categories),
    items: mapMenuItems(items),
    lookups: mapMenuLookupOptions(lookups),
  };
}
