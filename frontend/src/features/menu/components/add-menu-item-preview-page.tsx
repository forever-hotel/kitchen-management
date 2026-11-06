'use client';

import { Alert, Button, Typography } from 'antd';
import { useState } from 'react';

import type { KmsMealCategoryData } from '@/types/kms-menu';
import { AddMenuItemModal } from './add-menu-item-modal';

/** Development-only sample data, independent of R-06/R-07 and the pending route-preview PR. */
const categories: readonly KmsMealCategoryData[] = [
  {
    categoryId: '22222222-2222-4222-8222-222222222222',
    name: 'Lunch',
    orderStartTime: '11:30:00',
    orderCutoffTime: '14:30:00',
  },
  {
    categoryId: '44444444-4444-4444-8444-444444444444',
    name: 'Dinner',
    orderStartTime: '18:00:00',
    orderCutoffTime: '22:00:00',
  },
];
const allergens = [
  { allergenId: 'a1111111-1111-4111-8111-111111111111', name: 'Eggs' },
  { allergenId: 'a2222222-2222-4222-8222-222222222222', name: 'Milk' },
  { allergenId: 'a3333333-3333-4333-8333-333333333333', name: 'Wheat' },
];
const dietaryLabels = [
  { dietaryLabelId: 'b1111111-1111-4111-8111-111111111111', name: 'Vegetarian' },
  { dietaryLabelId: 'b2222222-2222-4222-8222-222222222222', name: 'Gluten-free' },
];

export function AddMenuItemPreviewPage() {
  const [open, setOpen] = useState(false);
  return (
    <section aria-labelledby="kms-r08-preview-title">
      <Typography.Title level={2} id="kms-r08-preview-title">
        R-08 Add Menu Item Preview
      </Typography.Title>
      <Alert
        type="info"
        showIcon
        title="Development preview only"
        description="The modal uses example categories and tag options. Saving is disabled until an authenticated manager API integration is connected."
        style={{ marginBottom: 20 }}
      />
      <Button type="primary" onClick={() => setOpen(true)}>
        Open Add Menu Item
      </Button>
      {open && (
        <AddMenuItemModal
          open
          categories={categories}
          allergens={allergens}
          dietaryLabels={dietaryLabels}
          initialCategoryId={categories[0].categoryId}
          onCancel={() => setOpen(false)}
          onSaved={() => setOpen(false)}
        />
      )}
    </section>
  );
}
