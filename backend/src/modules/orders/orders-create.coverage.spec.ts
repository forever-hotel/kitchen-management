import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import { QueryFailedError } from 'typeorm';
import type { DataSource } from 'typeorm';

import { MenuItemStockStatus } from '../menu/enums/menu-item-stock-status.enum.js';
import { MenuItem } from '../menu/entities/menu-item.entity.js';
import { FoodOrder } from './entities/food-order.entity.js';
import { FoodOrderItem } from './entities/food-order-item.entity.js';
import { OrdersCreateService } from './orders-create.service.js';

const bookingId = 'c5a5bd87-fad8-482c-998f-e1d7e8777a4a';
const menuItemId = 'a40a5396-cce2-4050-b46b-7ff83f37c70e';
const body = {
  idempotencyKey: '6d8e0fd2-168e-4d76-a1be-819eb45f8fc2',
  bookingId,
  roomNumber: '204',
  mealPeriod: 'LUNCH',
  allergyNote: null,
  items: [{ menuItemId, quantity: 2, specialNote: null }],
};

interface Options {
  bookingStatus?: string;
  bookingRoom?: string;
  bookingFound?: boolean;
  menuFound?: boolean;
  categoryName?: string;
  categoryMissing?: boolean;
  orderingEnabled?: boolean;
  stockStatus?: MenuItemStockStatus;
  portionLimit?: number;
  unitPrice?: number;
  existingOrder?: FoodOrder | null;
  error?: unknown;
  retryOrder?: FoodOrder | null;
}

function harness(options: Options = {}) {
  const savedOrders: FoodOrder[] = [];
  const savedItems: FoodOrderItem[][] = [];
  const orderRepository = {
    findOne: async () => options.existingOrder ?? null,
    create: (values: Partial<FoodOrder>) => values as FoodOrder,
    save: async (order: FoodOrder) => {
      savedOrders.push(order);
      return order;
    },
  };
  const itemRepository = {
    create: (values: Partial<FoodOrderItem>) => values as FoodOrderItem,
    save: async (rows: FoodOrderItem[]) => {
      savedItems.push(rows);
      return rows;
    },
  };
  const menu = {
    menuItemId,
    name: 'Rice',
    price: options.unitPrice ?? 1200,
    portionLimit: options.portionLimit ?? 5,
    stockStatus: options.stockStatus ?? MenuItemStockStatus.AVAILABLE,
    category: options.categoryMissing
      ? null
      : {
          name: options.categoryName ?? 'Lunch',
          orderStartTime: '00:00:00',
          orderCutoffTime: '23:59:59',
          orderingEnabled: options.orderingEnabled ?? true,
        },
  } as MenuItem;
  const menuRepository = {
    find: async (): Promise<MenuItem[]> =>
      options.menuFound === false ? [] : [menu],
  };
  const manager = {
    query: async () =>
      options.bookingFound === false
        ? []
        : [
            {
              status: options.bookingStatus ?? 'CHECKED_IN',
              room_number: options.bookingRoom ?? '204',
            },
          ],
    getRepository: (entity: unknown) => {
      if (entity === FoodOrder) return orderRepository;
      if (entity === MenuItem) return menuRepository;
      if (entity === FoodOrderItem) return itemRepository;
      throw new Error('Unexpected repository');
    },
  };
  const datasource = {
    transaction: async (callback: (m: typeof manager) => Promise<unknown>) => {
      if (options.error) throw options.error;
      return callback(manager);
    },
    getRepository: (entity: unknown) => {
      if (entity === FoodOrder)
        return { findOne: async () => options.retryOrder ?? null };
      throw new Error('Unexpected retry repository');
    },
  } as unknown as DataSource;
  return {
    service: new OrdersCreateService(datasource),
    savedOrders,
    savedItems,
  };
}

function databaseFailure(code: string, constraint: string): QueryFailedError {
  return new QueryFailedError('INSERT', [], { code, constraint });
}

describe('Transactional food-order intake: failure and concurrent retry contracts', () => {
  beforeEach(() =>
    jest.useFakeTimers({ now: new Date('2026-11-09T07:00:00.000Z') }),
  );
  afterEach(() => jest.useRealTimers());
  it.each([
    [{ bookingFound: false }, 'Booking is not checked in'],
    [{ bookingStatus: 'CONFIRMED' }, 'Booking is not checked in'],
    [{ bookingRoom: '205' }, 'Booking is not checked in'],
  ] as const)(
    'fails closed on invalid booking context %j',
    async (options, message) => {
      const f = harness(options);
      await expect(f.service.createOrder(body)).rejects.toThrow(message);
      expect(f.savedOrders).toHaveLength(0);
    },
  );

  it('rejects menu items removed between cart creation and checkout', async () => {
    const f = harness({ menuFound: false });
    await expect(f.service.createOrder(body)).rejects.toThrow(
      NotFoundException,
    );
    expect(f.savedOrders).toHaveLength(0);
  });

  it('rejects an item belonging to a different requested meal period', async () => {
    await expect(
      harness({ categoryName: 'Dinner' }).service.createOrder(body),
    ).rejects.toThrow('requested meal period');
  });

  it('rejects a menu item whose category relation disappeared before checkout', async () => {
    await expect(
      harness({ categoryMissing: true }).service.createOrder(body),
    ).rejects.toThrow('An item does not match the requested meal period');
  });

  it('refuses orders in categories disabled by the manager', async () => {
    await expect(
      harness({ orderingEnabled: false }).service.createOrder(body),
    ).rejects.toThrow(BadRequestException);
  });

  it.each([MenuItemStockStatus.LOW_STOCK, MenuItemStockStatus.UNAVAILABLE])(
    'refuses unavailable stock %s',
    async (stockStatus) => {
      await expect(
        harness({ stockStatus }).service.createOrder(body),
      ).rejects.toThrow('unavailable');
    },
  );

  it('prevents ordering more portions than the item permits', async () => {
    await expect(
      harness({ portionLimit: 1 }).service.createOrder(body),
    ).rejects.toThrow('portion limit');
  });

  it('rejects invalid persisted prices rather than taking payment for incorrect totals', async () => {
    await expect(
      harness({ unitPrice: 0 }).service.createOrder(body),
    ).rejects.toThrow('invalid price');
  });

  it('prevents integer overflow in the authoritative order total', async () => {
    await expect(
      harness({ unitPrice: Number.MAX_SAFE_INTEGER }).service.createOrder(body),
    ).rejects.toThrow('order total is invalid');
  });

  it('re-reads the winner of a concurrent duplicate idempotency-key insert', async () => {
    const existing = {
      bookingId,
      roomNumber: '204',
      mealPeriod: 'LUNCH',
      allergyNote: null,
      items: [{ menuItemId, quantity: 2, specialNote: null }],
      totalAmount: 2400,
      status: 'PLACED',
    } as FoodOrder;
    const f = harness({
      error: databaseFailure('23505', 'kms_food_orders_pkey'),
      retryOrder: existing,
    });
    await expect(f.service.createOrder(body)).resolves.toMatchObject({
      replayed: true,
      totalAmount: 2400,
    });
  });

  it('reports a still-in-progress duplicate insert if the competing row is not visible', async () => {
    const f = harness({
      error: databaseFailure('23505', 'kms_food_orders_pkey'),
    });
    await expect(f.service.createOrder(body)).rejects.toThrow(
      ConflictException,
    );
  });

  it('maps a concurrent foreign-key deletion into a request-validation error', async () => {
    const f = harness({
      error: databaseFailure('23503', 'kms_food_order_items_menu_item_id_fkey'),
    });
    await expect(f.service.createOrder(body)).rejects.toThrow(
      'no longer valid',
    );
  });

  it('propagates unrelated database errors without concealing them as a duplicate request', async () => {
    const error = databaseFailure('08006', 'unexpected');
    await expect(harness({ error }).service.createOrder(body)).rejects.toBe(
      error,
    );
  });
});
