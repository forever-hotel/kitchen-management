import { notFound, redirect } from 'next/navigation';

import { MenuManagementScreen } from '@/features/menu';
import {
  createMenuCategory,
  createMenuItem,
  editOrderingWindow,
  reloadMenuCategories,
  reloadMenuItems,
  retryMenuPage,
  updateMenuItem,
  updateMenuStock,
} from '@/features/menu/server/menu-management.actions';
import { getMenuManagementSnapshot } from '@/features/menu/server/menu-management.api';
import { ApiError } from '@/lib/api/api-error';
import { requireKmsManagerSession } from '@/lib/auth/kms-workspace-access';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Manager-only live route; no fixture or preview fallback is used in production. */
export default async function MenuManagementPage() {
  await requireKmsManagerSession();

  let snapshot: Awaited<ReturnType<typeof getMenuManagementSnapshot>> | null = null;

  try {
    snapshot = await getMenuManagementSnapshot();
  } catch (error) {
    // Keep the Gateway session response authoritative; never fall back to fixtures.
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    if (error instanceof ApiError && error.status === 403) notFound();
  }

  if (snapshot === null) {
    return (
      <MenuManagementScreen
        dataMode="api"
        categories={[]}
        items={[]}
        loadState="error"
        errorMessage="The live KMS menu is temporarily unavailable. Check the API Gateway and retry."
        onRetry={retryMenuPage}
      />
    );
  }

  const { categories, items, lookups } = snapshot;
  return (
    <MenuManagementScreen
      dataMode="api"
      categories={categories}
      items={items}
      allergenOptions={lookups.allergens}
      dietaryLabelOptions={lookups.dietaryLabels}
      onRetry={retryMenuPage}
      onEditWindow={editOrderingWindow}
      onCreateCategory={createMenuCategory}
      onRefreshCategories={reloadMenuCategories}
      onCreateMenuItem={createMenuItem}
      onUpdateMenuItem={updateMenuItem}
      onReloadMenuItems={reloadMenuItems}
      onChangeStockStatus={updateMenuStock}
    />
  );
}
