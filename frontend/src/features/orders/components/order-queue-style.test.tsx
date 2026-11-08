import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';

import { createOrderQueueFixtures } from '../fixtures/order-queue.fixtures';

import { OrderQueueBoard } from './order-queue-board';

const asOf = new Date('2026-11-01T10:00:00.000Z');
const orders = createOrderQueueFixtures(asOf);

describe('DDP-236 Figma-aligned action styling and explicit escalation preview', () => {
  it('renders the neutral card in server HTML before client-only demo escalation is applied', () => {
    const html = renderToString(
      <OrderQueueBoard
        orders={orders}
        asOf={asOf.toISOString()}
        escalatedOrderReferences={['KMS-1001']}
      />,
    );

    expect(html).toContain('Order KMS-1001');
    expect(html).not.toContain('aria-label="Escalated order"');
    expect(html).not.toContain('escalatedCard');
  });

  it('marks an explicitly flagged new order as escalated', () => {
    render(
      <OrderQueueBoard
        orders={orders}
        asOf={asOf.toISOString()}
        escalatedOrderReferences={['KMS-1001']}
      />,
    );

    const card = screen.getByRole('article', { name: 'Order KMS-1001, escalated' });
    expect(card).toHaveClass('escalatedCard');
    expect(card).toHaveTextContent('Escalated');
    expect(
      screen.getByRole('button', { name: /Acknowledge & Start unavailable for KMS-1001/ }),
    ).toHaveClass('previewActionButton');
  });

  it('uses the standard navy treatment for a non-escalated acknowledgement action', () => {
    render(<OrderQueueBoard orders={orders} asOf={asOf.toISOString()} />);
    expect(
      screen.getByRole('button', { name: /Acknowledge & Start unavailable for KMS-1001/ }),
    ).toHaveClass('previewActionButton');
    expect(screen.queryByLabelText('Escalated order')).not.toBeInTheDocument();
  });

  it('uses green for Mark Ready while keeping buttons disabled', () => {
    render(<OrderQueueBoard orders={orders} asOf={asOf.toISOString()} />);
    const button = screen.getByRole('button', { name: /Mark Ready unavailable for KMS-0998/ });
    expect(button).toBeDisabled();
    expect(button).toHaveClass('previewActionButton');
  });

  it('does not apply escalation to an order outside the New lane', () => {
    render(
      <OrderQueueBoard
        orders={orders}
        asOf={asOf.toISOString()}
        escalatedOrderReferences={['KMS-0998']}
      />,
    );
    expect(screen.queryByLabelText('Escalated order')).not.toBeInTheDocument();
  });

  it('preserves the independent details link on an escalated order', () => {
    render(
      <OrderQueueBoard
        orders={orders}
        asOf={asOf.toISOString()}
        escalatedOrderReferences={['KMS-1001']}
      />,
    );
    expect(screen.getByRole('link', { name: 'View details for KMS-1001' })).toHaveAttribute(
      'href',
      '/order-queue/00000000-0000-4000-8000-000000001001',
    );
  });
});
