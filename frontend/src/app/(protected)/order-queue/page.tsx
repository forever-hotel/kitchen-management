import { OrderQueueBoard } from '@/features/orders/components/order-queue-board';
import { createOrderQueueFixtures } from '@/features/orders/fixtures/order-queue.fixtures';

/**
 * Render the fixture timestamps at request time.
 * Replace this fixture adapter with the real KMS API
 * after the order backend is implemented.
 */
export const dynamic = 'force-dynamic';

export default function OrderQueuePage() {
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
