import { requireKmsManagerSession } from '../../../lib/auth/kms-workspace-access';

export const dynamic = 'force-dynamic';

export default async function TimeWindowsPage() {
  // Only KITCHEN_MANAGER may access this page.
  await requireKmsManagerSession();

  return (
    <section aria-labelledby="time-windows-heading">
      <h2 id="time-windows-heading">Ordering Time Windows</h2>

      <p>Meal periods, ordering start times and cutoff times will be configured here.</p>
    </section>
  );
}
