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
    mode?: 'status' | 'remove';
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
        mode={overrides.mode ?? 'status'}
        item={{ ...item, stockStatus: overrides.status ?? item.stockStatus }}
        enabled={overrides.enabled ?? true}
        onUpdate={onUpdate}
        onReload={onReload}
      />
    </AppProviders>,
  );
  return { ...result, onUpdate, onReload };
}

function changeStatus(value: KmsMenuStockStatus) {
  fireEvent.change(screen.getByRole('combobox', { name: 'Stock control for Chicken Fried Rice' }), {
    target: { value },
  });
}

describe('R-10 / DDP-73 compact Figma stock actions', () => {
  it('shows one status selector, without a badge, Apply, or Remove stacked below', () => {
    renderActions();
    expect(screen.getAllByRole('combobox', { name: /Stock control/ })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Apply stock/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove Chicken Fried Rice safely/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Quick status')).not.toBeInTheDocument();
  });

  it.each(['AVAILABLE', 'LOW_STOCK', 'UNAVAILABLE'] as const)(
    'immediately applies %s with a single-field PATCH and reload',
    async (next) => {
      const { onUpdate, onReload } = renderActions({
        status: next === 'LOW_STOCK' ? 'AVAILABLE' : 'LOW_STOCK',
      });
      changeStatus(next);
      await waitFor(() =>
        expect(onUpdate).toHaveBeenCalledWith(item.menuItemId, { stockStatus: next }),
      );
      await waitFor(() => expect(onReload).toHaveBeenCalledTimes(1));
      expect(onUpdate).toHaveBeenCalledTimes(1);
    },
  );

  it('requires confirmation when the selector chooses Temporarily Disabled', async () => {
    const { onUpdate } = renderActions();
    changeStatus('TEMPORARILY_DISABLED');
    expect(screen.getByText(/existing order history/)).toBeInTheDocument();
    expect(onUpdate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Disable item' }));
    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith(item.menuItemId, {
        stockStatus: 'TEMPORARILY_DISABLED',
      }),
    );
  });

  it('cannot write without authenticated PATCH and reload callbacks', () => {
    const { onUpdate } = renderActions({ enabled: false });
    expect(screen.getByRole('combobox', { name: /Stock control/ })).toBeDisabled();
    expect(screen.queryByText('Manager API connection required.')).not.toBeInTheDocument();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it.each([
    [403, 'Only a Kitchen Manager may change menu stock.'],
    [404, 'This menu item no longer exists. Refresh the menu.'],
  ])('HTTP %i feedback rolls back visible status', async (status, message) => {
    const onUpdate = jest.fn(async () => {
      throw Object.assign(new Error('denied'), { status });
    });
    const { onReload } = renderActions({ onUpdate });
    changeStatus('UNAVAILABLE');
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Stock control/ })).toHaveValue('LOW_STOCK');
    expect(onReload).not.toHaveBeenCalled();
  });

  it('renders a separate Remove icon, with confirmation and safe PATCH only', async () => {
    const { onUpdate } = renderActions({ mode: 'remove' });
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Chicken Fried Rice safely' }));
    expect(screen.getByText(/existing order history/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Disable item' }));
    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith(item.menuItemId, {
        stockStatus: 'TEMPORARILY_DISABLED',
      }),
    );
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('never writes if Remove is cancelled', () => {
    const { onUpdate } = renderActions({ mode: 'remove' });
    fireEvent.click(screen.getByRole('button', { name: 'Remove Chicken Fried Rice safely' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('disables Remove when the user has no connected manager API', () => {
    renderActions({ mode: 'remove', enabled: false });
    expect(screen.getByRole('button', { name: 'Remove Chicken Fried Rice safely' })).toBeDisabled();
  });

  it('does not repeat a confirmed PATCH while reload is pending', async () => {
    const onReload = jest.fn(async () => { throw new Error('offline'); });
    const { onUpdate } = renderActions({ onReload });
    changeStatus('AVAILABLE');
    await waitFor(() => expect(onReload).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('combobox', { name: /Stock control/ })).toBeDisabled();
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });
});
