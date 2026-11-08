import { MenuManagementScreen } from '@/features/menu';
import {
  MENU_PREVIEW_CATEGORIES,
  MENU_PREVIEW_ITEMS,
} from '@/features/menu/data/menu-preview.data';

import { requireKmsManagerSession } from '../../../lib/auth/kms-workspace-access';

export const dynamic = 'force-dynamic';

/** Sample form choices are local-only; no writes or real hotel records. */
const previewAllergens = [
  { allergenId: 'a1111111-1111-4111-8111-111111111111', name: 'Eggs' },
  { allergenId: 'a2222222-2222-4222-8222-222222222222', name: 'Milk' },
  { allergenId: 'a3333333-3333-4333-8333-333333333333', name: 'Wheat' },
  { allergenId: 'a4444444-4444-4444-8444-444444444444', name: 'Soy' },
  { allergenId: 'a5555555-5555-4555-8555-555555555555', name: 'Fish' },
  { allergenId: 'a6666666-6666-4666-8666-666666666666', name: 'Shellfish' },
];
const previewDietaryLabels = [
  { dietaryLabelId: 'b1111111-1111-4111-8111-111111111111', name: 'Vegetarian' },
  { dietaryLabelId: 'b2222222-2222-4222-8222-222222222222', name: 'Vegan' },
  { dietaryLabelId: 'b3333333-3333-4333-8333-333333333333', name: 'Gluten-free' },
];

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
      enableMenuModalPreview
      allergenOptions={previewAllergens}
      dietaryLabelOptions={previewDietaryLabels}
    />
  );
}
