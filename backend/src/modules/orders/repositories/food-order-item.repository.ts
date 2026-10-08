import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { FoodOrderItem } from '../entities/food-order-item.entity.js';

@Injectable()
export class FoodOrderItemRepository {
  constructor(
    @InjectRepository(FoodOrderItem)
    private readonly repository: Repository<FoodOrderItem>,
  ) {}

  findById(orderItemId: string): Promise<FoodOrderItem | null> {
    return this.repository.findOne({
      where: {
        orderItemId,
      },
    });
  }

  findByOrderId(orderId: string): Promise<FoodOrderItem[]> {
    return this.repository.find({
      where: {
        orderId,
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }
}
