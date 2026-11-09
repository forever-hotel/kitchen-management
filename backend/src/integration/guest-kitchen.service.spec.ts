import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OrdersCreateService } from '../modules/orders/orders-create.service.js';
import { GuestKitchenService } from './guest-kitchen.service.js';

function fixture(status = 'PLACED', age = 1000) {
  const row = {
    orderId: 'order',
    bookingId: 'booking',
    roomNumber: '101',
    status,
    totalAmount: 125050,
    allergyNote: null,
    placedAt: new Date(Date.now() - age),
    updatedAt: new Date(),
    items: [
      {
        menuItemId: 'item',
        name: 'Rice',
        quantity: 1,
        unitPrice: 125050,
        specialNote: null,
      },
    ],
  };
  const repository = {
    findOne: jest.fn<() => Promise<unknown>>().mockResolvedValue(row),
    save: jest.fn<() => Promise<unknown>>().mockResolvedValue(row),
  };
  const query = jest
    .fn<() => Promise<unknown[]>>()
    .mockResolvedValue([{ now: new Date() }]);
  const manager = { getRepository: () => repository, query };
  const database = {
    getRepository: () => repository,
    query,
    transaction: async (work: (value: typeof manager) => Promise<unknown>) =>
      work(manager),
  } as unknown as DataSource;
  const intake = {
    createOrder: jest
      .fn<() => Promise<unknown>>()
      .mockResolvedValue({ orderId: 'order' }),
  };
  return {
    service: new GuestKitchenService(
      database,
      intake as unknown as OrdersCreateService,
    ),
    row,
    repository,
    query,
    intake,
  };
}

describe('FOSS kitchen contract', () => {
  it('exposes real menu prices in LKR rupees with authoritative ordering windows and allergens', async () => {
    const f = fixture();
    f.query.mockResolvedValue([
      {
        menu_item_id: 'item',
        name: 'Rice',
        price: 125050,
        category: 'Lunch',
        stock_status: 'AVAILABLE',
        order_start_time: '12:00:00',
        order_cutoff_time: '15:00:00',
        ordering_enabled: false,
        allergens: ['Peanuts'],
        dietary_flags: [],
      },
    ]);
    const menu = await f.service.menu('LUNCH');
    expect(menu.items[0]).toMatchObject({
      price: 1250.5,
      mealPeriods: ['LUNCH'],
      allergens: ['Peanuts'],
      orderingWindow: { enabled: false, startTime: '12:00:00' },
    });
    await expect(f.service.menu('INVALID')).rejects.toThrow();
  });

  it('delegates creation to authoritative intake and returns persisted item prices', async () => {
    const f = fixture();
    const input = { idempotencyKey: 'random-key' };
    expect(await f.service.create(input)).toMatchObject({
      totalAmount: 1250.5,
      items: [{ unitPrice: 1250.5 }],
    });
    expect(f.intake.createOrder).toHaveBeenCalledWith(input);
  });

  it('locks the canonical order before cancellation and uses the database clock', async () => {
    const f = fixture();
    await f.service.cancel('order');
    expect(f.repository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
    expect(f.repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'CANCELLED' }),
    );
    expect(f.query).toHaveBeenCalledWith(
      expect.stringContaining('cancelled_at'),
      ['order'],
    );
  });

  it.each(['IN_PREPARATION', 'READY', 'DELIVERED'])(
    'rejects cancellation after %s',
    async (status) => {
      const f = fixture(status);
      await expect(f.service.cancel('order')).rejects.toThrow(
        ConflictException,
      );
      expect(f.repository.save).not.toHaveBeenCalled();
    },
  );

  it('rejects cancellation at the ten-minute boundary and handles missing orders', async () => {
    const f = fixture('PLACED', 600000);
    await expect(f.service.cancel('order')).rejects.toThrow(ConflictException);
    f.repository.findOne.mockResolvedValue(null);
    await expect(f.service.order('missing')).rejects.toThrow(NotFoundException);
  });
});
