import { Module } from '@nestjs/common';
import { KmsOrderIntakeGuard } from '../common/guards/kms-order-intake.guard.js';
import { OrdersModule } from '../modules/orders/orders.module.js';
import { GuestKitchenController } from './guest-kitchen.controller.js';
import { GuestKitchenService } from './guest-kitchen.service.js';
import { KitchenEventsService } from './kitchen-events.service.js';

@Module({
  imports: [OrdersModule],
  controllers: [GuestKitchenController],
  providers: [GuestKitchenService, KmsOrderIntakeGuard, KitchenEventsService],
})
export class KitchenIntegrationModule {}
