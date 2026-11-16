import { render, screen } from '@testing-library/react';

jest.mock('../features/menu/server/menu-management.api', () => ({
  getMenuManagementSnapshot: jest.fn(),
}));

jest.mock('../features/ordering-windows/server/ordering-windows.actions', () => ({
  reloadOrderingWindows: jest.fn(),
  updateOrderingWindow: jest.fn(),
  retryOrderingWindowsPage: jest.fn(),
}));

jest.mock('../lib/auth/kms-workspace-access', () => ({
  requireKmsWorkspaceSession: jest.fn(),
  requireKmsManagerSession: jest.fn(),
}));

jest.mock('../features/orders/components/live-order-queue-screen', () => ({
  LiveOrderQueueScreen: () => (
    <div role="region" aria-label="Live kitchen queue">
      Live Order Queue
    </div>
  ),
}));

import {
  requireKmsManagerSession,
  requireKmsWorkspaceSession,
} from '../lib/auth/kms-workspace-access';
import { AppProviders } from '@/providers/app-providers';
import { getMenuManagementSnapshot } from '../features/menu/server/menu-management.api';
import { reloadOrderingWindows } from '../features/ordering-windows/server/ordering-windows.actions';
import LoginPage from './(auth)/login/page';
import MenuManagementPage from './(protected)/menu-management/page';
import OrderDetailsPage from './(protected)/order-queue/[id]/page';
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
    expect(screen.getByRole('heading', { name: 'Kitchen Management Login' })).toBeInTheDocument();
  });

  it('protects the live Order Queue with a staff session', async () => {
    const page = await OrderQueuePage();
    expect(requireKmsWorkspaceSession).toHaveBeenCalledTimes(1);
    render(page);
    expect(screen.getByRole('region', { name: 'Live kitchen queue' })).toBeInTheDocument();
  });

  it('protects Order Details and rejects invalid order IDs', async () => {
    await expect(
      OrderDetailsPage({
        params: Promise.resolve({ id: 'order-123' }),
      }),
    ).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    expect(requireKmsWorkspaceSession).toHaveBeenCalledTimes(1);
  });

  it('renders live Menu Management after manager authorization', async () => {
    jest.mocked(getMenuManagementSnapshot).mockResolvedValue({
      categories: [
        {
          categoryId: 'category-1',
          name: 'Lunch',
          orderStartTime: '11:30:00',
          orderCutoffTime: '14:30:00',
        },
      ],
      items: [
        {
          menuItemId: 'item-1',
          categoryId: 'category-1',
          name: 'Chicken Fried Rice',
          description: 'Lunch dish',
          price: 1650,
          preparationTime: 18,
          portionLimit: 4,
          stockStatus: 'LOW_STOCK',
          imageUrl: null,
          allergens: [],
          dietaryLabels: [],
        },
      ],
      lookups: { allergens: [], dietaryLabels: [] },
    });
    const page = await MenuManagementPage();
    expect(requireKmsManagerSession).toHaveBeenCalled();
    expect(getMenuManagementSnapshot).toHaveBeenCalledTimes(1);
    render(<AppProviders>{page}</AppProviders>);
    expect(screen.getByRole('heading', { name: 'Lunch Menu' })).toBeInTheDocument();
    expect(screen.getByText('Chicken Fried Rice')).toBeInTheDocument();
    expect(
      screen.queryByText('Fixture preview — sample data, not live menu records.'),
    ).not.toBeInTheDocument();
  });

  it('renders saved live windows and highlights an Edit Window deep link', async () => {
    const lunchId = '22222222-2222-4222-8222-222222222222';
    jest.mocked(reloadOrderingWindows).mockResolvedValue([
      {
        categoryId: lunchId,
        name: 'Lunch',
        orderStartTime: '11:00:00',
        orderCutoffTime: '14:30:00',
      },
      {
        categoryId: '33333333-3333-4333-8333-333333333333',
        name: 'Dinner',
        orderStartTime: '16:30:00',
        orderCutoffTime: '19:30:00',
      },
    ]);
    const page = await TimeWindowsPage({
      searchParams: Promise.resolve({ categoryId: lunchId }),
    });
    expect(requireKmsManagerSession).toHaveBeenCalled();
    expect(reloadOrderingWindows).toHaveBeenCalledTimes(1);
    render(<AppProviders>{page}</AppProviders>);
    expect(screen.getByRole('heading', { name: 'Ordering Time Windows' })).toBeInTheDocument();
    expect(screen.getByText('Ordering windows: 2.')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Dinner ordering window' })).toBeInTheDocument();
    expect(screen.getByText('Selected from Menu Management')).toBeInTheDocument();
    expect(screen.queryByText('Feature scaffold')).not.toBeInTheDocument();
  });

  it('does not invent saved meal categories when the API returns none', async () => {
    jest.mocked(reloadOrderingWindows).mockResolvedValue([]);
    const page = await TimeWindowsPage();
    render(<AppProviders>{page}</AppProviders>);
    expect(screen.getByText('Ordering windows: 0.')).toBeInTheDocument();
    expect(screen.getByText('No ordering windows available')).toBeInTheDocument();
  });
});
