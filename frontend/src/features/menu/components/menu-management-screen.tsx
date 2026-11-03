'use client';

import { Alert, Typography } from 'antd';

import type { KmsMealCategoryData, KmsMenuItemData } from '@/types/kms-menu';

interface MenuManagementScreenProps {
  categories: readonly KmsMealCategoryData[];
  items: readonly KmsMenuItemData[];
}

/** R-01 presentational entry point; real API data will be supplied by a later issue. */
export function MenuManagementScreen({ categories, items }: MenuManagementScreenProps) {
  return (
    <section aria-labelledby="menu-management-heading">
      <Typography.Title level={2} id="menu-management-heading">
        Menu Management
      </Typography.Title>
      <Typography.Paragraph>
        Manager menu administration will be added in subsequent issues.
      </Typography.Paragraph>
      <Alert
        type="info"
        title="Feature scaffold"
        description="No live menu data has been fetched or modified."
      />
      <Typography.Paragraph>
        Categories: {categories.length}; menu items: {items.length}.
      </Typography.Paragraph>
    </section>
  );
}
