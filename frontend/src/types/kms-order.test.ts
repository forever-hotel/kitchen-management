import {
  isKmsMealPeriod,
  isKmsOrderStatus,
  KMS_MEAL_PERIODS,
  KMS_ORDER_STATUSES,
} from './kms-order';

describe('KMS order domain contracts', () => {
  it('matches the five KMS backend order statuses', () => {
    expect(KMS_ORDER_STATUSES).toEqual([
      'PLACED',
      'IN_PREPARATION',
      'READY',
      'DELIVERED',
      'CANCELLED',
    ]);
  });

  it('accepts valid order statuses', () => {
    for (const status of KMS_ORDER_STATUSES) {
      expect(isKmsOrderStatus(status)).toBe(true);
    }
  });

  it('rejects unknown order statuses', () => {
    expect(isKmsOrderStatus('PENDING')).toBe(false);
    expect(isKmsOrderStatus(null)).toBe(false);
  });

  it('matches the four KMS backend meal periods', () => {
    expect(KMS_MEAL_PERIODS).toEqual(['BREAKFAST', 'LUNCH', 'DINNER', 'TEA_TIME']);
  });

  it('accepts valid KMS meal periods', () => {
    for (const period of KMS_MEAL_PERIODS) {
      expect(isKmsMealPeriod(period)).toBe(true);
    }
  });

  it('does not silently treat ALL_DAY as a KMS order period', () => {
    expect(isKmsMealPeriod('ALL_DAY')).toBe(false);
    expect(isKmsMealPeriod(undefined)).toBe(false);
  });
});
