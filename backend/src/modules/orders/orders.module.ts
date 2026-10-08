import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FoodOrderItem } from './entities/food-order-item.entity.js';
import { FoodOrder } from './entities/food-order.entity.js';
import { FoodOrderItemRepository } from './repositories/food-order-item.repository.js';
import { FoodOrderRepository } from './repositories/food-order.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([FoodOrder, FoodOrderItem])],
  providers: [FoodOrderRepository, FoodOrderItemRepository],
  exports: [FoodOrderRepository, FoodOrderItemRepository],
})
export class OrdersModule {}
