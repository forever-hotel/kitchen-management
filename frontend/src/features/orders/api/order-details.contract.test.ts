import { parseKitchenOrderDetails } from './order-details.contract';

const savedOrder = {
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

describe('DDP-259 order details response contract', () => {
  it('preserves backend order fields and line-item price snapshots', () => {
    const result = parseKitchenOrderDetails(savedOrder);
    expect(result.orderId).toBe(savedOrder.orderId);
    expect(result.items[0]).toMatchObject({
      name: 'Vegetable rice',
      quantity: 2,
      unitPrice: 600,
      specialNote: 'Less spicy',
    });
  });

  it('rejects incorrect status and incomplete records', () => {
    expect(() => parseKitchenOrderDetails({ ...savedOrder, status: 'SENT' })).toThrow();
    expect(() => parseKitchenOrderDetails({ ...savedOrder, items: undefined })).toThrow();
  });

  it('rejects nonnumeric or negative amounts and malformed items', () => {
    expect(() => parseKitchenOrderDetails({ ...savedOrder, totalAmount: '1200' })).toThrow();
    expect(() => parseKitchenOrderDetails({ ...savedOrder, totalAmount: -1 })).toThrow();
    expect(() =>
      parseKitchenOrderDetails({ ...savedOrder, items: [{ ...savedOrder.items[0], quantity: 0 }] }),
    ).toThrow();
  });

  it('handles no estimated delivery time and no special note', () => {
    const result = parseKitchenOrderDetails({
      ...savedOrder,
      allergyNote: null,
      items: [{ ...savedOrder.items[0], specialNote: null }],
    });
    expect(result.estimatedDeliveryTime).toBeNull();
    expect(result.allergyNote).toBeNull();
    expect(result.items[0].specialNote).toBeNull();
  });
});
