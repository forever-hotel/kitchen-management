import { requireKmsWorkspaceSession } from '../../../lib/auth/kms-workspace-access';

export const dynamic = 'force-dynamic';

export default async function OrderQueuePage() {
  // Both Kitchen Staff and Kitchen Manager are allowed.
  await requireKmsWorkspaceSession();

  return (
    <section aria-labelledby="order-queue-heading">
      <h2 id="order-queue-heading">Order Queue</h2>

      <p>
        Kitchen orders will appear here in three columns: New Orders, In Preparation and Ready for
        Delivery.
      </p>

      <p>The interactive Order Queue board will be implemented under DDP-236.</p>
    </section>
  );
}
