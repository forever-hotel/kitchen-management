import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KmsOrderIntakeGuard } from '../../common/guards/kms-order-intake.guard.js';
import { MealCategory } from '../menu-categories/entities/meal-category.entity.js';
import { MenuItem } from '../menu/entities/menu-item.entity.js';

import { KmsKitchenReadGuard } from '../../common/guards/kms-kitchen-read.guard.js';
import { AllergySafetyController } from './allergy-safety.controller.js';
import { AllergySafetyService } from './allergy-safety.service.js';
import { OrderAllergyAcknowledgement } from './entities/order-allergy-acknowledgement.entity.js';
import { FoodOrderItem } from './entities/food-order-item.entity.js';
import { FoodOrder } from './entities/food-order.entity.js';
import { OrdersController } from './orders.controller.js';
import { OrdersCreateController } from './orders-create.controller.js';
import { OrdersCreateService } from './orders-create.service.js';
import { OrdersService } from './orders.service.js';
import { FoodOrderItemRepository } from './repositories/food-order-item.repository.js';
import { FoodOrderRepository } from './repositories/food-order.repository.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FoodOrder,
      FoodOrderItem,
      MenuItem,
      MealCategory,
      OrderAllergyAcknowledgement,
    ]),
  ],
  controllers: [
    OrdersController,
    OrdersCreateController,
    AllergySafetyController,
  ],
  providers: [
    OrdersService,
    AllergySafetyService,
    OrdersCreateService,
    KmsOrderIntakeGuard,
    FoodOrderRepository,
    FoodOrderItemRepository,
    KmsKitchenReadGuard,
  ],
  exports: [FoodOrderRepository, FoodOrderItemRepository, AllergySafetyService],
})
export class OrdersModule {}
