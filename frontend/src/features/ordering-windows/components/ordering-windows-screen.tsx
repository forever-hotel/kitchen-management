'use client';

import { Alert, Typography } from 'antd';

import type { KmsOrderingWindowData } from '@/types/kms-menu';

interface OrderingWindowsScreenProps {
  windows: readonly KmsOrderingWindowData[];
}

/** R-01 presentational entry point; saving and availability logic come later. */
export function OrderingWindowsScreen({ windows }: OrderingWindowsScreenProps) {
  return (
    <section aria-labelledby="time-windows-heading">
      <Typography.Title level={2} id="time-windows-heading">
        Ordering Time Windows
      </Typography.Title>
      <Typography.Paragraph>
        Meal-category ordering hours will be configured in a later issue.
      </Typography.Paragraph>
      <Alert
        type="info"
        title="Feature scaffold"
        description="No live ordering windows have been fetched or modified."
      />
      <Typography.Paragraph>Ordering windows: {windows.length}.</Typography.Paragraph>
    </section>
  );
}
