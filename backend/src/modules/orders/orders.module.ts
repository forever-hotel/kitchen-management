import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KmsKitchenReadGuard } from '../../common/guards/kms-kitchen-read.guard.js';
import { FoodOrderItem } from './entities/food-order-item.entity.js';
import { FoodOrder } from './entities/food-order.entity.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { FoodOrderItemRepository } from './repositories/food-order-item.repository.js';
import { FoodOrderRepository } from './repositories/food-order.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([FoodOrder, FoodOrderItem])],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    FoodOrderRepository,
    FoodOrderItemRepository,
    KmsKitchenReadGuard,
  ],
  exports: [FoodOrderRepository, FoodOrderItemRepository],
})
export class OrdersModule {}
