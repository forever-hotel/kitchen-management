import { OrderingWindowsScreen } from '@/features/ordering-windows';
import { MENU_PREVIEW_CATEGORIES } from '@/features/menu/data/menu-preview.data';

/** UI-only example; no window edits or privileged API requests are performed. */
export default function TimeWindowsPage() {
  if (process.env.NODE_ENV === 'production') {
    return (
      <section aria-labelledby="time-windows-heading">
        <h2 id="time-windows-heading">Ordering Time Windows</h2>
        <p>Authenticated ordering-window integration is not enabled on this route yet.</p>
      </section>
    );
  }

  return (
    <OrderingWindowsScreen windows={MENU_PREVIEW_CATEGORIES} categories={MENU_PREVIEW_CATEGORIES} />
  );
}
