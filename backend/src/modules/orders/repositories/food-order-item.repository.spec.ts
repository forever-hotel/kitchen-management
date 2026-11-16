import { jest } from '@jest/globals';
import { Repository } from 'typeorm';

import { FoodOrderItem } from '../entities/food-order-item.entity.js';
import { FoodOrderItemRepository } from './food-order-item.repository.js';

describe('FoodOrderItemRepository', () => {
  it('TC-KMS-ORDER-020: Given an order-item identifier, when the item is requested, then only that identifier is queried', async () => {
    // Arrange
    const orderItem = {
      orderItemId: 'order-item-1',
      orderId: 'order-1',
    } as FoodOrderItem;

    const typeOrmRepository = {
      findOne: jest
        .fn<() => Promise<FoodOrderItem | null>>()
        .mockResolvedValue(orderItem),
    } as unknown as Repository<FoodOrderItem>;

    const repository = new FoodOrderItemRepository(typeOrmRepository);

    // Act
    const result = await repository.findById('order-item-1');

    // Assert
    expect(result).toBe(orderItem);
    expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
      where: {
        orderItemId: 'order-item-1',
      },
    });
  });

  it('TC-KMS-ORDER-021: Given an order identifier, when its line items are requested, then only items for that order are retrieved', async () => {
    // Arrange
    const orderItems = [
      {
        orderItemId: 'order-item-1',
        orderId: 'order-1',
      },
    ] as FoodOrderItem[];

    const typeOrmRepository = {
      find: jest
        .fn<() => Promise<FoodOrderItem[]>>()
        .mockResolvedValue(orderItems),
    } as unknown as Repository<FoodOrderItem>;

    const repository = new FoodOrderItemRepository(typeOrmRepository);

    // Act
    const result = await repository.findByOrderId('order-1');

    // Assert
    expect(result).toBe(orderItems);
    expect(typeOrmRepository.find).toHaveBeenCalledWith({
      where: {
        orderId: 'order-1',
      },
      order: {
        createdAt: 'ASC',
      },
    });
  });
});
