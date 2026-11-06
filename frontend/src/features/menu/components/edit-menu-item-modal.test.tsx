import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { AppProviders } from '@/providers/app-providers';
import type { MenuManagementItem } from '../types/menu-management.type';
import { AddMenuItemModal } from './add-menu-item-modal';

// Ant Design 6 requires browser observers that are not provided by jsdom.
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

const lunchId = '22222222-2222-4222-8222-222222222222';
const dinnerId = '44444444-4444-4444-8444-444444444444';
const eggId = 'a1111111-1111-4111-8111-111111111111';
const milkId = 'a2222222-2222-4222-8222-222222222222';
const vegId = 'b1111111-1111-4111-8111-111111111111';
const categories = [
  { categoryId: lunchId, name: 'Lunch', orderStartTime: '11:30:00', orderCutoffTime: '14:30:00' },
  { categoryId: dinnerId, name: 'Dinner', orderStartTime: '18:00:00', orderCutoffTime: '22:00:00' },
];
const allergens = [
  { allergenId: eggId, name: 'Eggs' },
  { allergenId: milkId, name: 'Milk' },
];
const dietaryLabels = [{ dietaryLabelId: vegId, name: 'Vegetarian' }];
const item: MenuManagementItem = {
  menuItemId: '91111111-1111-4111-8111-111111111111',
  categoryId: lunchId,
  name: 'Egg Fried Rice',
  description: 'With sambol',
  price: 1200,
  preparationTime: 15,
  portionLimit: 3,
  stockStatus: 'LOW_STOCK',
  imageUrl: 'https://example.com/rice.jpg',
  allergens: [{ allergenId: eggId, name: 'Eggs' }],
  dietaryLabels: [{ dietaryLabelId: vegId, name: 'Vegetarian' }],
};
function renderEdit(
  onUpdate?: (
    payload: import('../utils/menu-item-edit.validation').MenuItemEditPayload,
  ) => Promise<void>,
  onSaved = jest.fn(),
  options: {
    allergens?: typeof allergens;
    dietaryLabels?: typeof dietaryLabels;
    onCancel?: jest.Mock;
  } = {},
) {
  const onCancel = options.onCancel ?? jest.fn();
  render(
    <AppProviders>
      <AddMenuItemModal
        open
        item={item}
        categories={categories}
        allergens={options.allergens ?? allergens}
        dietaryLabels={options.dietaryLabels ?? dietaryLabels}
        onCancel={onCancel}
        onUpdate={onUpdate}
        onSaved={onSaved}
      />
    </AppProviders>,
  );
  return { onCancel, onSaved };
}

describe('R-09 Edit Menu Item modal', () => {
  it('TC-KMS-R09-007: preloads fields, category, tags, stock and image into edit and guest preview', () => {
    renderEdit(jest.fn(async () => undefined));
    expect(screen.getByRole('dialog', { name: 'Edit Menu Item' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Item name *' })).toHaveValue('Egg Fried Rice');
    expect(screen.getByLabelText('Meal category *')).toHaveValue(lunchId);
    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue('With sambol');
    expect(screen.getByRole('textbox', { name: 'Price (raw integer) *' })).toHaveValue('1200');
    expect(screen.getByRole('textbox', { name: 'Preparation minutes *' })).toHaveValue('15');
    expect(screen.getByRole('textbox', { name: 'Per-guest portion limit *' })).toHaveValue('3');
    expect(screen.getByRole('radio', { name: 'Low Stock' })).toBeChecked();
    expect(screen.getByRole('textbox', { name: 'Image URL (optional)' })).toHaveValue(
      'https://example.com/rice.jpg',
    );
    expect(
      within(screen.getByRole('group', { name: 'Allergen tags' })).getByRole('checkbox', {
        name: 'Eggs',
      }),
    ).toBeChecked();
    expect(
      within(screen.getByRole('group', { name: 'Dietary labels' })).getByRole('checkbox', {
        name: 'Vegetarian',
      }),
    ).toBeChecked();
    expect(
      within(screen.getByRole('region', { name: 'Guest-style menu preview' })).getByText(
        'Egg Fried Rice',
      ),
    ).toBeInTheDocument();
  });

  it('TC-KMS-R09-008: updating stock/category and tags sends only modified fields; untouched dietary stays associated', async () => {
    const onUpdate = jest.fn(async () => undefined);
    const { onSaved } = renderEdit(onUpdate);
    fireEvent.change(screen.getByLabelText('Meal category *'), { target: { value: dinnerId } });
    fireEvent.click(screen.getByRole('radio', { name: 'Available' }));
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Allergen tags' })).getByRole('checkbox', {
        name: 'Milk',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith({
        categoryId: dinnerId,
        stockStatus: 'AVAILABLE',
        allergenIds: [eggId, milkId],
      }),
    );
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate.mock.calls).toStrictEqual([
      [
        {
          categoryId: dinnerId,
          stockStatus: 'AVAILABLE',
          allergenIds: [eggId, milkId],
        },
      ],
    ]);
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  }, 15000);

  it('TC-KMS-R09-009: Cancel does not send any PATCH or claim a save', () => {
    const onUpdate = jest.fn(async () => undefined);
    const { onCancel, onSaved } = renderEdit(onUpdate);

    fireEvent.change(screen.getByRole('textbox', { name: 'Item name *' }), {
      target: { value: 'Draft only' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onUpdate).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('TC-KMS-R09-010: HTTP 403 keeps edit form open with permission error and no success', async () => {
    const onUpdate = jest.fn(async () => {
      throw Object.assign(new Error('forbidden'), { status: 403 });
    });
    const { onSaved } = renderEdit(onUpdate);
    fireEvent.change(screen.getByRole('textbox', { name: 'Item name *' }), {
      target: { value: 'Draft Deluxe' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(
      await screen.findByText('Only Kitchen Managers can save menu items.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Item name *' })).toHaveValue('Draft Deluxe');
    expect(screen.getByRole('dialog', { name: 'Edit Menu Item' })).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  }, 15000);

  it('TC-KMS-R09-011: unchanged edit does not call PATCH', async () => {
    const onUpdate = jest.fn(async () => undefined);
    renderEdit(onUpdate);
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(await screen.findByText('No changes to save.')).toBeInTheDocument();
    expect(onUpdate).not.toHaveBeenCalled();
  }, 15000);

  it('TC-KMS-R09-012: missing tag choices preserve associations and permit changing other fields safely', async () => {
    const onUpdate = jest.fn(async () => undefined);
    renderEdit(onUpdate, jest.fn(), { allergens: [], dietaryLabels: [] });
    expect(screen.getByText(/Some existing tags are unavailable/)).toBeInTheDocument();
    expect(screen.getByText('Allergen: Eggs (existing)')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Item name *' }), {
      target: { value: 'Safe name update' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith({ name: 'Safe name update' }));
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate.mock.calls).toStrictEqual([[{ name: 'Safe name update' }]]);
  }, 15000);
});
