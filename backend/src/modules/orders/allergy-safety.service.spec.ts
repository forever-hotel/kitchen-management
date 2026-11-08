import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { AllergySafetyService } from './allergy-safety.service.js';
import { FoodOrderStatus } from './enums/food-order-status.enum.js';
import { FoodOrder } from './entities/food-order.entity.js';
import { FoodOrderItem } from './entities/food-order-item.entity.js';
import { OrderAllergyAcknowledgement } from './entities/order-allergy-acknowledgement.entity.js';

const orderId = '11111111-1111-4111-8111-111111111111';
const order = {
  orderId,
  allergyNote: 'No peanuts',
  status: FoodOrderStatus.PLACED,
} as FoodOrder;

const savedAcknowledgement = {
  acknowledgementId: '99999999-9999-4999-8999-999999999999',
  orderId,
  acknowledgedBy: 'verified-kitchen-staff',
  acknowledgedAt: new Date('2026-11-08T04:30:00Z'),
} as OrderAllergyAcknowledgement;

describe('DDP-260 AllergySafetyService', () => {
  const findOrder = jest.fn<() => Promise<FoodOrder | null>>();
  const findItems = jest.fn<() => Promise<FoodOrderItem[]>>();
  const findAck = jest.fn<() => Promise<OrderAllergyAcknowledgement | null>>();
  const saveAck = jest.fn<() => Promise<OrderAllergyAcknowledgement>>();
  const orderRepo = { findOne: findOrder };
  const itemRepo = { find: findItems };
  const ackRepo = {
    findOne: findAck,
    create: (value: unknown) => value,
    save: saveAck,
  };
  const manager = {
    getRepository: (entity: unknown) => {
      if (entity === FoodOrder) return orderRepo;
      if (entity === FoodOrderItem) return itemRepo;
      if (entity === OrderAllergyAcknowledgement) return ackRepo;
      throw new Error('Unexpected repository');
    },
  } as unknown as EntityManager;
  const dataSource = {
    transaction: async <T>(
      action: (transactionManager: EntityManager) => Promise<T>,
    ) => action(manager),
  } as unknown as DataSource;
  const service = new AllergySafetyService(dataSource);

  beforeEach(() => {
    findOrder.mockReset().mockResolvedValue(order);
    findItems.mockReset().mockResolvedValue([]);
    findAck.mockReset().mockResolvedValue(null);
    saveAck.mockReset().mockResolvedValue(savedAcknowledgement);
  });

  it('shows allergy warning requiring acknowledgement', async () => {
    const safety = await service.getSafety(orderId);
    expect(safety).toMatchObject({
      acknowledgementRequired: true,
      acknowledged: false,
      warnings: { allergyNote: 'No peanuts' },
    });
  });

  it('persists the verified actor and uses database-generated timestamp', async () => {
    const safety = await service.acknowledge(orderId, 'verified-kitchen-staff');
    expect(saveAck).toHaveBeenCalledTimes(1);
    expect(safety.acknowledged).toBe(true);
    expect(safety.acknowledgement?.acknowledgedBy).toBe(
      'verified-kitchen-staff',
    );
    expect(safety.acknowledgement?.acknowledgedAt).toBe(
      '2026-11-08T04:30:00.000Z',
    );
  });

  it('does not overwrite evidence for a duplicate acknowledgement', async () => {
    findAck.mockResolvedValue(savedAcknowledgement);
    const safety = await service.acknowledge(
      orderId,
      'another-kitchen-employee',
    );
    expect(safety.acknowledgement?.acknowledgedBy).toBe(
      'verified-kitchen-staff',
    );
    expect(saveAck).not.toHaveBeenCalled();
  });

  it('rejects an acknowledgement after preparation starts', async () => {
    findOrder.mockResolvedValue({
      ...order,
      status: FoodOrderStatus.IN_PREPARATION,
    });
    await expect(service.acknowledge(orderId, 'kitchen-staff')).rejects.toThrow(
      ConflictException,
    );
  });

  it('does not require acknowledgement for an order with no warnings', async () => {
    findOrder.mockResolvedValue({ ...order, allergyNote: null });
    const safety = await service.getSafety(orderId);
    expect(safety.acknowledgementRequired).toBe(false);
    await expect(service.acknowledge(orderId, 'kitchen-staff')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('recognizes catalog allergens and records their names', async () => {
    findOrder.mockResolvedValue({ ...order, allergyNote: null });
    findItems.mockResolvedValue([
      {
        menuItem: {
          allergens: [{ name: 'Milk' }],
          dietaryLabels: [{ name: 'Vegetarian' }],
        },
      } as unknown as FoodOrderItem,
    ]);
    const safety = await service.getSafety(orderId);
    expect(safety.warnings.itemAllergens).toEqual(['Milk']);
    expect(safety.warnings.dietaryLabels).toEqual(['Vegetarian']);
    expect(safety.acknowledgementRequired).toBe(true);
  });

  it('fails for missing orders', async () => {
    findOrder.mockResolvedValue(null);
    await expect(service.getSafety(orderId)).rejects.toThrow(NotFoundException);
  });

  it('blocks preparation until acknowledgement is persisted', async () => {
    await expect(service.assertReadyToPrepare(manager, order)).rejects.toThrow(
      ConflictException,
    );
    findAck.mockResolvedValue(savedAcknowledgement);
    await expect(
      service.assertReadyToPrepare(manager, order),
    ).resolves.toBeUndefined();
  });
});
