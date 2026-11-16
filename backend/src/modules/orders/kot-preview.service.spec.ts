import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';

import { FoodOrderMealPeriod } from './enums/food-order-meal-period.enum.js';
import { FoodOrderStatus } from './enums/food-order-status.enum.js';
import { KotPreviewService } from './kot-preview.service.js';
import { OrdersService } from './orders.service.js';

const id = '11111111-1111-4111-8111-111111111111';
const order = {
  orderId: id,
  bookingId: '22222222-2222-4222-8222-222222222222',
  roomNumber: '204',
  mealPeriod: FoodOrderMealPeriod.LUNCH,
  status: FoodOrderStatus.IN_PREPARATION,
  placedAt: '2026-11-08T04:00:00.000Z',
  estimatedDeliveryTime: null,
  allergyNote: 'No peanuts',
  totalAmount: 3000,
  items: [
    {
      orderItemId: '33333333-3333-4333-8333-333333333333',
      menuItemId: '44444444-4444-4444-8444-444444444444',
      name: 'Rice & vegetables',
      quantity: 2,
      unitPrice: 1000,
      specialNote: '<script>alert(1)</script>',
    },
    {
      orderItemId: '55555555-5555-4555-8555-555555555555',
      menuItemId: '66666666-6666-4666-8666-666666666666',
      name: 'Soup',
      quantity: 1,
      unitPrice: 1000,
      specialNote: null,
    },
  ],
};

describe('DDP-265 KOT preview service', () => {
  const getDetails = jest.fn<OrdersService['getDetails']>();
  const service = new KotPreviewService({
    getDetails,
  } as unknown as OrdersService);

  beforeEach(() => {
    getDetails.mockReset().mockResolvedValue(order);
  });

  it('reuses persisted item snapshots without writing to the order', async () => {
    const result = await service.preview(id);
    expect(getDetails).toHaveBeenCalledWith(id);
    expect(result.mode).toBe('PREVIEW_ONLY');
    expect(result).toMatchObject({
      orderId: id,
      roomNumber: '204',
      status: FoodOrderStatus.IN_PREPARATION,
      allergyNote: 'No peanuts',
      items: [
        {
          name: 'Rice & vegetables',
          quantity: 2,
          specialNote: '<script>alert(1)</script>',
        },
        { name: 'Soup', quantity: 1, specialNote: null },
      ],
    });
    expect(result).not.toHaveProperty('printJobId');
    expect(order.items[0].name).toBe('Rice & vegetables');
  });

  it('keeps optional notes nullable without creating false information', async () => {
    getDetails.mockResolvedValue({ ...order, allergyNote: null, items: [] });
    await expect(service.preview(id)).resolves.toMatchObject({
      allergyNote: null,
      items: [],
    });
  });

  it('preserves not-found errors for unknown food orders', async () => {
    getDetails.mockRejectedValue(new NotFoundException('Food order not found'));
    await expect(service.preview(id)).rejects.toThrow(NotFoundException);
  });
});
