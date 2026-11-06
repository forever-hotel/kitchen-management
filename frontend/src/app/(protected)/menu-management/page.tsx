import { MenuManagementScreen } from '@/features/menu';
import {
  MENU_PREVIEW_CATEGORIES,
  MENU_PREVIEW_ITEMS,
} from '@/features/menu/data/menu-preview.data';

import { requireKmsManagerSession } from '../../../lib/auth/kms-workspace-access';

export const dynamic = 'force-dynamic';

/**
 * Only authenticated Kitchen Managers may access Menu Management.
 * Fixture data is available for local UI testing only.
 */
export default async function MenuManagementPage() {
  await requireKmsManagerSession();

  if (process.env.NODE_ENV === 'production') {
    return (
      <section aria-labelledby="menu-management-heading">
        <h2 id="menu-management-heading">Menu Management</h2>
        <p>Authenticated menu data integration is not enabled on this route yet.</p>
      </section>
    );
  }

  return (
    <MenuManagementScreen
      categories={MENU_PREVIEW_CATEGORIES}
      items={MENU_PREVIEW_ITEMS}
      dataMode="fixtures"
    />
  );
}
