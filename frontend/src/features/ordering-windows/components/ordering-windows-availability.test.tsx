import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AppProviders } from '@/providers/app-providers';
import type { KmsMealCategoryData } from '@/types/kms-menu';
import { OrderingWindowsScreen } from './ordering-windows-screen';

const categoryId = '22222222-2222-4222-8222-222222222222';
const original: KmsMealCategoryData = {
  categoryId,
  name: 'Dinner',
  orderStartTime: '16:30:00',
  orderCutoffTime: '19:30:00',
  orderingEnabled: true,
};
const now = new Date('2026-11-08T12:00:00Z');

function display(
  args: {
    availabilityControlsEnabled?: boolean;
    onUpdateAvailability?: (id: string, enabled: boolean) => Promise<unknown>;
    onReloadWindows?: () => Promise<readonly KmsMealCategoryData[]>;
  } = {},
) {
  return render(
    <AppProviders>
      <OrderingWindowsScreen
        dataMode="api"
        windows={[original]}
        categories={[original]}
        now={now}
        {...args}
      />
    </AppProviders>,
  );
}

describe('DDP-268 manager ordering availability', () => {
  it('allows editing by default when authenticated callbacks are connected', () => {
    display({
      onUpdateAvailability: jest.fn(async () => undefined),
      onReloadWindows: jest.fn(async () => [original]),
    });
    const card = screen.getByRole('article', { name: 'Dinner ordering window' });
    const toggle = within(card).getByRole('switch', { name: 'Dinner ordering window enabled' });
    expect(toggle).toBeEnabled();
    expect(toggle).toBeChecked();
  });

  it('saves false and reflects confirmed KMS readback with the default controls', async () => {
    const onUpdateAvailability = jest.fn(async () => undefined);
    const onReloadWindows = jest.fn(async () => [{ ...original, orderingEnabled: false }]);
    display({ onUpdateAvailability, onReloadWindows });
    const card = screen.getByRole('article', { name: 'Dinner ordering window' });
    fireEvent.click(within(card).getByRole('switch', { name: 'Dinner ordering window enabled' }));
    await waitFor(() => expect(onUpdateAvailability).toHaveBeenCalledWith(categoryId, false));
    await waitFor(() => expect(onReloadWindows).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(
        within(card).getByRole('switch', { name: 'Dinner ordering window enabled' }),
      ).not.toBeChecked(),
    );
  });
});
