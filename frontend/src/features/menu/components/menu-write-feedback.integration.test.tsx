import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AppProviders } from '@/providers/app-providers';
import { MENU_CATEGORIES_FIXTURE } from '../../../../tests/fixtures/kms-menu.fixture';
import { MENU_ITEMS_R03_FIXTURE } from '../../../../tests/fixtures/kms-menu-r03.fixture';
import { MenuManagementScreen } from './menu-management-screen';

// Ant Design 6 modal browser API shims for Jest/jsdom.
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

function fillAndSubmit() {
  fireEvent.click(screen.getByRole('button', { name: 'Add Menu Item' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Item name *' }), {
    target: { value: 'Egg Fried Rice' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Price (raw integer) *' }), {
    target: { value: '1250' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Preparation minutes *' }), {
    target: { value: '15' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save Menu Item' }));
}

describe('KMS menu write conflict feedback', () => {
  it('shows the duplicate name, preserves form, and never reloads after a conflict', async () => {
    const onCreateMenuItem = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      message: 'An item with this name already exists in the selected category.',
    });
    const onReloadMenuItems = jest.fn(async () => [...MENU_ITEMS_R03_FIXTURE]);
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
      await screen.findByText(/An item named "Egg Fried Rice" already exists/),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Add Menu Item' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Item name *' })).toHaveValue('Egg Fried Rice');
    expect(screen.getByRole('textbox', { name: 'Price (raw integer) *' })).toHaveValue('1250');
    expect(onReloadMenuItems).not.toHaveBeenCalled();
    expect(onCreateMenuItem).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Menu item saved and list reloaded.')).not.toBeInTheDocument();
  }, 15000);

  it('allows a corrected name to be saved after the first conflict', async () => {
    const onCreateMenuItem = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 409, message: 'Duplicate name' })
      .mockResolvedValueOnce({ ok: true });
    const onReloadMenuItems = jest.fn(async () => [...MENU_ITEMS_R03_FIXTURE]);
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
    expect(await screen.findByText(/already exists in the selected category/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Item name *' }), {
      target: { value: 'Egg Fried Rice Special' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Menu Item' }));

    await waitFor(() => expect(onCreateMenuItem).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onReloadMenuItems).toHaveBeenCalledTimes(1));
  }, 15000);
});
