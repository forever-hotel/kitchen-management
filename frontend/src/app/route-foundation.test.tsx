import { render, screen } from '@testing-library/react';

import { AppProviders } from '@/providers/app-providers';

import LoginPage from './(auth)/login/page';
import MenuManagementPage from './(protected)/menu-management/page';
import OrderQueuePage from './(protected)/order-queue/page';
import TimeWindowsPage from './(protected)/time-windows/page';

describe('KMS route foundation', () => {
  it('TC-KMS-SF-004: renders the public login placeholder', () => {
    render(<LoginPage />);

    expect(
      screen.getByRole('heading', {
        name: 'Kitchen Management Login',
      }),
    ).toBeInTheDocument();
  });

  it('renders the Order Queue route placeholder', () => {
    render(<OrderQueuePage />);

    expect(screen.getByRole('heading', { name: 'Order Queue' })).toBeInTheDocument();
  });

  it('renders the Menu Management local sample screen instead of the route placeholder', () => {
    render(
      <AppProviders>
        <MenuManagementPage />
      </AppProviders>,
    );

    expect(screen.getByRole('heading', { name: 'Lunch Menu' })).toBeInTheDocument();
    expect(screen.getByText('Chicken Fried Rice')).toBeInTheDocument();
    expect(
      screen.getByText('Fixture preview — sample data, not live menu records.'),
    ).toBeInTheDocument();
  });

  it('renders the Time Windows local sample screen instead of the route placeholder', () => {
    render(
      <AppProviders>
        <TimeWindowsPage />
      </AppProviders>,
    );

    expect(screen.getByRole('heading', { name: 'Ordering Time Windows' })).toBeInTheDocument();
    expect(screen.getByText('Ordering windows: 4.')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Breakfast window' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Lunch window' })).toBeInTheDocument();
  });
});
