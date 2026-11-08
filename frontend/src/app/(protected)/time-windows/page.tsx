import { notFound, redirect } from 'next/navigation';

import { OrderingWindowsScreen } from '@/features/ordering-windows';
import {
  reloadOrderingWindows,
  retryOrderingWindowsPage,
  updateOrderingWindow,
  updateOrderingEnabled,
} from '@/features/ordering-windows/server/ordering-windows.actions';
import { ApiError } from '@/lib/api/api-error';
import { requireKmsManagerSession } from '@/lib/auth/kms-workspace-access';
import type { KmsMealCategoryData } from '@/types/kms-menu';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CATEGORY_ID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

type TimeWindowsSearchParams = { categoryId?: string | string[] };

/** DDP-267: manager-only live category and ordering-window route, not fixture data. */
export default async function TimeWindowsPage({
  searchParams,
}: {
  searchParams?: Promise<TimeWindowsSearchParams>;
} = {}) {
  await requireKmsManagerSession();

  const params = (await searchParams) ?? {};
  const selectedCategoryId =
    typeof params.categoryId === 'string' && CATEGORY_ID.test(params.categoryId)
      ? params.categoryId
      : undefined;

  let categories: KmsMealCategoryData[] | null = null;
  try {
    categories = [...(await reloadOrderingWindows())];
  } catch (error) {
    // Keep login and manager authorization failures distinct from API outages.
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    if (error instanceof ApiError && error.status === 403) notFound();
  }

  if (categories === null) {
    return (
      <OrderingWindowsScreen
        windows={[]}
        categories={[]}
        dataMode="api"
        loadError="The saved ordering windows are temporarily unavailable. Check the KMS connection and retry."
        onRetry={retryOrderingWindowsPage}
      />
    );
  }

  return (
    <OrderingWindowsScreen
      windows={categories}
      categories={categories}
      selectedCategoryId={selectedCategoryId}
      dataMode="api"
      onUpdateWindow={updateOrderingWindow}
      onUpdateAvailability={updateOrderingEnabled}
      availabilityControlsEnabled={process.env.KMS_WINDOW_AVAILABILITY_UI_ENABLED === 'true'}
      onReloadWindows={reloadOrderingWindows}
    />
  );
}
