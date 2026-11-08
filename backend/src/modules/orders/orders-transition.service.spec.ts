import { ConflictException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import type { DataSource, EntityManager } from 'typeorm';

import { AllergySafetyService } from './allergy-safety.service.js';
import { FoodOrder } from './entities/food-order.entity.js';
import { FoodOrderStatus } from './enums/food-order-status.enum.js';
import { OrdersTransitionService } from './orders-transition.service.js';

const orderId = '11111111-1111-4111-8111-111111111111';

describe('DDP-261 transactional order status transitions', () => {
  let order: FoodOrder | null;
  const findOne = jest.fn<(...args: unknown[]) => Promise<FoodOrder | null>>();
  const save = jest.fn<(...args: unknown[]) => Promise<FoodOrder>>();
  const safetyCheck = jest.fn<(...args: unknown[]) => Promise<void>>();
  const repository = { findOne, save };
  const manager = {
    getRepository: jest.fn(() => repository),
  } as unknown as EntityManager;
  const transaction =
    jest.fn<
      (
        fn: (transactionManager: EntityManager) => Promise<unknown>,
      ) => Promise<unknown>
    >();
  const dataSource = { transaction } as unknown as DataSource;
  const safety = {
    assertReadyToPrepare: safetyCheck,
  } as unknown as AllergySafetyService;
  const service = new OrdersTransitionService(dataSource, safety);

  beforeEach(() => {
    order = { orderId, status: FoodOrderStatus.PLACED } as FoodOrder;
    findOne.mockReset().mockImplementation(async () => order);
    save.mockReset().mockImplementation(async (value) => value as FoodOrder);
    safetyCheck.mockReset().mockResolvedValue(undefined);
    transaction.mockReset().mockImplementation(async (fn) => fn(manager));
  });

  it('locks the order and checks allergy safety before starting preparation', async () => {
    const response = await service.startPreparation(orderId);
    expect(response).toEqual({
      orderId,
      previousStatus: FoodOrderStatus.PLACED,
      status: FoodOrderStatus.IN_PREPARATION,
      changed: true,
    });
    expect(findOne).toHaveBeenCalledWith({
      where: { orderId },
      lock: { mode: 'pessimistic_write' },
    });
    expect(safetyCheck).toHaveBeenCalledWith(manager, order);
    expect(save).toHaveBeenCalledTimes(1);
    expect(order?.status).toBe(FoodOrderStatus.IN_PREPARATION);
  });

  it('blocks unacknowledged orders and rolls back without writing', async () => {
    safetyCheck.mockRejectedValueOnce(
      new ConflictException('Acknowledgement required'),
    );
    await expect(service.startPreparation(orderId)).rejects.toThrow(
      ConflictException,
    );
    expect(save).not.toHaveBeenCalled();
    expect(order?.status).toBe(FoodOrderStatus.PLACED);
  });

  it('allows an already prepared order to become READY', async () => {
    order = { orderId, status: FoodOrderStatus.IN_PREPARATION } as FoodOrder;
    const response = await service.markReady(orderId);
    expect(response.status).toBe(FoodOrderStatus.READY);
    expect(response.changed).toBe(true);
    expect(safetyCheck).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('rejects a direct PLACED to READY request', async () => {
    await expect(service.markReady(orderId)).rejects.toThrow(ConflictException);
    expect(save).not.toHaveBeenCalled();
  });

  it.each([FoodOrderStatus.CANCELLED, FoodOrderStatus.DELIVERED])(
    'rejects starting preparation from %s',
    async (state) => {
      order = { orderId, status: state } as FoodOrder;
      await expect(service.startPreparation(orderId)).rejects.toThrow(
        ConflictException,
      );
      expect(save).not.toHaveBeenCalled();
    },
  );

  it('treats an immediately repeated start-preparation command as no-op', async () => {
    order = { orderId, status: FoodOrderStatus.IN_PREPARATION } as FoodOrder;
    const response = await service.startPreparation(orderId);
    expect(response.changed).toBe(false);
    expect(save).not.toHaveBeenCalled();
    expect(safetyCheck).not.toHaveBeenCalled();
  });

  it('treats repeated mark-ready as no-op', async () => {
    order = { orderId, status: FoodOrderStatus.READY } as FoodOrder;
    const response = await service.markReady(orderId);
    expect(response.changed).toBe(false);
    expect(save).not.toHaveBeenCalled();
  });

  it('rejects backward status changes from READY', async () => {
    order = { orderId, status: FoodOrderStatus.READY } as FoodOrder;
    await expect(service.startPreparation(orderId)).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects absent orders without persistence', async () => {
    order = null;
    await expect(service.startPreparation(orderId)).rejects.toThrow(
      NotFoundException,
    );
    expect(save).not.toHaveBeenCalled();
  });

  it('does not accept changes when the database write fails', async () => {
    save.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(service.startPreparation(orderId)).rejects.toThrow(
      'database unavailable',
    );
  });
});
