import { isKmsMenuStockStatus, KMS_MENU_STOCK_STATUSES } from './kms-menu';

describe('KMS menu domain contracts', () => {
  it('matches the existing KMS stock status values', () => {
    expect(KMS_MENU_STOCK_STATUSES).toEqual([
      'AVAILABLE',
      'LOW_STOCK',
      'UNAVAILABLE',
      'TEMPORARILY_DISABLED',
    ]);
  });

  it('accepts all defined stock statuses', () => {
    for (const status of KMS_MENU_STOCK_STATUSES) {
      expect(isKmsMenuStockStatus(status)).toBe(true);
    }
  });

  it('rejects invalid or missing stock statuses', () => {
    expect(isKmsMenuStockStatus('OUT_OF_STOCK')).toBe(false);
    expect(isKmsMenuStockStatus('DISABLED')).toBe(false);
    expect(isKmsMenuStockStatus(null)).toBe(false);
    expect(isKmsMenuStockStatus(undefined)).toBe(false);
    expect(isKmsMenuStockStatus(123)).toBe(false);
  });
});
