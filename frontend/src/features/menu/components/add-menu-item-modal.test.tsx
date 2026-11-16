import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { AppProviders } from '@/providers/app-providers';

import { AddMenuItemModal } from './add-menu-item-modal';
import type { MenuItemWritePayload } from '../utils/menu-item-write.validation';

/** Ant Design 6 modal shims for jsdom. Kept local like the R-06 tests. */
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
const nativeGetComputedStyle = window.getComputedStyle.bind(window);
Object.defineProperty(window, 'getComputedStyle', {
  configurable: true,
  writable: true,
  value: (element: Element): CSSStyleDeclaration => nativeGetComputedStyle(element),
});

const categories = [
  {
    categoryId: '22222222-2222-4222-8222-222222222222',
    name: 'Lunch',
    orderStartTime: '11:30:00',
    orderCutoffTime: '14:30:00',
  },
];
const allergens = [{ allergenId: 'a1111111-1111-4111-8111-111111111111', name: 'Eggs' }];
const dietaryLabels = [
  { dietaryLabelId: 'b1111111-1111-4111-8111-111111111111', name: 'Vegetarian' },
];
function renderModal(
  onSave?: (payload: MenuItemWritePayload) => Promise<void>,
  onSaved = jest.fn(),
) {
  render(
    <AppProviders>
      <AddMenuItemModal
        open
        categories={categories}
        initialCategoryId={categories[0].categoryId}
        allergens={allergens}
        dietaryLabels={dietaryLabels}
        onCancel={jest.fn()}
        onSave={onSave}
        onSaved={onSaved}
      />
    </AppProviders>,
  );
  return { onSaved };
}
function fillRequired() {
  fireEvent.change(screen.getByRole('textbox', { name: 'Item name *' }), {
    target: { value: '  Egg Fried Rice  ' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Price (raw integer) *' }), {
    target: { value: '1250' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Preparation minutes *' }), {
    target: { value: '15' },
  });
}

describe('R-08 Add Menu Item modal', () => {
  it('TC-KMS-R08-005: requires a name and valid price, preserving entered inputs', async () => {
    const onSave = jest.fn(async () => undefined);
    renderModal(onSave);
    fireEvent.click(screen.getByRole('button', { name: 'Save Menu Item' }));
    expect(await screen.findByText(/Item name is required/)).toBeInTheDocument();
    fillRequired();
    fireEvent.change(screen.getByRole('textbox', { name: 'Price (raw integer) *' }), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Menu Item' }));
    expect(await screen.findByText(/Price must be/)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  }, 12000);

  it('TC-KMS-R08-006: selecting tags and entering image URL updates live guest preview', () => {
    renderModal(jest.fn(async () => undefined));
    fillRequired();
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Allergen tags' })).getByRole('checkbox', {
        name: 'Eggs',
      }),
    );
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Dietary labels' })).getByRole('checkbox', {
        name: 'Vegetarian',
      }),
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Image URL (optional)' }), {
      target: { value: 'https://example.com/food.jpg' },
    });
    const preview = screen.getByRole('region', { name: 'Guest-style menu preview' });
    expect(within(preview).getByText('Egg Fried Rice')).toBeInTheDocument();
    expect(within(preview).getByText('Allergen: Eggs')).toBeInTheDocument();
    expect(within(preview).getByText('Vegetarian')).toBeInTheDocument();
    expect(
      within(preview).getByRole('img', { name: 'Egg Fried Rice preview' }),
    ).toBeInTheDocument();
  }, 12000);

  it('TC-KMS-R08-007: valid save calls authenticated callback with normalized values and closes on success', async () => {
    const onSave = jest.fn(async () => undefined);
    const { onSaved } = renderModal(onSave);
    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: 'Save Menu Item' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Egg Fried Rice',
        price: 1250,
        preparationTime: 15,
        portionLimit: 5,
        categoryId: categories[0].categoryId,
      }),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  }, 12000);

  it('TC-KMS-R08-008: HTTP 409 keeps form open with meaningful error, no fake success', async () => {
    const onSave = jest.fn(async () => {
      throw Object.assign(new Error('duplicate'), { status: 409 });
    });
    const { onSaved } = renderModal(onSave);
    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: 'Save Menu Item' }));
    expect(await screen.findByText(/already exists in the selected category/)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Item name *' })).toHaveValue('  Egg Fried Rice  ');
    expect(screen.getByRole('dialog', { name: 'Add Menu Item' })).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  }, 12000);

  it('TC-KMS-R08-009: preview without secure API callback has disabled save', () => {
    renderModal();
    expect(screen.getByText(/Form preview only/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Menu Item' })).toBeDisabled();
  });
});
