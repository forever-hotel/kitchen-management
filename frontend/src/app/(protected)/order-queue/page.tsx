import { OrderQueueBoard } from '@/features/orders/components/order-queue-board';
import { createOrderQueueFixtures } from '@/features/orders/fixtures/order-queue.fixtures';
import { requireKmsWorkspaceSession } from '../../../lib/auth/kms-workspace-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Both KITCHEN_STAFF and KITCHEN_MANAGER can view the fixture queue. */
export default async function OrderQueuePage() {
  await requireKmsWorkspaceSession();

  const referenceTime = new Date();
  const orders = createOrderQueueFixtures(referenceTime);

  return (
    <OrderQueueBoard
      orders={orders}
      asOf={referenceTime.toISOString()}
      escalatedOrderReferences={['KMS-1001']}
    />
  );
}
