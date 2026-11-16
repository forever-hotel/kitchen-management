import { getKmsNavigationItems } from './kms-navigation';

describe('KMS role-based navigation', () => {
  it('TC-KMS-SF-002: manager can see all three navigation items', () => {
    const items = getKmsNavigationItems('KITCHEN_MANAGER');

    expect(items.map((item) => item.label)).toEqual([
      'Order Queue',
      'Menu Management',
      'Time Windows',
    ]);
  });

  it('TC-KMS-SF-003: kitchen staff can only see Order Queue', () => {
    const items = getKmsNavigationItems('KITCHEN_STAFF');

    expect(items).toHaveLength(1);
    expect(items[0].href).toBe('/order-queue');
    expect(items[0].managerOnly).toBe(false);
  });

  it('unauthenticated users cannot see navigation items', () => {
    expect(getKmsNavigationItems(null)).toEqual([]);
    expect(getKmsNavigationItems(undefined)).toEqual([]);
  });

  it('navigation links point to the approved routes', () => {
    const items = getKmsNavigationItems('KITCHEN_MANAGER');

    expect(items.map((item) => item.href)).toEqual([
      '/order-queue',
      '/menu-management',
      '/time-windows',
    ]);
  });
});
