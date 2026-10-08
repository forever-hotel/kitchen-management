import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { FoodOrder } from '../entities/food-order.entity.js';

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
}
