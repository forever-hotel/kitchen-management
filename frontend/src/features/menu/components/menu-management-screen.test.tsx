import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';

import { AppProviders } from '@/providers/app-providers';

import { MENU_CATEGORIES_FIXTURE } from '../../../../tests/fixtures/kms-menu.fixture';
import { MENU_ITEMS_R03_FIXTURE } from '../../../../tests/fixtures/kms-menu-r03.fixture';
import { MenuManagementScreen } from '..';

function renderMenu(overrides: Partial<ComponentProps<typeof MenuManagementScreen>> = {}) {
  return render(
    <AppProviders>
      <MenuManagementScreen
        categories={MENU_CATEGORIES_FIXTURE}
        items={MENU_ITEMS_R03_FIXTURE}
        {...overrides}
      />
    </AppProviders>,
  );
}

describe('R-01 and R-03 menu management screen', () => {
  it('TC-KMS-R01-04: renders the manager menu entry with all fixture categories', () => {
    renderMenu();

    expect(screen.getByRole('heading', { name: 'Lunch Menu' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Select meal category' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Breakfast|Lunch|Tea-Time|Dinner/ })).toHaveLength(
      4,
    );
    expect(
      screen.getByText('Fixture preview — sample data, not live menu records.'),
    ).toBeInTheDocument();
  });

  it('TC-KMS-R03-001: category selection updates title, correct rows and category counts', () => {
    renderMenu();

    expect(screen.getByText('Chicken Fried Rice')).toBeInTheDocument();
    expect(screen.queryByText('Sri Lankan Breakfast Plate')).not.toBeInTheDocument();

    const breakfast = screen.getByRole('button', { name: /Breakfast/ });
    breakfast.focus();
    expect(breakfast).toHaveFocus();
    fireEvent.click(breakfast);

    expect(breakfast).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Breakfast Menu' })).toBeInTheDocument();
    expect(screen.getByText('Sri Lankan Breakfast Plate')).toBeInTheDocument();
    expect(screen.queryByText('Chicken Fried Rice')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1 of 1 items')).toBeInTheDocument();
  });

  it('TC-KMS-R03-002: stock tabs and search filter only the selected category', () => {
    renderMenu();

    const stockFilters = screen.getByRole('group', { name: 'Filter by stock status' });
    expect(within(stockFilters).getByRole('button', { name: 'All (1)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(within(stockFilters).getByRole('button', { name: 'Available (0)' }));
    expect(screen.getByText('No menu items match these filters')).toBeInTheDocument();

    fireEvent.click(within(stockFilters).getByRole('button', { name: 'Low Stock (1)' }));
    expect(screen.getByText('Chicken Fried Rice')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Search menu items' }), {
      target: { value: 'does not exist' },
    });
    expect(screen.getByText('No menu items match these filters')).toBeInTheDocument();
  });

  it('TC-KMS-R03-003: shows a loading state without showing stale menu rows', () => {
    renderMenu({ loadState: 'loading' });

    expect(screen.getByRole('status')).toHaveTextContent('Loading menu items...');
    expect(screen.queryByText('Chicken Fried Rice')).not.toBeInTheDocument();
  });

  it('TC-KMS-R03-004: empty categories and empty selected menu show useful messages', () => {
    const { rerender } = renderMenu({ categories: [] });
    expect(screen.getByText('No meal categories available')).toBeInTheDocument();

    rerender(
      <AppProviders>
        <MenuManagementScreen categories={MENU_CATEGORIES_FIXTURE} items={[]} />
      </AppProviders>,
    );
    expect(screen.getByText('No menu items in this category yet')).toBeInTheDocument();
  });

  it('TC-KMS-R03-005: an error explains the failure and Retry calls its handler', () => {
    const onRetry = jest.fn();
    renderMenu({ loadState: 'error', errorMessage: 'Connection interrupted', onRetry });

    expect(screen.getByText('Menu could not be loaded')).toBeInTheDocument();
    expect(screen.getByText('Connection interrupted')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('TC-KMS-R03-006: action callbacks receive the selected category and item', () => {
    const onAddCategory = jest.fn();
    const onAddMenuItem = jest.fn();
    const onEditItem = jest.fn();
    const onEditWindow = jest.fn();

    renderMenu({ onAddCategory, onAddMenuItem, onEditItem, onEditWindow });

    fireEvent.click(screen.getByRole('button', { name: 'Add Category' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Menu Item' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Window' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Chicken Fried Rice' }));

    expect(onAddCategory).toHaveBeenCalledTimes(1);
    expect(onAddMenuItem).toHaveBeenCalledWith(MENU_CATEGORIES_FIXTURE[1].categoryId);
    expect(onEditWindow).toHaveBeenCalledWith(MENU_CATEGORIES_FIXTURE[1].categoryId);
    expect(onEditItem).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Chicken Fried Rice' }),
    );
  });

  it('TC-KMS-R03-007: unavailable edit/add actions stay disabled until implemented', () => {
    renderMenu();

    expect(screen.getByRole('button', { name: 'Add Menu Item' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit Chicken Fried Rice' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add Category' })).toBeDisabled();
  });
});
