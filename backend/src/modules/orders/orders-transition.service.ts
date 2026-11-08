import {
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { OrderReadyOutboxService } from '../../messaging/order-ready-outbox.service.js';
import { AllergySafetyService } from './allergy-safety.service.js';
import { OrderStatusTransitionResponseDto } from './dto/order-status-transition-response.dto.js';
import { FoodOrder } from './entities/food-order.entity.js';
import { FoodOrderStatus } from './enums/food-order-status.enum.js';

/**
 * Serializes mutations using a row-level lock on kms_food_orders.
 * The safety check and the write execute within the same transaction.
 */
@Injectable()
export class OrdersTransitionService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly allergySafety: AllergySafetyService,
    @Optional() private readonly orderReadyOutbox?: OrderReadyOutboxService,
  ) {}

  startPreparation(orderId: string): Promise<OrderStatusTransitionResponseDto> {
    return this.transition(
      orderId,
      FoodOrderStatus.PLACED,
      FoodOrderStatus.IN_PREPARATION,
    );
  }

  markReady(orderId: string): Promise<OrderStatusTransitionResponseDto> {
    return this.transition(
      orderId,
      FoodOrderStatus.IN_PREPARATION,
      FoodOrderStatus.READY,
    );
  }

  private async transition(
    orderId: string,
    expected: FoodOrderStatus,
    target: FoodOrderStatus,
  ): Promise<OrderStatusTransitionResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(FoodOrder);
      const order = await repository.findOne({
        where: { orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Food order not found');

      // An immediately repeated command for the current state is a no-op.
      if (order.status === target) {
        // Repeating READY also schedules an event if messaging was enabled later.
        if (
          target === FoodOrderStatus.READY &&
          this.orderReadyOutbox?.enabled
        ) {
          await this.orderReadyOutbox.record(
            manager,
            orderId,
            order.roomNumber,
          );
        }
        return {
          orderId,
          previousStatus: target,
          status: target,
          changed: false,
        };
      }
      if (order.status !== expected) {
        throw new ConflictException(
          `Cannot change food order from ${order.status} to ${target}`,
        );
      }

      // Critical: enforce acknowledgement while the order is locked,
      // immediately before persisting IN_PREPARATION.
      if (target === FoodOrderStatus.IN_PREPARATION) {
        await this.allergySafety.assertReadyToPrepare(manager, order);
      }

      order.status = target;
      await repository.save(order);
      // Atomic: a committed READY transition always has an outbox record.
      if (target === FoodOrderStatus.READY && this.orderReadyOutbox?.enabled) {
        await this.orderReadyOutbox.record(manager, orderId, order.roomNumber);
      }
      return {
        orderId,
        previousStatus: expected,
        status: target,
        changed: true,
      };
    });
  }
}
