import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { AppProviders } from '@/providers/app-providers';
import type { MenuManagementItem } from '../types/menu-management.type';
import type { MenuItemEditPayload } from '../utils/menu-item-edit.validation';
import { MENU_CATEGORIES_FIXTURE } from '../../../../tests/fixtures/kms-menu.fixture';
import { MENU_ITEMS_R03_FIXTURE } from '../../../../tests/fixtures/kms-menu-r03.fixture';
import { MenuManagementScreen } from './menu-management-screen';

class ModalTestMessageChannel {
  port1 = { onmessage: null as (() => void) | null };
  port2 = { postMessage: () => queueMicrotask(() => this.port1.onmessage?.()) };
}
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}
Object.defineProperty(globalThis, 'ResizeObserver', {
  configurable: true,
  writable: true,
  value: MockResizeObserver,
});
Object.defineProperty(globalThis, 'MessageChannel', {
  configurable: true,
  writable: true,
  value: ModalTestMessageChannel,
});
Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
const nativeGetComputedStyle = window.getComputedStyle.bind(window);
Object.defineProperty(window, 'getComputedStyle', {
  configurable: true,
  writable: true,
  value: (element: Element): CSSStyleDeclaration => nativeGetComputedStyle(element),
});

const lunch = MENU_ITEMS_R03_FIXTURE.find((item) => item.name === 'Chicken Fried Rice')!;
const updated: MenuManagementItem = { ...lunch, name: 'Updated Chicken Fried Rice', price: 1750 };

function renderScreen(
  onUpdateMenuItem: (itemId: string, payload: MenuItemEditPayload) => Promise<unknown>,
  onReloadMenuItems: () => Promise<readonly MenuManagementItem[]>,
) {
  render(
    <AppProviders>
      <MenuManagementScreen
        categories={MENU_CATEGORIES_FIXTURE}
        items={MENU_ITEMS_R03_FIXTURE}
        onUpdateMenuItem={onUpdateMenuItem}
        onReloadMenuItems={onReloadMenuItems}
      />
    </AppProviders>,
  );
}

function editRice() {
  fireEvent.click(screen.getByRole('button', { name: 'Edit Chicken Fried Rice' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Item name *' }), {
    target: { value: 'Updated Chicken Fried Rice' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Price (raw integer) *' }), {
    target: { value: '1750' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
}

describe('R-09 menu edit screen integration', () => {
  it('TC-KMS-R09-013: PATCH then reload refreshes row and subsequent guest preview', async () => {
    const onUpdate = jest.fn(async () => undefined);
    const onReload = jest.fn(async () => [
      ...MENU_ITEMS_R03_FIXTURE.filter((item) => item.menuItemId !== lunch.menuItemId),
      updated,
    ]);
    renderScreen(onUpdate, onReload);
    editRice();
    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith(lunch.menuItemId, {
        name: 'Updated Chicken Fried Rice',
        price: 1750,
      }),
    );
    await waitFor(() => expect(onReload).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Updated Chicken Fried Rice')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Updated Chicken Fried Rice' }));
    const preview = screen.getByRole('region', { name: 'Guest-style menu preview' });
    expect(within(preview).getByText('Updated Chicken Fried Rice')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Price (raw integer) *' })).toHaveValue('1750');
  }, 15000);

  it('TC-KMS-R09-014: failed menu reload retries GET only, not the successful PATCH', async () => {
    const onUpdate = jest.fn(async () => undefined);
    const onReload = jest
      .fn()
      .mockRejectedValueOnce(new Error('Temporary fetch failure'))
      .mockResolvedValueOnce([
        ...MENU_ITEMS_R03_FIXTURE.filter((item) => item.menuItemId !== lunch.menuItemId),
        updated,
      ]);
    renderScreen(onUpdate, onReload);
    editRice();
    expect(
      await screen.findByText('Menu item saved, but the menu list could not be reloaded.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry menu reload' }));
    expect(await screen.findByText('Updated Chicken Fried Rice')).toBeInTheDocument();
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onReload).toHaveBeenCalledTimes(2);
  }, 15000);
});
