'use client';

import { Alert, Button, Typography } from 'antd';
import { useState } from 'react';

import type { MenuManagementItem } from '../types/menu-management.type';
import { AddMenuItemModal } from './add-menu-item-modal';

/** Explicit sample data. This screen never attempts a server update. */
const categories = [
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
];
const dietaryLabels = [
  { dietaryLabelId: 'b1111111-1111-4111-8111-111111111111', name: 'Vegetarian' },
];
const sampleItem: MenuManagementItem = {
  menuItemId: '92222222-2222-4222-8222-222222222221',
  categoryId: categories[0].categoryId,
  name: 'Egg Fried Rice',
  description: 'Freshly prepared rice with vegetables and a fried egg.',
  price: 1650,
  preparationTime: 20,
  portionLimit: 4,
  stockStatus: 'LOW_STOCK',
  imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b',
  allergens: [{ allergenId: allergens[0].allergenId, name: 'Eggs' }],
  dietaryLabels: [{ dietaryLabelId: dietaryLabels[0].dietaryLabelId, name: 'Vegetarian' }],
};

export function EditMenuItemPreviewPage() {
  const [open, setOpen] = useState(false);
  return (
    <section aria-labelledby="kms-r09-preview-heading">
      <Typography.Title level={2} id="kms-r09-preview-heading">
        R-09 Edit Menu Item Preview
      </Typography.Title>
      <Alert
        type="info"
        showIcon
        title="Development preview only"
        description="A sample menu item will be prefilled in edit mode. Save is intentionally disabled until authenticated manager integration is connected. Changes are not stored."
        style={{ marginBottom: 20 }}
      />
      <Button type="primary" onClick={() => setOpen(true)}>
        Open Edit Menu Item
      </Button>
      {open && (
        <AddMenuItemModal
          open
          item={sampleItem}
          categories={categories}
          allergens={allergens}
          dietaryLabels={dietaryLabels}
          onCancel={() => setOpen(false)}
          onSaved={() => setOpen(false)}
        />
      )}
    </section>
  );
}
