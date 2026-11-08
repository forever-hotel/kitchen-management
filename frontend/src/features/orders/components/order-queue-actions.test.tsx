import { render, screen } from '@testing-library/react';

import { createOrderQueueFixtures } from '../fixtures/order-queue.fixtures';
import type { KmsQueueOrder } from '../types/order-queue.types';

import { OrderQueueBoard } from './order-queue-board';

const referenceTime = new Date('2026-11-01T10:00:00.000Z');
const fixtureOrders = createOrderQueueFixtures(referenceTime);

function renderOrders(orders: readonly KmsQueueOrder[] = fixtureOrders) {
  return render(<OrderQueueBoard orders={orders} asOf={referenceTime.toISOString()} />);
}

describe('DDP-236 fixture-stage action presentation', () => {
  it('shows a disabled acknowledgement action for allergy notes', () => {
    renderOrders();

    expect(
      screen.getByRole('button', {
        name: /Acknowledge & Start unavailable for KMS-1001/,
      }),
    ).toBeDisabled();
  });

  it('shows a disabled acknowledgement action for dietary labels', () => {
    renderOrders();

    expect(
      screen.getByRole('button', {
        name: /Acknowledge & Start unavailable for KMS-1004/,
      }),
    ).toBeDisabled();
  });

  it('shows a disabled Start Preparation action for a new order without warnings', () => {
    const newOrder = fixtureOrders.find((order) => order.orderReference === 'KMS-1004');
    expect(newOrder).toBeDefined();
    renderOrders([{ ...newOrder!, dietaryLabels: [], allergyNote: null }]);

    expect(
      screen.getByRole('button', {
        name: /Start Preparation unavailable for KMS-1004/,
      }),
    ).toBeDisabled();
  });

  it('shows disabled Mark Ready for an order in preparation', () => {
    renderOrders();

    expect(
      screen.getByRole('button', { name: /Mark Ready unavailable for KMS-0998/ }),
    ).toBeDisabled();
  });

  it('shows delivery as a non-action status, never a kitchen Delivered button', () => {
    renderOrders();

    expect(screen.getByText('Awaiting delivery worker')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delivered/ })).not.toBeInTheDocument();
  });

  it('keeps the functional View details link separate from disabled actions', () => {
    renderOrders();

    expect(screen.getByRole('link', { name: 'View details for KMS-1001' })).toHaveAttribute(
      'href',
      '/order-queue/00000000-0000-4000-8000-000000001001',
    );
    expect(screen.getByText('Preparation actions are disabled in preview')).toBeInTheDocument();
  });
});
