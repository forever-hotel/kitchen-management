import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AppProviders } from '@/providers/app-providers';
import type { KmsMenuStockStatus } from '@/types/kms-menu';

import type { MenuManagementItem } from '../types/menu-management.type';
import { MenuStockActions } from './menu-stock-actions';

class TestResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}
class TestMessageChannel {
  port1 = { onmessage: null as (() => void) | null };
  port2 = { postMessage: () => queueMicrotask(() => this.port1.onmessage?.()) };
}
Object.defineProperty(globalThis, 'ResizeObserver', {
  configurable: true,
  value: TestResizeObserver,
});
Object.defineProperty(globalThis, 'MessageChannel', {
  configurable: true,
  value: TestMessageChannel,
});
Object.defineProperty(window, 'matchMedia', {
  configurable: true,
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
  value: (element: Element): CSSStyleDeclaration => nativeGetComputedStyle(element),
});

const item: MenuManagementItem = {
  menuItemId: '91111111-1111-4111-8111-111111111111',
  categoryId: '22222222-2222-4222-8222-222222222222',
  name: 'Chicken Fried Rice',
  description: 'Lunch',
  price: 950,
  preparationTime: 15,
  portionLimit: 3,
  stockStatus: 'LOW_STOCK',
  imageUrl: null,
  allergens: [{ name: 'Soy' }],
  dietaryLabels: [{ name: 'Halal' }],
};

function renderActions(
  overrides: {
    enabled?: boolean;
    onUpdate?: (id: string, payload: { stockStatus: KmsMenuStockStatus }) => Promise<unknown>;
    onReload?: () => Promise<void>;
    status?: KmsMenuStockStatus;
  } = {},
) {
  const onUpdate =
    overrides.onUpdate ??
    jest.fn(async (id: string, payload: { stockStatus: KmsMenuStockStatus }) => {
      void id;
      void payload;
      return undefined;
    });
  const onReload = overrides.onReload ?? jest.fn(async () => undefined);
  const result = render(
    <AppProviders>
      <MenuStockActions
        item={{ ...item, stockStatus: overrides.status ?? item.stockStatus }}
        enabled={overrides.enabled ?? true}
        onUpdate={onUpdate}
        onReload={onReload}
      />
    </AppProviders>,
  );
  return { ...result, onUpdate, onReload };
}
function selectStatus(value: KmsMenuStockStatus) {
  fireEvent.change(screen.getByRole('combobox', { name: 'Stock control for Chicken Fried Rice' }), {
    target: { value },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Apply stock for Chicken Fried Rice' }));
}

describe('R-10 quick stock action', () => {
  it.each(['AVAILABLE', 'LOW_STOCK', 'UNAVAILABLE', 'TEMPORARILY_DISABLED'] as const)(
    'TC-KMS-R10-UI-01: applies %s with a single-field PATCH',
    async (next) => {
      const { onUpdate, onReload } = renderActions({
        status: next === 'LOW_STOCK' ? 'AVAILABLE' : 'LOW_STOCK',
      });
      selectStatus(next);
      await waitFor(() =>
        expect(onUpdate).toHaveBeenCalledWith(item.menuItemId, { stockStatus: next }),
      );
      await waitFor(() => expect(onReload).toHaveBeenCalledTimes(1));
      expect(onUpdate).toHaveBeenCalledTimes(1);
    },
  );

  it('TC-KMS-R10-UI-02: cannot write without secure update and reload wiring', () => {
    const { onUpdate } = renderActions({ enabled: false });
    expect(screen.getByRole('combobox', { name: /Stock control/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Apply stock/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Remove Chicken Fried Rice safely/ })).toBeDisabled();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it.each([
    [403, 'Only a Kitchen Manager may change menu stock.'],
    [404, 'This menu item no longer exists. Refresh the menu.'],
  ])('TC-KMS-R10-UI-03: HTTP %i feedback retains selected status', async (status, message) => {
    const onUpdate = jest.fn(async (id: string, payload: { stockStatus: KmsMenuStockStatus }) => {
      void id;
      void payload;
      throw Object.assign(new Error('denied'), { status });
    });
    const { onReload } = renderActions({ onUpdate });
    selectStatus('UNAVAILABLE');
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Stock control/ })).toHaveValue('UNAVAILABLE');
    expect(onReload).not.toHaveBeenCalled();
  });

  it('TC-KMS-R10-UI-04: safe remove requires confirmation and PATCHes temporary disable only', async () => {
    const { onUpdate } = renderActions();
    fireEvent.click(screen.getByRole('button', { name: /Remove Chicken Fried Rice safely/ }));
    expect(screen.getByText(/existing order history/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Disable item' }));
    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith(item.menuItemId, {
        stockStatus: 'TEMPORARILY_DISABLED',
      }),
    );
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('TC-KMS-R10-UI-05: cancelling removal never calls the backend', () => {
    const { onUpdate } = renderActions();
    fireEvent.click(screen.getByRole('button', { name: /Remove Chicken Fried Rice safely/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('TC-KMS-R10-UI-06: successful write is not repeated while server refresh is pending', async () => {
    const onReload = jest.fn(async () => {
      throw new Error('offline');
    });
    const { onUpdate } = renderActions({ onReload });
    selectStatus('AVAILABLE');
    await waitFor(() => expect(onReload).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: /Apply stock/ })).toBeDisabled();
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });
});
