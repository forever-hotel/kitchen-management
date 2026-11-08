import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

import { FoodOrderItem } from './entities/food-order-item.entity.js';
import { FoodOrder } from './entities/food-order.entity.js';
import { OrderAllergyAcknowledgement } from './entities/order-allergy-acknowledgement.entity.js';
import type { OrderAllergySafetyResponseDto } from './dto/order-allergy-safety-response.dto.js';
import {
  assertAcknowledgementForPreparation,
  buildWarningSnapshot,
  requiresAllergyAcknowledgement,
  warningFingerprint,
  type AllergyWarningSnapshot,
} from './allergy-safety.policy.js';
import { FoodOrderStatus } from './enums/food-order-status.enum.js';

interface CurrentSafety {
  warning: AllergyWarningSnapshot;
  required: boolean;
  acknowledgement: OrderAllergyAcknowledgement | null;
}

/**
 * Catalog allergen associations are evaluated at read/acknowledgement time.
 * They are not historical item-allergen snapshots at ordering time.
 */
@Injectable()
export class AllergySafetyService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getSafety(orderId: string): Promise<OrderAllergySafetyResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.getRepository(FoodOrder).findOne({
        where: { orderId },
      });
      if (!order) throw new NotFoundException('Food order not found');
      const safety = await this.currentSafety(manager, order);
      return this.toResponse(orderId, safety);
    });
  }

  async acknowledge(
    orderId: string,
    verifiedActorId: string,
  ): Promise<OrderAllergySafetyResponseDto> {
    if (
      typeof verifiedActorId !== 'string' ||
      !verifiedActorId.trim() ||
      verifiedActorId.length > 255
    ) {
      throw new BadRequestException('Verified kitchen actor is invalid');
    }

    return this.dataSource.transaction(async (manager) => {
      // Serializes duplicate requests and concurrent preparation attempts on this order.
      const order = await manager.getRepository(FoodOrder).findOne({
        where: { orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Food order not found');

      const safety = await this.currentSafety(manager, order);
      if (!safety.required) {
        throw new BadRequestException(
          'This order has no applicable allergy warnings to acknowledge',
        );
      }
      if (safety.acknowledgement) {
        return this.toResponse(orderId, safety);
      }
      if (order.status !== FoodOrderStatus.PLACED) {
        throw new ConflictException(
          'Allergy warnings cannot be acknowledged after preparation has started',
        );
      }

      const acknowledgement = manager
        .getRepository(OrderAllergyAcknowledgement)
        .create({
          orderId,
          acknowledgedBy: verifiedActorId,
          warningSnapshot: safety.warning,
          warningFingerprint: warningFingerprint(safety.warning),
        });
      const saved = await manager
        .getRepository(OrderAllergyAcknowledgement)
        .save(acknowledgement);
      return this.toResponse(orderId, {
        ...safety,
        acknowledgement: saved,
      });
    });
  }

  /**
   * Integration hook for DDP-261: call after SELECT FOR UPDATE on the FoodOrder
   * and immediately before writing status IN_PREPARATION in the same transaction.
   */
  async assertReadyToPrepare(
    manager: EntityManager,
    lockedOrder: FoodOrder,
  ): Promise<void> {
    const safety = await this.currentSafety(manager, lockedOrder);
    assertAcknowledgementForPreparation(
      safety.required,
      safety.acknowledgement !== null,
    );
  }

  private async currentSafety(
    manager: EntityManager,
    order: FoodOrder,
  ): Promise<CurrentSafety> {
    const items = await manager.getRepository(FoodOrderItem).find({
      where: { orderId: order.orderId },
      relations: {
        menuItem: { allergens: true, dietaryLabels: true },
      },
    });
    const warning = buildWarningSnapshot(
      order.allergyNote,
      items.flatMap((item) =>
        item.menuItem.allergens.map((allergen) => allergen.name),
      ),
      items.flatMap((item) =>
        item.menuItem.dietaryLabels.map((label) => label.name),
      ),
    );
    const required = requiresAllergyAcknowledgement(warning);
    if (!required) return { warning, required, acknowledgement: null };
    const acknowledgement = await manager
      .getRepository(OrderAllergyAcknowledgement)
      .findOne({
        where: {
          orderId: order.orderId,
          warningFingerprint: warningFingerprint(warning),
        },
      });
    return { warning, required, acknowledgement };
  }

  private toResponse(
    orderId: string,
    safety: CurrentSafety,
  ): OrderAllergySafetyResponseDto {
    const { acknowledgement } = safety;
    return {
      orderId,
      warnings: safety.warning,
      acknowledgementRequired: safety.required,
      acknowledged: acknowledgement !== null,
      acknowledgement: acknowledgement
        ? {
            acknowledgementId: acknowledgement.acknowledgementId,
            acknowledgedBy: acknowledgement.acknowledgedBy,
            acknowledgedAt: acknowledgement.acknowledgedAt.toISOString(),
          }
        : null,
    };
  }
}
