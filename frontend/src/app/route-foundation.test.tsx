import { render, screen } from '@testing-library/react';

jest.mock('../lib/auth/kms-workspace-access', () => ({
  requireKmsWorkspaceSession: jest.fn(),
  requireKmsManagerSession: jest.fn(),
}));

import {
  requireKmsManagerSession,
  requireKmsWorkspaceSession,
} from '../lib/auth/kms-workspace-access';

import LoginPage from './(auth)/login/page';
import MenuManagementPage from './(protected)/menu-management/page';
import OrderQueuePage from './(protected)/order-queue/page';
import TimeWindowsPage from './(protected)/time-windows/page';

const managerSession = {
  sub: 'manager-123',
  username: 'chef.manager',
  role: 'KITCHEN_MANAGER' as const,
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
  passwordChangeRequired: false,
};

describe('KMS route foundation', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.mocked(requireKmsWorkspaceSession).mockResolvedValue(managerSession);

    jest.mocked(requireKmsManagerSession).mockResolvedValue(managerSession);
  });

  it('renders the public login form', () => {
    render(<LoginPage />);

    expect(
      screen.getByRole('heading', {
        name: 'Kitchen Management Login',
      }),
    ).toBeInTheDocument();
  });

  it('renders the protected Order Queue page', async () => {
    render(await OrderQueuePage());

    expect(requireKmsWorkspaceSession).toHaveBeenCalledTimes(1);

    expect(
      screen.getByRole('heading', {
        name: 'Order Queue',
      }),
    ).toBeInTheDocument();
  });

  it('renders Menu Management after manager authorization', async () => {
    render(await MenuManagementPage());

    expect(requireKmsManagerSession).toHaveBeenCalledTimes(1);

    expect(
      screen.getByRole('heading', {
        name: 'Menu Management',
      }),
    ).toBeInTheDocument();
  });

  it('renders Time Windows after manager authorization', async () => {
    render(await TimeWindowsPage());

    expect(requireKmsManagerSession).toHaveBeenCalledTimes(1);

    expect(
      screen.getByRole('heading', {
        name: 'Ordering Time Windows',
      }),
    ).toBeInTheDocument();
  });
});
