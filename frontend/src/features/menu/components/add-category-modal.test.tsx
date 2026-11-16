import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AppProviders } from '@/providers/app-providers';

import { MENU_CATEGORIES_FIXTURE } from '../../../../tests/fixtures/kms-menu.fixture';
import { MENU_ITEMS_R03_FIXTURE } from '../../../../tests/fixtures/kms-menu-r03.fixture';
import { MenuManagementScreen } from '../index';

/**
 * Ant Design 6 uses browser messaging and responsive APIs that jsdom does not
 * implement. Scope these shims to the R-06 modal tests rather than changing
 * the shared Jest setup used by other team members.
 */
class ModalTestMessageChannel {
  port1 = { onmessage: null as (() => void) | null };
  port2 = {
    postMessage: () => {
      queueMicrotask(() => this.port1.onmessage?.());
    },
  };
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

// rc-dialog measures scrollbars with a pseudo-element style request.
// jsdom does not implement that second argument; real DOM style is sufficient.
const browserGetComputedStyle = window.getComputedStyle.bind(window);
Object.defineProperty(window, 'getComputedStyle', {
  configurable: true,
  writable: true,
  value: (element: Element): CSSStyleDeclaration => browserGetComputedStyle(element),
});

const created = {
  categoryId: '55555555-5555-4555-8555-555555555555',
  name: 'Brunch',
  orderStartTime: '09:30:00',
  orderCutoffTime: '11:30:00',
};

function renderConnected(
  overrides: {
    onCreateCategory?: jest.Mock;
    onRefreshCategories?: jest.Mock;
  } = {},
) {
  const onCreateCategory = overrides.onCreateCategory ?? jest.fn(async () => created);
  const onRefreshCategories =
    overrides.onRefreshCategories ?? jest.fn(async () => [...MENU_CATEGORIES_FIXTURE, created]);
  const rendered = render(
    <AppProviders>
      <MenuManagementScreen
        categories={MENU_CATEGORIES_FIXTURE}
        items={MENU_ITEMS_R03_FIXTURE}
        dataMode="api"
        onCreateCategory={onCreateCategory}
        onRefreshCategories={onRefreshCategories}
      />
    </AppProviders>,
  );
  return { ...rendered, onCreateCategory, onRefreshCategories };
}

function openModal() {
  fireEvent.click(screen.getByRole('button', { name: 'Add Category' }));
  return screen.getByRole('dialog', { name: 'Add Category' });
}

function fillValid() {
  fireEvent.change(screen.getByRole('textbox', { name: 'Category name' }), {
    target: { value: '  Brunch  ' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Order start time' }), {
    target: { value: '09:30' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Order cutoff time' }), {
    target: { value: '11:30' },
  });
}

describe('R-06 Add Category modal', () => {
  it('TC-KMS-R06-001: opens, cancels and resets the form', async () => {
    renderConnected();
    openModal();
    fireEvent.change(screen.getByRole('textbox', { name: 'Category name' }), {
      target: { value: 'Draft category' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Add Category' })).not.toBeInTheDocument(),
    );
    openModal();
    expect(screen.getByRole('textbox', { name: 'Category name' })).toHaveValue('');
  });

  it('TC-KMS-R06-002: rejects invalid and reversed times without submitting', async () => {
    const { onCreateCategory } = renderConnected();
    openModal();
    fillValid();
    fireEvent.change(screen.getByRole('textbox', { name: 'Order cutoff time' }), {
      target: { value: '08:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Category' }));
    await waitFor(() =>
      expect(screen.getByText(/Cutoff time must be after start time/)).toBeInTheDocument(),
    );
    expect(onCreateCategory).not.toHaveBeenCalled();
  });

  it('TC-KMS-R06-003: creates using normalized API payload and refreshes the sidebar', async () => {
    const { onCreateCategory, onRefreshCategories } = renderConnected();
    openModal();
    fillValid();
    fireEvent.click(screen.getByRole('button', { name: 'Create Category' }));
    await waitFor(() =>
      expect(onCreateCategory).toHaveBeenCalledWith({
        name: 'Brunch',
        orderStartTime: '09:30:00',
        orderCutoffTime: '11:30:00',
      }),
    );
    await waitFor(() => expect(onRefreshCategories).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: /Brunch/ })).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Brunch Menu' })).toBeInTheDocument();
    expect(screen.getByText('Category created successfully.')).toBeInTheDocument();
  });

  it('TC-KMS-R06-004: duplicate 409 retains the modal and form fields', async () => {
    const duplicate = Object.assign(new Error('Duplicate category'), { status: 409 });
    const onCreateCategory = jest.fn(async () => {
      throw duplicate;
    });
    renderConnected({ onCreateCategory });
    openModal();
    fillValid();
    fireEvent.click(screen.getByRole('button', { name: 'Create Category' }));
    await waitFor(() =>
      expect(screen.getByText('A category with this name already exists.')).toBeInTheDocument(),
    );
    expect(screen.getByRole('dialog', { name: 'Add Category' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Category name' })).toHaveValue('  Brunch  ');
  }, 12000);

  it('TC-KMS-R06-005: failed refresh warns without retrying the write', async () => {
    let attempt = 0;
    const onRefreshCategories = jest.fn(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error('Network');
      return [...MENU_CATEGORIES_FIXTURE, created];
    });
    const { onCreateCategory } = renderConnected({ onRefreshCategories });
    openModal();
    fillValid();
    fireEvent.click(screen.getByRole('button', { name: 'Create Category' }));
    await waitFor(() =>
      expect(
        screen.getByText('Category created, but the category list could not be refreshed.'),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry refresh' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Brunch/ })).toBeInTheDocument());
    expect(onCreateCategory).toHaveBeenCalledTimes(1);
    expect(onRefreshCategories).toHaveBeenCalledTimes(2);
  }, 12000);

  it('TC-KMS-R06-006: write action stays disabled without secure API callbacks', () => {
    render(
      <AppProviders>
        <MenuManagementScreen categories={MENU_CATEGORIES_FIXTURE} items={MENU_ITEMS_R03_FIXTURE} />
      </AppProviders>,
    );
    expect(screen.getByRole('button', { name: 'Add Category' })).toBeDisabled();
  });
});
