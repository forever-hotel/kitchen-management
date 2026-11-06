
import { OrderingWindowsScreen } from '@/features/ordering-windows';
import { MENU_PREVIEW_CATEGORIES } from '@/features/menu/data/menu-preview.data';

import { requireKmsManagerSession } from '../../../lib/auth/kms-workspace-access';

export const dynamic = 'force-dynamic';

/**
 * Only authenticated Kitchen Managers may access Time Windows.
 * Fixture data is available for local UI testing only.
 */
export default async function TimeWindowsPage() {
  await requireKmsManagerSession();

  if (process.env.NODE_ENV === 'production') {
    return (
      <section aria-labelledby="time-windows-heading">
        <h2 id="time-windows-heading">Ordering Time Windows</h2>
        <p>
          Authenticated ordering-window integration is not
          enabled on this route yet.
        </p>
      </section>
    );
  }

  return (
    <OrderingWindowsScreen
      windows={MENU_PREVIEW_CATEGORIES}
      categories={MENU_PREVIEW_CATEGORIES}
    />
  );
}
