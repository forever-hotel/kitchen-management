import type { MenuManagementItem, MenuStockFilter } from '../types/menu-management.type';

export function getStockFilter(status: MenuManagementItem['stockStatus']): MenuStockFilter {
  if (status === 'AVAILABLE' || status === 'LOW_STOCK') {
    return status;
  }
  return 'UNAVAILABLE';
}

export function getStockCounts(items: readonly MenuManagementItem[]) {
  return {
    ALL: items.length,
    AVAILABLE: items.filter((item) => getStockFilter(item.stockStatus) === 'AVAILABLE').length,
    LOW_STOCK: items.filter((item) => getStockFilter(item.stockStatus) === 'LOW_STOCK').length,
    UNAVAILABLE: items.filter((item) => getStockFilter(item.stockStatus) === 'UNAVAILABLE').length,
  };
}

export function filterMenuItems(
  items: readonly MenuManagementItem[],
  categoryId: string,
  searchQuery: string,
  stockFilter: MenuStockFilter,
): MenuManagementItem[] {
  const query = searchQuery.trim().toLocaleLowerCase();

  return items.filter((item) => {
    const matchesCategory = item.categoryId === categoryId;
    const matchesSearch = item.name.toLocaleLowerCase().includes(query);
    const matchesStock = stockFilter === 'ALL' || getStockFilter(item.stockStatus) === stockFilter;

    return matchesCategory && matchesSearch && matchesStock;
  });
}

export function formatCategoryTime(time: string): string {
  return /^\d{2}:\d{2}(:\d{2})?$/.test(time) ? time.slice(0, 5) : time;
}
