import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { MenuItemStockStatus } from '../menu/enums/menu-item-stock-status.enum.js';
import { MenuItem } from '../menu/entities/menu-item.entity.js';
import { FoodOrder } from './entities/food-order.entity.js';
import { FoodOrderItem } from './entities/food-order-item.entity.js';
import { OrdersCreateService } from './orders-create.service.js';

const bookingId = 'c5a5bd87-fad8-482c-998f-e1d7e8777a4a';
const menuItemId = 'a40a5396-cce2-4050-b46b-7ff83f37c70e';
const payload = {
  idempotencyKey: '6d8e0fd2-168e-4d76-a1be-819eb45f8fc2',
  bookingId,
  roomNumber: '204',
  mealPeriod: 'LUNCH',
  allergyNote: null,
  items: [{ menuItemId, quantity: 2, specialNote: null }],
};

function harness(existing: FoodOrder | null = null, bookingValid = true) {
  const savedOrders: FoodOrder[] = [];
  const savedItems: FoodOrderItem[][] = [];
  const orderRepo = {
    findOne: async () => existing,
    create: (values: Partial<FoodOrder>): FoodOrder => values as FoodOrder,
    save: async (order: FoodOrder) => {
      savedOrders.push(order);
      return order;
    },
  };
  const itemRepo = {
    create: (values: Partial<FoodOrderItem>): FoodOrderItem =>
      values as FoodOrderItem,
    save: async (items: FoodOrderItem[]) => {
      savedItems.push(items);
      return items;
    },
  };
  const menuRepo = {
    find: async () => [
      {
        menuItemId,
        name: 'Rice',
        price: 1200,
        portionLimit: 5,
        stockStatus: MenuItemStockStatus.AVAILABLE,
        category: {
          name: 'Lunch',
          orderStartTime: '00:00:00',
          orderCutoffTime: '23:59:59',
        },
      } as MenuItem,
    ],
  };
  const manager = {
    query: async () =>
      bookingValid ? [{ status: 'CHECKED_IN', room_number: '204' }] : [],
    getRepository: (entity: unknown) => {
      if (entity === FoodOrder) return orderRepo;
      if (entity === FoodOrderItem) return itemRepo;
      if (entity === MenuItem) return menuRepo;
      throw new Error('Unexpected repository');
    },
  };
  const dataSource = {
    transaction: async (work: (m: typeof manager) => Promise<unknown>) =>
      work(manager),
  } as unknown as DataSource;
  return {
    service: new OrdersCreateService(dataSource),
    savedOrders,
    savedItems,
  };
}

describe('DDP-263 transactional order intake', () => {
  it('stores order header and item snapshots with a server-calculated amount', async () => {
    const { service, savedOrders, savedItems } = harness();
    const result = await service.createOrder(payload);
    expect(result).toMatchObject({
      status: 'PLACED',
      totalAmount: 2400,
      replayed: false,
    });
    expect(savedOrders).toHaveLength(1);
    expect(savedItems[0]).toEqual([
      expect.objectContaining({ name: 'Rice', quantity: 2, unitPrice: 1200 }),
    ]);
  });

  it('returns a saved order without recreating it for identical retries', async () => {
    const existing = {
      orderId: 'some-existing-id',
      bookingId,
      roomNumber: '204',
      mealPeriod: 'LUNCH',
      allergyNote: null,
      items: [{ menuItemId, quantity: 2, specialNote: null }],
      status: 'IN_PREPARATION',
      totalAmount: 2400,
    } as unknown as FoodOrder;
    const { service, savedOrders } = harness(existing);
    expect(await service.createOrder(payload)).toMatchObject({
      replayed: true,
      status: 'IN_PREPARATION',
    });
    expect(savedOrders).toHaveLength(0);
  });

  it('rejects mismatched retry payloads', async () => {
    const existing = {
      bookingId,
      roomNumber: '204',
      mealPeriod: 'LUNCH',
      allergyNote: null,
      items: [{ menuItemId, quantity: 3, specialNote: null }],
    } as FoodOrder;
    await expect(
      harness(existing).service.createOrder(payload),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects a nonexistent or inactive booking before inserting an order', async () => {
    const { service, savedOrders } = harness(null, false);
    await expect(service.createOrder(payload)).rejects.toThrow(
      BadRequestException,
    );
    expect(savedOrders).toHaveLength(0);
  });
});
