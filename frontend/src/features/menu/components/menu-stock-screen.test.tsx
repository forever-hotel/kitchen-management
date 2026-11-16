import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { AppProviders } from '@/providers/app-providers';
import { MENU_CATEGORIES_FIXTURE } from '../../../../tests/fixtures/kms-menu.fixture';
import { MENU_ITEMS_R03_FIXTURE } from '../../../../tests/fixtures/kms-menu-r03.fixture';
import { MenuManagementScreen } from './menu-management-screen';

describe('R-10 menu screen stock integration', () => {
  it('TC-KMS-R10-UI-07: updated status changes the row and selected filter results only after server refresh', async () => {
    const initial = MENU_ITEMS_R03_FIXTURE;
    const lunch = initial.find((item) => item.name === 'Chicken Fried Rice');
    if (!lunch) throw new Error('Expected lunch menu fixture');
    const fresh = initial.map((item) =>
      item.menuItemId === lunch.menuItemId ? { ...item, stockStatus: 'AVAILABLE' as const } : item,
    );
    const onChangeStockStatus = jest.fn(async () => undefined);
    const onReloadMenuItems = jest.fn(async () => fresh);
    render(
      <AppProviders>
        <MenuManagementScreen
          categories={MENU_CATEGORIES_FIXTURE}
          items={initial}
          dataMode="api"
          onChangeStockStatus={onChangeStockStatus}
          onReloadMenuItems={onReloadMenuItems}
        />
      </AppProviders>,
    );
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Filter by stock status' })).getByRole('button', {
        name: /Low Stock/,
      }),
    );
    const select = screen.getByRole('combobox', { name: 'Stock control for Chicken Fried Rice' });
    fireEvent.change(select, { target: { value: 'AVAILABLE' } });
    await waitFor(() => expect(onReloadMenuItems).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByText('No menu items match these filters')).toBeInTheDocument(),
    );
    expect(onChangeStockStatus).toHaveBeenCalledWith(lunch.menuItemId, {
      stockStatus: 'AVAILABLE',
    });
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Filter by stock status' })).getByRole('button', {
        name: /Available/,
      }),
    );
    expect(screen.getByText('Chicken Fried Rice')).toBeInTheDocument();
  });

  it('TC-KMS-R10-UI-08: LOW_STOCK remains explicitly visible in the kitchen stock filter', () => {
    render(
      <AppProviders>
        <MenuManagementScreen categories={MENU_CATEGORIES_FIXTURE} items={MENU_ITEMS_R03_FIXTURE} />
      </AppProviders>,
    );
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Filter by stock status' })).getByRole('button', {
        name: /Low Stock/,
      }),
    );
    expect(screen.getByText('Chicken Fried Rice')).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'Stock control for Chicken Fried Rice' }),
    ).toHaveDisplayValue('Low Stock');
  });
});
