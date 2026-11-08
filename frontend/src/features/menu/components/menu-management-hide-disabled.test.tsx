import { fireEvent, render, screen, within } from '@testing-library/react';

import { AppProviders } from '@/providers/app-providers';
import type { KmsMealCategoryData } from '@/types/kms-menu';

import { MenuManagementScreen } from './menu-management-screen';

const breakfastId = '11111111-1111-4111-8111-111111111111';
const lunchId = '22222222-2222-4222-8222-222222222222';
const categories: KmsMealCategoryData[] = [
  {
    categoryId: breakfastId,
    name: 'Breakfast',
    orderStartTime: '06:30:00',
    orderCutoffTime: '09:30:00',
    orderingEnabled: false,
  },
  {
    categoryId: lunchId,
    name: 'Lunch',
    orderStartTime: '11:00:00',
    orderCutoffTime: '14:30:00',
    orderingEnabled: true,
  },
];

function show(values: KmsMealCategoryData[] = categories) {
  return render(
    <AppProviders>
      <MenuManagementScreen categories={values} items={[]} dataMode="api" />
    </AppProviders>,
  );
}

describe('DDP-268: hide disabled categories only from Menu Management', () => {
  it('hides disabled categories from sidebar while keeping enabled ones accessible', () => {
    show();
    const sidebar = screen.getByRole('group', { name: 'Select meal category' });
    expect(within(sidebar).queryByRole('button', { name: /Breakfast/ })).not.toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: /Lunch/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lunch Menu' })).toBeInTheDocument();
  });

  it('shows an actionable empty state if all live categories are disabled', () => {
    show([categories[0]]);
    expect(
      screen.getByText('All meal categories are disabled. Re-enable a category in Time Windows.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Manage in Time Windows' })).toHaveAttribute(
      'href',
      '/time-windows',
    );
  });

  it('shows a category again as soon as live data reports it enabled', () => {
    const view = show();
    const enabled = categories.map((category) =>
      category.categoryId === breakfastId ? { ...category, orderingEnabled: true } : category,
    );
    view.rerender(
      <AppProviders>
        <MenuManagementScreen categories={enabled} items={[]} dataMode="api" />
      </AppProviders>,
    );
    const sidebar = screen.getByRole('group', { name: 'Select meal category' });
    const breakfast = within(sidebar).getByRole('button', { name: /Breakfast/ });
    fireEvent.click(breakfast);
    expect(screen.getByRole('heading', { name: 'Breakfast Menu' })).toBeInTheDocument();
  });

  it('keeps the fixture preview unchanged, and treats absent flags as enabled', () => {
    const view = render(
      <AppProviders>
        <MenuManagementScreen categories={categories} items={[]} dataMode="fixtures" />
      </AppProviders>,
    );
    expect(screen.getByRole('button', { name: /Breakfast/ })).toBeInTheDocument();
    view.rerender(
      <AppProviders>
        <MenuManagementScreen
          categories={[{ ...categories[0], orderingEnabled: undefined }]}
          items={[]}
          dataMode="api"
        />
      </AppProviders>,
    );
    expect(screen.getByRole('button', { name: /Breakfast/ })).toBeInTheDocument();
  });
});
