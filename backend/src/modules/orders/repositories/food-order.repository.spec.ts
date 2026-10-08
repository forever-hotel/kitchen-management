import { jest } from '@jest/globals';
import { Repository } from 'typeorm';

import { FoodOrder } from '../entities/food-order.entity.js';
import { FoodOrderRepository } from './food-order.repository.js';

describe('FoodOrderRepository', () => {
  it('TC-KMS-ORDER-018: Given persisted food orders, when all orders are requested, then they are retrieved by placement time', async () => {
    // Arrange
    const orders = [
      {
        orderId: 'order-1',
        roomNumber: '204',
      },
    ] as FoodOrder[];

    const typeOrmRepository = {
      find: jest.fn<() => Promise<FoodOrder[]>>().mockResolvedValue(orders),
    } as unknown as Repository<FoodOrder>;

    const repository = new FoodOrderRepository(typeOrmRepository);

    // Act
    const result = await repository.findAll();

    // Assert
    expect(result).toBe(orders);
    expect(typeOrmRepository.find).toHaveBeenCalledWith({
      order: {
        placedAt: 'ASC',
      },
    });
  });

  it('TC-KMS-ORDER-019: Given an order identifier, when the order is requested, then the repository queries only that identifier', async () => {
    // Arrange
    const order = {
      orderId: 'order-1',
      roomNumber: '204',
    } as FoodOrder;

    const typeOrmRepository = {
      findOne: jest
        .fn<() => Promise<FoodOrder | null>>()
        .mockResolvedValue(order),
    } as unknown as Repository<FoodOrder>;

    const repository = new FoodOrderRepository(typeOrmRepository);

    // Act
    const result = await repository.findById('order-1');

    // Assert
    expect(result).toBe(order);
    expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
      where: {
        orderId: 'order-1',
      },
    });
  });
});
