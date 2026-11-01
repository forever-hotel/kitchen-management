import { render, screen } from '@testing-library/react';

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

    expect(
      screen.getByRole('heading', {
        name: 'Order Queue',
      }),
    ).toBeInTheDocument();
  });

  it('renders the Menu Management route placeholder', () => {
    render(<MenuManagementPage />);

    expect(
      screen.getByRole('heading', {
        name: 'Menu Management',
      }),
    ).toBeInTheDocument();
  });

  it('renders the Time Windows route placeholder', () => {
    render(<TimeWindowsPage />);

    expect(
      screen.getByRole('heading', {
        name: 'Ordering Time Windows',
      }),
    ).toBeInTheDocument();
  });
});
