import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';

import { FoodOrder } from './entities/food-order.entity.js';
import { FoodOrderItem } from './entities/food-order-item.entity.js';
import { FoodOrderMealPeriod } from './enums/food-order-meal-period.enum.js';
import { FoodOrderStatus } from './enums/food-order-status.enum.js';
import { OrdersService } from './orders.service.js';
import { FoodOrderRepository } from './repositories/food-order.repository.js';

const baseOrder = {
  orderId: '11111111-1111-4111-8111-111111111111',
  bookingId: '22222222-2222-4222-8222-222222222222',
  roomNumber: '204',
  mealPeriod: FoodOrderMealPeriod.LUNCH,
  status: FoodOrderStatus.PLACED,
  placedAt: new Date('2026-11-08T08:00:00.000Z'),
  estimatedDeliveryTime: null,
  allergyNote: 'No peanuts',
  totalAmount: 2500,
  items: [
    {
      orderItemId: '44444444-4444-4444-8444-444444444444',
      menuItemId: '55555555-5555-4555-8555-555555555555',
      name: 'Fried rice',
      quantity: 2,
      unitPrice: 1250,
      specialNote: 'No chili',
      createdAt: new Date('2026-11-08T08:01:00.000Z'),
    } as FoodOrderItem,
  ],
} as FoodOrder;

describe('OrdersService (DDP-258)', () => {
  const findQueue = jest
    .fn<
      (
        statuses: readonly FoodOrderStatus[],
        offset: number,
        limit: number,
      ) => Promise<[FoodOrder[], number]>
    >()
    .mockResolvedValue([[baseOrder], 1]);
  const findByIdWithItems = jest
    .fn<(orderId: string) => Promise<FoodOrder | null>>()
    .mockResolvedValue(baseOrder);
  const repository = {
    findQueue,
    findByIdWithItems,
  } as unknown as FoodOrderRepository;
  const service = new OrdersService(repository);

  beforeEach(() => {
    findQueue.mockReset().mockResolvedValue([[baseOrder], 1]);
    findByIdWithItems.mockReset().mockResolvedValue(baseOrder);
  });

  it('maps the active queue with item snapshots', async () => {
    const queue = await service.listQueue({ status: 'PLACED', limit: '10' });
    expect(findQueue).toHaveBeenCalledWith([FoodOrderStatus.PLACED], 0, 10);
    expect(queue).toMatchObject({ total: 1, limit: 10, offset: 0 });
    expect(queue.items[0]).toMatchObject({
      orderId: baseOrder.orderId,
      placedAt: '2026-11-08T08:00:00.000Z',
      allergyNote: 'No peanuts',
      items: [
        {
          name: 'Fried rice',
          quantity: 2,
          unitPrice: 1250,
          specialNote: 'No chili',
        },
      ],
    });
  });

  it('returns an empty queue without fake records', async () => {
    findQueue.mockResolvedValue([[], 0]);
    expect(await service.listQueue({})).toMatchObject({ items: [], total: 0 });
  });

  it('loads one order by identifier with all saved items', async () => {
    const detail = await service.getDetails(baseOrder.orderId);
    expect(findByIdWithItems).toHaveBeenCalledWith(baseOrder.orderId);
    expect(detail.items).toHaveLength(1);
    expect(detail.status).toBe(FoodOrderStatus.PLACED);
  });

  it('returns not found for an unknown order', async () => {
    findByIdWithItems.mockResolvedValue(null);
    await expect(service.getDetails(baseOrder.orderId)).rejects.toThrow(
      NotFoundException,
    );
  });
});
