'use client';

import { Alert } from 'antd';

import { MenuManagementScreen } from '@/features/menu';
import {
  MENU_PREVIEW_CATEGORIES,
  MENU_PREVIEW_ITEMS,
} from '@/features/menu/data/menu-preview.data';

/** R-10 sample layout only; never exposes a manager write from a public route. */
export default function StockPreviewPage() {
  if (process.env.NODE_ENV === 'production') {
    return <p>Stock control preview is available only during development.</p>;
  }
  return (
    <section aria-label="R-10 stock controls preview">
      <Alert
        type="info"
        showIcon
        title="Development-only stock controls preview"
        description="Sample menu data. The quick status and removal actions are disabled until the secure Kitchen Manager API and reload callbacks are connected. No changes are persisted here."
      />
      <MenuManagementScreen
        categories={MENU_PREVIEW_CATEGORIES}
        items={MENU_PREVIEW_ITEMS}
        dataMode="fixtures"
      />
    </section>
  );
}
