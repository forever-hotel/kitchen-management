import { parseKotPreview } from './kot-preview.contract';

const ticket = {
  mode: 'PREVIEW_ONLY',
  orderId: '11111111-1111-4111-8111-111111111111',
  roomNumber: '204',
  mealPeriod: 'LUNCH',
  status: 'PLACED',
  placedAt: '2026-11-08T04:00:00.000Z',
  allergyNote: 'No peanuts',
  items: [
    {
      orderItemId: '22222222-2222-4222-8222-222222222222',
      name: 'Rice',
      quantity: 2,
      specialNote: 'Mild',
    },
  ],
};

describe('DDP-265 KOT preview API contract', () => {
  it('accepts saved order snapshots but does not infer a print-job state', () => {
    expect(parseKotPreview(ticket)).toMatchObject({ orderId: ticket.orderId, items: ticket.items });
    expect(parseKotPreview(ticket)).not.toHaveProperty('printed');
  });
  it('rejects unapproved physical print success claims', () => {
    expect(() => parseKotPreview({ ...ticket, mode: 'PRINTED' })).toThrow();
  });
  it('rejects missing or invalid item snapshots', () => {
    expect(() => parseKotPreview({ ...ticket, items: [{ name: 'Rice', quantity: 0 }] })).toThrow();
  });
  it('supports absent optional notes', () => {
    expect(parseKotPreview({ ...ticket, allergyNote: null, items: [] })).toMatchObject({
      allergyNote: null,
      items: [],
    });
  });
});
