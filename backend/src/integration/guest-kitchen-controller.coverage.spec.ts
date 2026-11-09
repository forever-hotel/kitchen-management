import { NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';

import { GuestKitchenController } from './guest-kitchen.controller.js';
import type { GuestKitchenService } from './guest-kitchen.service.js';

const orderId = '33333333-3333-4333-8333-333333333333';

function harness() {
  const menu = jest.fn(async () => ({ items: [], currency: 'LKR' }));
  const create = jest.fn(async () => ({ orderId }));
  const order = jest.fn(async () => ({ orderId, status: 'PLACED' }));
  const cancel = jest.fn(async () => ({ orderId, status: 'CANCELLED' }));
  const controller = new GuestKitchenController({
    menu,
    create,
    order,
    cancel,
  } as unknown as GuestKitchenService);
  return { controller, menu, create, order, cancel };
}

describe('Guest-to-kitchen server contract routing', () => {
  it('lists the full menu when no optional meal period is selected', async () => {
    const f = harness();
    await expect(f.controller.menu()).resolves.toMatchObject({
      currency: 'LKR',
    });
    expect(f.menu).toHaveBeenCalledWith(undefined);
  });

  it('passes the requested meal period to the validated guest menu service', async () => {
    const f = harness();
    await f.controller.menu('TEA_TIME');
    expect(f.menu).toHaveBeenCalledWith('TEA_TIME');
  });

  it('creates orders using the original request body', async () => {
    const f = harness();
    const body = { bookingId: 'booking-id', items: [] };
    await expect(f.controller.create(body)).resolves.toEqual({ orderId });
    expect(f.create).toHaveBeenCalledWith(body);
  });

  it('reads and cancels only the requested order identifier', async () => {
    const f = harness();
    await expect(f.controller.order(orderId)).resolves.toMatchObject({
      status: 'PLACED',
    });
    await expect(f.controller.cancel(orderId)).resolves.toMatchObject({
      status: 'CANCELLED',
    });
    expect(f.order).toHaveBeenCalledWith(orderId);
    expect(f.cancel).toHaveBeenCalledWith(orderId);
  });

  it('preserves unknown-order errors from the guest service', async () => {
    const f = harness();
    f.order.mockRejectedValueOnce(
      new NotFoundException('Food order not found'),
    );
    await expect(f.controller.order(orderId)).rejects.toThrow(
      NotFoundException,
    );
  });
});
