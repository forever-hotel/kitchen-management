import { AddMenuItemPreviewPage } from '@/features/menu/components/add-menu-item-preview-page';

/** Never expose this demonstration of manager fields as an authenticated production route. */
export default function MenuItemPreviewRoute() {
  if (process.env.NODE_ENV === 'production') {
    return (
      <section>
        <h2>Menu Item Preview Unavailable</h2>
        <p>This development-only form is not available in production.</p>
      </section>
    );
  }
  return <AddMenuItemPreviewPage />;
}
