import { render, screen, within } from '@testing-library/react';

import type { KotPreview } from '../api/kot-preview.contract';
import { KotTicketPreview } from './kot-ticket-preview';

const ticket: KotPreview = {
  mode: 'PREVIEW_ONLY',
  orderId: '11111111-1111-4111-8111-111111111111',
  roomNumber: '204',
  mealPeriod: 'LUNCH',
  status: 'IN_PREPARATION',
  placedAt: '2026-11-08T04:00:00.000Z',
  allergyNote: 'No peanuts',
  items: [
    {
      orderItemId: '22222222-2222-4222-8222-222222222222',
      name: 'Vegetable rice',
      quantity: 2,
      specialNote: 'No chili',
    },
    {
      orderItemId: '33333333-3333-4333-8333-333333333333',
      name: 'Soup',
      quantity: 1,
      specialNote: null,
    },
  ],
};

describe('DDP-265 KOT ticket preview', () => {
  it('shows each item snapshot, quantity, special instruction and allergy note', () => {
    render(<KotTicketPreview ticket={ticket} />);
    expect(screen.getByRole('heading', { name: 'Kitchen Order Ticket' })).toBeInTheDocument();
    expect(screen.getByText('Vegetable rice')).toBeInTheDocument();
    expect(screen.getByText('Soup')).toBeInTheDocument();
    expect(screen.getByText('No chili')).toBeInTheDocument();
    const warning = screen.getByRole('note', { name: 'Guest allergy warning' });
    expect(within(warning).getByText(/No peanuts/)).toBeInTheDocument();
    expect(screen.getByText(/204/)).toBeInTheDocument();
    expect(screen.getByText(/11111111-1111-4111-8111-111111111111/)).toBeInTheDocument();
  });

  it('never claims printing succeeded and disables unsupported job requests', () => {
    render(<KotTicketPreview ticket={ticket} />);
    expect(screen.getByText('PREVIEW ONLY')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Request KOT print job unavailable/i }),
    ).toBeDisabled();
    expect(screen.queryByText('Printed successfully')).not.toBeInTheDocument();
  });

  it('does not insert fabricated allergy or item data', () => {
    render(<KotTicketPreview ticket={{ ...ticket, items: [], allergyNote: null }} />);
    expect(screen.getByText(/No stored items are available/i)).toBeInTheDocument();
    expect(screen.getByText(/Do not assume allergen-free preparation/i)).toBeInTheDocument();
  });

  it('renders special instructions as text, never as executable markup', () => {
    render(
      <KotTicketPreview
        ticket={{
          ...ticket,
          items: [{ ...ticket.items[0], specialNote: '<script>alert(1)</script>' }],
        }}
      />,
    );
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Kitchen order ticket preview' }).querySelector('script'),
    ).toBeNull();
  });
});
