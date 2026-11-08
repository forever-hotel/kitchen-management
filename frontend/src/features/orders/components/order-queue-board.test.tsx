import { render, screen, within } from '@testing-library/react';

import { createOrderQueueFixtures } from '../fixtures/order-queue.fixtures';

import { OrderQueueBoard } from './order-queue-board';

const referenceTime = new Date('2026-11-01T10:00:00.000Z');

const fixtures = createOrderQueueFixtures(referenceTime);

function renderBoard(orders = fixtures) {
  return render(<OrderQueueBoard orders={orders} asOf={referenceTime.toISOString()} />);
}

describe('DDP-236 Order Queue board', () => {
  it('renders the three required columns', () => {
    renderBoard();

    expect(screen.getByRole('heading', { name: 'New Orders' })).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'In Preparation' })).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Ready for Delivery' })).toBeInTheDocument();
  });

  it('displays the correct order cards', () => {
    renderBoard();

    expect(screen.getByText('KMS-1001')).toBeInTheDocument();
    expect(screen.getByText('KMS-1004')).toBeInTheDocument();
    expect(screen.getByText('KMS-0998')).toBeInTheDocument();
    expect(screen.getByText('KMS-1000')).toBeInTheDocument();

    expect(screen.queryByText('KMS-0976')).not.toBeInTheDocument();
    expect(screen.queryByText('KMS-0975')).not.toBeInTheDocument();
  });

  it('shows order quantities and room information', () => {
    renderBoard();

    const order = screen.getByRole('article', {
      name: 'Order KMS-1001',
    });

    expect(within(order).getByText('Room 204')).toBeInTheDocument();

    expect(within(order).getByText('Chicken Fried Rice')).toBeInTheDocument();

    expect(within(order).getByText('4 portions')).toBeInTheDocument();
  });

  it('shows allergy and dietary indicators', () => {
    renderBoard();

    expect(screen.getByText('Allergy note')).toBeInTheDocument();
    expect(screen.getByText('VEGETARIAN')).toBeInTheDocument();
  });

  it('shows correct counters', () => {
    renderBoard();

    expect(screen.getByLabelText('2 orders')).toBeInTheDocument();

    expect(screen.getAllByLabelText('1 orders')).toHaveLength(2);
  });

  it('handles an empty queue', () => {
    renderBoard([]);

    expect(screen.getAllByText('No orders in this stage.')).toHaveLength(3);
  });

  it('provides accessible order details links', () => {
    renderBoard();

    const link = screen.getByRole('link', {
      name: 'View details for KMS-1001',
    });

    expect(link).toHaveAttribute('href', '/order-queue/00000000-0000-4000-8000-000000001001');
  });

  it('clearly identifies demonstration data', () => {
    renderBoard();

    expect(screen.getByText('Demonstration data — not live')).toBeInTheDocument();
  });
});
