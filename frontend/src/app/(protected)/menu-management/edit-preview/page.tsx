import { EditMenuItemPreviewPage } from '@/features/menu/components/edit-menu-item-preview-page';

/** Production never exposes the unauthenticated local sample editor. */
export default function EditMenuItemPreviewRoute() {
  if (process.env.NODE_ENV === 'production') {
    return (
      <section>
        <h2>Edit Menu Item Preview Unavailable</h2>
        <p>This development-only form is not available in production.</p>
      </section>
    );
  }
  return <EditMenuItemPreviewPage />;
}
