/**
 * KMS domain values verified against the existing
 * Kitchen Management backend enums.
 *
 * These are not the finalized FOSS integration DTOs.
 */

export const KMS_ORDER_STATUSES = [
  'PLACED',
  'IN_PREPARATION',
  'READY',
  'DELIVERED',
  'CANCELLED',
] as const;

export type KmsOrderStatus = (typeof KMS_ORDER_STATUSES)[number];

export const KMS_MEAL_PERIODS = ['BREAKFAST', 'LUNCH', 'DINNER', 'TEA_TIME'] as const;

export type KmsMealPeriod = (typeof KMS_MEAL_PERIODS)[number];

export function isKmsOrderStatus(value: unknown): value is KmsOrderStatus {
  return typeof value === 'string' && KMS_ORDER_STATUSES.some((status) => status === value);
}

export function isKmsMealPeriod(value: unknown): value is KmsMealPeriod {
  return typeof value === 'string' && KMS_MEAL_PERIODS.some((period) => period === value);
}
