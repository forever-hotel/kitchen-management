import { jest } from '@jest/globals';
import type { Repository } from 'typeorm';

import { FoodOrder } from './entities/food-order.entity.js';
import { FoodOrderStatus } from './enums/food-order-status.enum.js';
import { FoodOrderRepository } from './repositories/food-order.repository.js';

const id = '33333333-3333-4333-8333-333333333333';
const saved = { orderId: id, status: FoodOrderStatus.PLACED } as FoodOrder;

describe('Food-order repository contract and deterministic queue pagination', () => {
  it('finds all orders in ascending placement order', async () => {
    const find = jest.fn(async (): Promise<FoodOrder[]> => [saved]);
    const repository = new FoodOrderRepository({
      find,
    } as unknown as Repository<FoodOrder>);
    await expect(repository.findAll()).resolves.toEqual([saved]);
    expect(find).toHaveBeenCalledWith({ order: { placedAt: 'ASC' } });
  });

  it('fetches an individual order by its UUID, without reusing a stale queue lookup', async () => {
    const findOne = jest.fn(async (): Promise<FoodOrder | null> => saved);
    const repository = new FoodOrderRepository({
      findOne,
    } as unknown as Repository<FoodOrder>);
    await expect(repository.findById(id)).resolves.toEqual(saved);
    await expect(repository.findByIdWithItems(id)).resolves.toEqual(saved);
    expect(findOne).toHaveBeenNthCalledWith(1, { where: { orderId: id } });
    expect(findOne).toHaveBeenNthCalledWith(2, {
      where: { orderId: id },
      relations: { items: true },
    });
  });

  it('paginates distinct orders before fetching their persisted line items', async () => {
    const callOrder: string[] = [];
    const builder = {
      leftJoinAndSelect: jest.fn(() => {
        callOrder.push('join');
        return builder;
      }),
      where: jest.fn(() => {
        callOrder.push('where');
        return builder;
      }),
      orderBy: jest.fn(() => {
        callOrder.push('orderBy');
        return builder;
      }),
      addOrderBy: jest.fn(() => {
        callOrder.push('addOrderBy');
        return builder;
      }),
      skip: jest.fn(() => {
        callOrder.push('skip');
        return builder;
      }),
      take: jest.fn(() => {
        callOrder.push('take');
        return builder;
      }),
      getManyAndCount: jest.fn(async (): Promise<[FoodOrder[], number]> => [
        [saved],
        1,
      ]),
    };
    const createQueryBuilder = jest.fn(() => builder);
    const repository = new FoodOrderRepository({
      createQueryBuilder,
    } as unknown as Repository<FoodOrder>);
    await expect(
      repository.findQueue([FoodOrderStatus.PLACED], 10, 5),
    ).resolves.toEqual([[saved], 1]);
    expect(createQueryBuilder).toHaveBeenCalledWith('foodOrder');
    expect(builder.where).toHaveBeenCalledWith(
      'foodOrder.status IN (:...statuses)',
      {
        statuses: [FoodOrderStatus.PLACED],
      },
    );
    expect(builder.skip).toHaveBeenCalledWith(10);
    expect(builder.take).toHaveBeenCalledWith(5);
    expect(callOrder).toEqual([
      'join',
      'where',
      'orderBy',
      'addOrderBy',
      'skip',
      'take',
    ]);
  });
});
