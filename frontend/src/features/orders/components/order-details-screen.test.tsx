import { render, screen, within } from '@testing-library/react';

import type { KitchenOrderDetails } from '../api/order-details.contract';
const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

import { OrderDetailsScreen } from './order-details-screen';

const order: KitchenOrderDetails = {
  orderId: '00000000-0000-4000-8000-000000001001',
  bookingId: '00000000-0000-4000-8000-000000009001',
  roomNumber: '204',
  mealPeriod: 'LUNCH',
  status: 'PLACED',
  placedAt: '2026-11-08T04:00:00.000Z',
  estimatedDeliveryTime: null,
  allergyNote: 'Peanuts',
  totalAmount: 1200,
  items: [
    {
      orderItemId: '00000000-0000-4000-8000-000000002001',
      menuItemId: '00000000-0000-4000-8000-000000003001',
      name: 'Vegetable rice',
      quantity: 2,
      unitPrice: 600,
      specialNote: 'Less spicy',
    },
  ],
};

describe('DDP-259 Order Details workspace', () => {
  it('renders persisted order details, item snapshots, and back navigation', () => {
    render(<OrderDetailsScreen order={order} />);

    expect(screen.getByRole('heading', { name: 'Order Details' })).toBeInTheDocument();
    expect(screen.getAllByText('204')).toHaveLength(1);
    expect(screen.getByText('Vegetable rice')).toBeInTheDocument();
    expect(screen.getAllByText('2 portions')).toHaveLength(2);
    expect(screen.getByText(/Less spicy/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Order Queue' })).toHaveAttribute(
      'href',
      '/order-queue',
    );
    expect(screen.getByRole('link', { name: 'Open Order Queue' })).toHaveAttribute(
      'href',
      '/order-queue',
    );
  });

  it('makes the persisted allergy warning prominent', () => {
    render(<OrderDetailsScreen order={order} />);

    const warning = screen.getByRole('note', { name: 'Guest allergy warning' });
    expect(within(warning).getByText('Peanuts')).toBeInTheDocument();
    expect(within(warning).getByText(/review before preparation/i)).toBeInTheDocument();
  });

  it('shows only supported timeline data and disables unavailable operations', () => {
    render(<OrderDetailsScreen order={order} />);

    const timeline = screen.getByRole('region', { name: 'Order timeline and actions' });
    expect(within(timeline).getByText('Order placed')).toBeInTheDocument();
    expect(within(timeline).getByText('In preparation')).toBeInTheDocument();
    expect(within(timeline).getByText('Ready for delivery')).toBeInTheDocument();
    expect(within(timeline).getByRole('button', { name: 'Start preparation' })).toBeEnabled();
    expect(within(timeline).getByRole('link', { name: 'Manage print requests' })).toHaveAttribute(
      'href',
      `/order-queue/${order.orderId}/kot-preview#kot-print-jobs-heading`,
    );
    expect(screen.queryByText('KOT printed')).not.toBeInTheDocument();
  });

  it('does not invent missing allergy or estimated delivery information', () => {
    render(<OrderDetailsScreen order={{ ...order, allergyNote: null, items: [] }} />);

    expect(screen.getByText('Not available')).toBeInTheDocument();
    expect(screen.getByText(/does not guarantee an allergen-free meal/i)).toBeInTheDocument();
    expect(screen.getByText(/No stored line items are available/i)).toBeInTheDocument();
  });

  it('marks preparation as current for an in-progress order without adding timestamps', () => {
    render(<OrderDetailsScreen order={{ ...order, status: 'IN_PREPARATION' }} />);

    const timeline = screen.getByRole('region', { name: 'Order timeline and actions' });
    expect(within(timeline).getByText('In preparation')).toBeInTheDocument();
    expect(within(timeline).getByText('Current status')).toBeInTheDocument();
    expect(within(timeline).getByRole('button', { name: 'Mark ready' })).toBeEnabled();
  });

  it('does not show an invalid next action for cancelled orders', () => {
    render(<OrderDetailsScreen order={{ ...order, status: 'CANCELLED' }} />);

    const timeline = screen.getByRole('region', { name: 'Order timeline and actions' });
    expect(within(timeline).getByText('Cancelled')).toBeInTheDocument();
    expect(within(timeline).queryByRole('button', { name: 'Mark ready' })).not.toBeInTheDocument();
    expect(within(timeline).queryByRole('button', { name: /start prep/i })).not.toBeInTheDocument();
  });
});
