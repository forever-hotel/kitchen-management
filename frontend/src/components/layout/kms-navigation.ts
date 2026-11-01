import type { KmsRole } from '@/types/gateway-auth';

export type { KmsRole } from '@/types/gateway-auth';

export interface KmsNavigationItem {
  key: string;
  label: string;
  href: string;
  managerOnly: boolean;
}

/**
 * Shared KMS navigation configuration.
 *
 * Feature implementations remain owned by their respective modules.
 */
const navigationItems: readonly KmsNavigationItem[] = [
  {
    key: 'order-queue',
    label: 'Order Queue',
    href: '/order-queue',
    managerOnly: false,
  },
  {
    key: 'menu-management',
    label: 'Menu Management',
    href: '/menu-management',
    managerOnly: true,
  },
  {
    key: 'time-windows',
    label: 'Time Windows',
    href: '/time-windows',
    managerOnly: true,
  },
];

/**
 * Returns navigation items permitted for the given role.
 *
 * An unknown or unauthenticated user receives no navigation items.
 * Actual route and API authorization is enforced separately.
 */
export function getKmsNavigationItems(role: KmsRole | null | undefined): KmsNavigationItem[] {
  if (!role) {
    return [];
  }

  if (role === 'KITCHEN_MANAGER') {
    return [...navigationItems];
  }

  if (role === 'KITCHEN_STAFF') {
    return navigationItems.filter((item) => !item.managerOnly);
  }

  return [];
}
