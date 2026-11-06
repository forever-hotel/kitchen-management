import { createOrderQueueFixtures } from '../fixtures/order-queue.fixtures';
import {
  isKmsQueueStatus,
  KMS_QUEUE_STATUSES,
  type KmsQueueOrder,
} from '../types/order-queue.types';

import {
  getQueueItemQuantityTotal,
  getQueueOrderAgeMinutes,
  groupQueueOrders,
} from './order-queue.utils';

const referenceTime = new Date('2026-11-01T10:00:00.000Z');

describe('DDP-236 Order Queue foundation', () => {
  const fixtures = createOrderQueueFixtures(referenceTime);

  it('defines exactly three operational columns', () => {
    expect(KMS_QUEUE_STATUSES).toEqual(['PLACED', 'IN_PREPARATION', 'READY']);
  });

  it('groups orders by preparation status', () => {
    const groups = groupQueueOrders(fixtures);

    expect(groups.PLACED).toHaveLength(2);
    expect(groups.IN_PREPARATION).toHaveLength(1);
    expect(groups.READY).toHaveLength(1);
  });

  it('excludes delivered and cancelled orders', () => {
    const groups = groupQueueOrders(fixtures);

    const visibleOrders = Object.values(groups).flat();

    expect(visibleOrders.every((order) => isKmsQueueStatus(order.status))).toBe(true);

    expect(visibleOrders).toHaveLength(4);
  });

  it('sorts orders in FIFO order regardless of input order', () => {
    const reversed = [...fixtures].reverse();

    const groups = groupQueueOrders(reversed);

    expect(groups.PLACED.map((order) => order.orderReference)).toEqual(['KMS-1001', 'KMS-1004']);
  });

  it('does not mutate the original order array', () => {
    const originalOrderIds = fixtures.map((order) => order.orderId);

    groupQueueOrders(fixtures);

    expect(fixtures.map((order) => order.orderId)).toEqual(originalOrderIds);
  });

  it('returns three empty columns when no orders exist', () => {
    expect(groupQueueOrders([])).toEqual({
      PLACED: [],
      IN_PREPARATION: [],
      READY: [],
    });
  });

  it('recognizes only active queue statuses', () => {
    expect(isKmsQueueStatus('PLACED')).toBe(true);
    expect(isKmsQueueStatus('IN_PREPARATION')).toBe(true);
    expect(isKmsQueueStatus('READY')).toBe(true);
    expect(isKmsQueueStatus('DELIVERED')).toBe(false);
    expect(isKmsQueueStatus('CANCELLED')).toBe(false);
    expect(isKmsQueueStatus('UNKNOWN')).toBe(false);
  });

  it('ignores an invalid runtime status safely', () => {
    // Simulates malformed data received at runtime.
    // UNKNOWN is intentionally not a valid KMS order status.
    const invalidOrder = {
      ...fixtures[0],
      status: 'UNKNOWN',
    } as unknown as KmsQueueOrder;

    const groups = groupQueueOrders([invalidOrder]);

    expect(groups.PLACED).toHaveLength(0);
    expect(groups.IN_PREPARATION).toHaveLength(0);
    expect(groups.READY).toHaveLength(0);
  });

  it('counts quantities rather than distinct items', () => {
    const placedOrder = fixtures.find((order) => order.orderReference === 'KMS-1001');

    expect(placedOrder).toBeDefined();

    expect(getQueueItemQuantityTotal(placedOrder!)).toBe(4);
  });

  it('calculates elapsed order age in minutes', () => {
    const placedOrder = fixtures.find((order) => order.orderReference === 'KMS-1001');

    expect(getQueueOrderAgeMinutes(placedOrder!.placedAt, referenceTime)).toBe(19);
  });

  it('does not show negative elapsed time', () => {
    expect(getQueueOrderAgeMinutes('2026-11-01T10:10:00.000Z', referenceTime)).toBe(0);
  });

  it('handles invalid timestamps', () => {
    expect(getQueueOrderAgeMinutes('invalid-timestamp', referenceTime)).toBeNull();
  });

  it('provides allergy and dietary fixture examples', () => {
    expect(fixtures.some((order) => Boolean(order.allergyNote))).toBe(true);

    expect(fixtures.some((order) => order.dietaryLabels.length > 0)).toBe(true);
  });

  it('generates deterministic fixture placement times', () => {
    const first = createOrderQueueFixtures(referenceTime);
    const second = createOrderQueueFixtures(referenceTime);

    expect(first).toEqual(second);
  });
});
