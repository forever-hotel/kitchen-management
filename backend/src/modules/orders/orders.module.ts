import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KmsOrderIntakeGuard } from '../../common/guards/kms-order-intake.guard.js';
import { OrderReadyOutboxService } from '../../messaging/order-ready-outbox.service.js';
import { MealCategory } from '../menu-categories/entities/meal-category.entity.js';
import { MenuItem } from '../menu/entities/menu-item.entity.js';

import { KmsKitchenReadGuard } from '../../common/guards/kms-kitchen-read.guard.js';
import { AllergySafetyController } from './allergy-safety.controller.js';
import { AllergySafetyService } from './allergy-safety.service.js';
import { OrderAllergyAcknowledgement } from './entities/order-allergy-acknowledgement.entity.js';
import { FoodOrderItem } from './entities/food-order-item.entity.js';
import { FoodOrder } from './entities/food-order.entity.js';
import { KotPrint } from './entities/kot-print.entity.js';
import { OrdersController } from './orders.controller.js';
import { OrdersCreateController } from './orders-create.controller.js';
import { OrdersCreateService } from './orders-create.service.js';
import { KotPreviewController } from './kot-preview.controller.js';
import { KotPrintJobsController } from './kot-print-jobs.controller.js';
import { KotPreviewService } from './kot-preview.service.js';
import { KotPrintJobsService } from './kot-print-jobs.service.js';
import { OrdersService } from './orders.service.js';
import { OrdersTransitionController } from './orders-transition.controller.js';
import { OrdersTransitionService } from './orders-transition.service.js';
import { FoodOrderItemRepository } from './repositories/food-order-item.repository.js';
import { FoodOrderRepository } from './repositories/food-order.repository.js';
import { KotPrintRepository } from './repositories/kot-print.repository.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FoodOrder,
      KotPrint,
      FoodOrderItem,
      MenuItem,
      MealCategory,
      OrderAllergyAcknowledgement,
    ]),
  ],
  controllers: [
    OrdersController,
    KotPreviewController,
    KotPrintJobsController,
    OrdersCreateController,
    AllergySafetyController,
    OrdersTransitionController,
  ],
  providers: [
    OrdersService,
    KotPreviewService,
    KotPrintJobsService,
    AllergySafetyService,
    OrdersTransitionService,
    OrderReadyOutboxService,
    OrdersCreateService,
    KmsOrderIntakeGuard,
    FoodOrderRepository,
    KotPrintRepository,
    FoodOrderItemRepository,
    KmsKitchenReadGuard,
  ],
  exports: [
    FoodOrderRepository,
    KotPrintRepository,
    FoodOrderItemRepository,
    AllergySafetyService,
  ],
})
export class OrdersModule {}
