import type { KmsMealPeriod, KmsOrderStatus } from '../../../types/kms-order';

export const KMS_QUEUE_STATUSES = [
  'PLACED',
  'IN_PREPARATION',
  'READY',
] as const satisfies readonly KmsOrderStatus[];

export type KmsQueueStatus = (typeof KMS_QUEUE_STATUSES)[number];

export interface KmsQueueOrderItem {
  orderItemId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  specialNote: string | null;
}

/**
 * Presentation model for the kitchen Order Queue.
 *
 * Dates are ISO-8601 strings at the frontend boundary.
 * The final live API adapter will map backend DTOs
 * into this representation.
 */
export interface KmsQueueOrder {
  orderId: string;
  bookingId: string;
  roomNumber: string;
  mealPeriod: KmsMealPeriod;
  status: KmsOrderStatus;
  placedAt: string;
  estimatedDeliveryTime: string | null;
  allergyNote: string | null;
  items: readonly KmsQueueOrderItem[];

  /**
   * UI-only presentation values.
   * These are not assumed to be database columns.
   */
  orderReference: string;
  estimatedPreparationMinutes: number | null;
  dietaryLabels: readonly string[];
}

/**
 * The real API implementation can replace the
 * fixture source without changing board components.
 */
export interface KmsOrderQueueDataSource {
  loadOrders(): Promise<readonly KmsQueueOrder[]>;
}

export function isKmsQueueStatus(value: unknown): value is KmsQueueStatus {
  return value === 'PLACED' || value === 'IN_PREPARATION' || value === 'READY';
}
