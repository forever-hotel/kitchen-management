import { MenuManagementScreen } from '@/features/menu';
import {
  MENU_PREVIEW_CATEGORIES,
  MENU_PREVIEW_ITEMS,
} from '@/features/menu/data/menu-preview.data';

/**
 * UI previews run only with Next.js in development or test mode.
 * Production must never render unauthenticated fixture data as a live manager view.
 */
export default function MenuManagementPage() {
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
