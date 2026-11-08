import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { FoodOrder } from '../entities/food-order.entity.js';
import { FoodOrderStatus } from '../enums/food-order-status.enum.js';

@Injectable()
export class FoodOrderRepository {
  constructor(
    @InjectRepository(FoodOrder)
    private readonly repository: Repository<FoodOrder>,
  ) {}

  findAll(): Promise<FoodOrder[]> {
    return this.repository.find({
      order: {
        placedAt: 'ASC',
      },
    });
  }

  findById(orderId: string): Promise<FoodOrder | null> {
    return this.repository.findOne({
      where: {
        orderId,
      },
    });
  }

  /** The query builder paginates unique food orders before loading the joined line items. */
  findQueue(
    statuses: readonly FoodOrderStatus[],
    offset: number,
    limit: number,
  ): Promise<[FoodOrder[], number]> {
    return this.repository
      .createQueryBuilder('foodOrder')
      .leftJoinAndSelect('foodOrder.items', 'item')
      .where('foodOrder.status IN (:...statuses)', { statuses: [...statuses] })
      .orderBy('foodOrder.placedAt', 'ASC')
      .addOrderBy('foodOrder.orderId', 'ASC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();
  }

  findByIdWithItems(orderId: string): Promise<FoodOrder | null> {
    return this.repository.findOne({
      where: { orderId },
      relations: { items: true },
    });
  }
}
