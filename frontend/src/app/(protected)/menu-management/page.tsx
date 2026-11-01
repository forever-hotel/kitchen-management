import { requireKmsManagerSession } from '../../../lib/auth/kms-workspace-access';

export const dynamic = 'force-dynamic';

export default async function MenuManagementPage() {
  // Only KITCHEN_MANAGER may access this page.
  await requireKmsManagerSession();

  return (
    <section aria-labelledby="menu-management-heading">
      <h2 id="menu-management-heading">Menu Management</h2>

      <p>
        Menu items, categories, availability and stock management will be implemented in the Menu
        Management feature.
      </p>
    </section>
  );
}
