import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentProps } from 'react';

import { AppProviders } from '@/providers/app-providers';
import type { KmsMealCategoryData } from '@/types/kms-menu';

import { OrderingWindowsScreen } from './ordering-windows-screen';

const lunchId = '22222222-2222-4222-8222-222222222222';
const dinnerId = '33333333-3333-4333-8333-333333333333';
const categories: KmsMealCategoryData[] = [
  {
    categoryId: lunchId,
    name: 'DEMO Lunch',
    orderStartTime: '11:00:00',
    orderCutoffTime: '14:30:00',
  },
  { categoryId: dinnerId, name: 'Dinner', orderStartTime: '16:30:00', orderCutoffTime: '19:30:00' },
];
const now = new Date('2026-11-08T07:00:00Z');

function screenWith(
  categories: KmsMealCategoryData[],
  extra: Partial<ComponentProps<typeof OrderingWindowsScreen>> = {},
) {
  return render(
    <AppProviders>
      <OrderingWindowsScreen
        windows={categories}
        categories={categories}
        dataMode="api"
        now={now}
        {...extra}
      />
    </AppProviders>,
  );
}

describe('DDP-267 live category synchronization', () => {
  it('does not display fictional categories when the database list is empty', () => {
    screenWith([]);
    expect(screen.getByText('Ordering windows: 0.')).toBeInTheDocument();
    expect(screen.getByText('No ordering windows available')).toBeInTheDocument();
    expect(screen.queryByText('Feature scaffold')).not.toBeInTheDocument();
  });

  it('renders all real categories, not only the four Figma sample names', () => {
    const five = [
      ...categories,
      {
        categoryId: '44444444-4444-4444-8444-444444444444',
        name: 'Brunch',
        orderStartTime: '09:00:00',
        orderCutoffTime: '11:00:00',
      },
      {
        categoryId: '55555555-5555-4555-8555-555555555555',
        name: 'Special Meals',
        orderStartTime: '12:00:00',
        orderCutoffTime: '15:00:00',
      },
      {
        categoryId: '66666666-6666-4666-8666-666666666666',
        name: 'Late Snack',
        orderStartTime: '20:00:00',
        orderCutoffTime: '22:00:00',
      },
    ];
    screenWith(five);
    expect(screen.getByText('Ordering windows: 5.')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Late Snack ordering window' })).toBeInTheDocument();
    expect(
      screen.getByRole('article', { name: 'Special Meals ordering window' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Feature scaffold')).not.toBeInTheDocument();
  });

  it('identifies the category selected from Menu Management', () => {
    screenWith(categories, { selectedCategoryId: dinnerId });
    const card = screen.getByRole('article', { name: 'Dinner ordering window' });
    expect(within(card).getByText('Selected from Menu Management')).toBeInTheDocument();
    expect(within(card).getByLabelText('Dinner start time')).toHaveValue('16:30');
  });

  it('refreshes categories added elsewhere and displays their actual names', async () => {
    const added = {
      categoryId: '77777777-7777-4777-8777-777777777777',
      name: 'Tea & Snacks',
      orderStartTime: '15:00:00',
      orderCutoffTime: '17:00:00',
    };
    const onReloadWindows = jest.fn(async () => [...categories, added]);
    const onUpdateWindow = jest.fn(async () => undefined);
    screenWith(categories, { onReloadWindows, onUpdateWindow });
    fireEvent.click(screen.getByRole('button', { name: 'Refresh windows' }));
    await waitFor(() => expect(screen.getByText('Ordering windows: 3.')).toBeInTheDocument());
    expect(
      screen.getByRole('article', { name: 'Tea & Snacks ordering window' }),
    ).toBeInTheDocument();
    expect(onReloadWindows).toHaveBeenCalledTimes(1);
  });
});
