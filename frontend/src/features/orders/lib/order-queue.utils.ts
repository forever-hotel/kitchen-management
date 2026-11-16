import {
  KMS_QUEUE_STATUSES,
  isKmsQueueStatus,
  type KmsQueueOrder,
  type KmsQueueStatus,
} from '../types/order-queue.types';

export type KmsOrdersByStatus = Readonly<Record<KmsQueueStatus, readonly KmsQueueOrder[]>>;

function getPlacementTimestamp(placedAt: string): number {
  const timestamp = Date.parse(placedAt);

  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

/**
 * Returns active kitchen orders grouped into three
 * Kanban columns, each sorted oldest first (FIFO).
 *
 * DELIVERED and CANCELLED never enter this board.
 * The input array is not mutated.
 */
export function groupQueueOrders(orders: readonly KmsQueueOrder[]): KmsOrdersByStatus {
  const groups: Record<KmsQueueStatus, KmsQueueOrder[]> = {
    PLACED: [],
    IN_PREPARATION: [],
    READY: [],
  };

  for (const order of orders) {
    if (!isKmsQueueStatus(order.status)) {
      continue;
    }

    groups[order.status].push(order);
  }

  for (const status of KMS_QUEUE_STATUSES) {
    groups[status].sort((a, b) => {
      const timeDifference = getPlacementTimestamp(a.placedAt) - getPlacementTimestamp(b.placedAt);

      if (!Number.isNaN(timeDifference) && timeDifference !== 0) {
        return timeDifference;
      }

      return a.orderId.localeCompare(b.orderId);
    });
  }

  return groups;
}

/**
 * Number of ordered portions, not distinct menu items.
 */
export function getQueueItemQuantityTotal(order: KmsQueueOrder): number {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

/**
 * Elapsed whole minutes since placement.
 * Future timestamps are clamped to zero.
 * Invalid timestamps return null.
 */
export function getQueueOrderAgeMinutes(placedAt: string, now: Date = new Date()): number | null {
  const placedTimestamp = Date.parse(placedAt);
  const nowTimestamp = now.getTime();

  if (!Number.isFinite(placedTimestamp) || !Number.isFinite(nowTimestamp)) {
    return null;
  }

  return Math.max(0, Math.floor((nowTimestamp - placedTimestamp) / 60_000));
}
