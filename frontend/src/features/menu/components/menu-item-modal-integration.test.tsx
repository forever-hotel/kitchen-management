import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AppProviders } from '@/providers/app-providers';
import { MENU_CATEGORIES_FIXTURE } from '../../../../tests/fixtures/kms-menu.fixture';
import { MENU_ITEMS_R03_FIXTURE } from '../../../../tests/fixtures/kms-menu-r03.fixture';
import { MenuManagementScreen } from './menu-management-screen';

/** Browser ResizeObserver shim for Ant Design in Jest/jsdom. */
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
class ModalTestMessageChannel {
  port1 = { onmessage: null as (() => void) | null };
  port2 = { postMessage: () => queueMicrotask(() => this.port1.onmessage?.()) };
}
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
const nativeStyle = window.getComputedStyle.bind(window);
Object.defineProperty(window, 'getComputedStyle', {
  configurable: true,
  writable: true,
  value: (element: Element) => nativeStyle(element),
});

const newItem = {
  ...MENU_ITEMS_R03_FIXTURE[0],
  menuItemId: '99999999-9999-4999-8999-999999999999',
  categoryId: MENU_CATEGORIES_FIXTURE[1].categoryId,
  name: 'New Lunch Special',
};

function fillAndSubmit() {
  fireEvent.click(screen.getByRole('button', { name: '+ Add Menu Item' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Item name *' }), {
    target: { value: 'New Lunch Special' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Price (raw integer) *' }), {
    target: { value: '1500' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Preparation minutes *' }), {
    target: { value: '10' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save Menu Item' }));
}

describe('R-08 menu screen integration', () => {
  it('TC-KMS-R08-010: successful save reloads menu items once and displays new row', async () => {
    const onCreateMenuItem = jest.fn(async () => undefined);
    const onReloadMenuItems = jest.fn(async () => [...MENU_ITEMS_R03_FIXTURE, newItem]);
    render(
      <AppProviders>
        <MenuManagementScreen
          categories={MENU_CATEGORIES_FIXTURE}
          items={MENU_ITEMS_R03_FIXTURE}
          onCreateMenuItem={onCreateMenuItem}
          onReloadMenuItems={onReloadMenuItems}
        />
      </AppProviders>,
    );
    fillAndSubmit();
    await waitFor(() => expect(onCreateMenuItem).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onReloadMenuItems).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('New Lunch Special')).toBeInTheDocument());
    expect(screen.getByText('Menu item saved and list reloaded.')).toBeInTheDocument();
  }, 15000);

  it('TC-KMS-R08-011: reload failure warns; retry never duplicates POST', async () => {
    const onCreateMenuItem = jest.fn(async () => undefined);
    const onReloadMenuItems = jest
      .fn()
      .mockRejectedValueOnce(new Error('temporary network failure'))
      .mockResolvedValueOnce([...MENU_ITEMS_R03_FIXTURE, newItem]);
    render(
      <AppProviders>
        <MenuManagementScreen
          categories={MENU_CATEGORIES_FIXTURE}
          items={MENU_ITEMS_R03_FIXTURE}
          onCreateMenuItem={onCreateMenuItem}
          onReloadMenuItems={onReloadMenuItems}
        />
      </AppProviders>,
    );
    fillAndSubmit();
    expect(
      await screen.findByText('Menu item saved, but the menu list could not be reloaded.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry menu reload' }));
    await waitFor(() => expect(screen.getByText('New Lunch Special')).toBeInTheDocument());
    expect(onCreateMenuItem).toHaveBeenCalledTimes(1);
    expect(onReloadMenuItems).toHaveBeenCalledTimes(2);
  }, 15000);
});
