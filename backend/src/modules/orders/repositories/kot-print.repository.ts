import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';

import { FoodOrder } from '../entities/food-order.entity.js';
import { KotPrint } from '../entities/kot-print.entity.js';
import { FoodOrderStatus } from '../enums/food-order-status.enum.js';
import { KotPrintStatus } from '../enums/kot-print-status.enum.js';

export interface KotPrintRequestResult {
  job: KotPrint;
  created: boolean;
}

function assertUuid(value: string, label: string): void {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new BadRequestException(`${label} must be a valid UUID`);
  }
}

/**
 * Persistence only: never sends data to a printer or infers physical success.
 * The Printing Service integration in DDP-265 must authenticate and verify
 * printer receipts before calling markPrinted.
 */
@Injectable()
export class KotPrintRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  findById(kotId: string): Promise<KotPrint | null> {
    assertUuid(kotId, 'kotId');
    return this.dataSource
      .getRepository(KotPrint)
      .findOne({ where: { kotId } });
  }

  findByOrderId(orderId: string): Promise<KotPrint[]> {
    assertUuid(orderId, 'orderId');
    return this.dataSource.getRepository(KotPrint).find({
      where: { orderId },
      order: { createdAt: 'DESC', kotId: 'DESC' },
    });
  }

  /**
   * Lock the parent food order: this serializes concurrent requests made
   * through this KMS repository, even if the order has no KOT records yet.
   * The approved schema has NO unique(order_id) index; it allows a sequence
   * of completed / failed / cancelled print attempts for the same order.
   */
  requestPrint(orderId: string): Promise<KotPrintRequestResult> {
    assertUuid(orderId, 'orderId');
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.getRepository(FoodOrder).findOne({
        where: { orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Food order not found');
      if (order.status === FoodOrderStatus.CANCELLED) {
        throw new ConflictException('Cannot print a cancelled food order');
      }

      const repository = manager.getRepository(KotPrint);
      const existing = await repository.findOne({
        where: { orderId, printStatus: KotPrintStatus.PENDING },
        order: { createdAt: 'DESC', kotId: 'DESC' },
      });
      if (existing) return { job: existing, created: false };

      const created = repository.create({
        orderId,
        printStatus: KotPrintStatus.PENDING,
        printedAt: null,
        isCancelled: false,
        printerName: null,
        reprintedAt: null,
      });
      const job = await repository.save(created);
      return { job, created: true };
    });
  }

  /** Only a trusted, verified printer acknowledgement may invoke this. */
  markPrinted(
    kotId: string,
    printerName: string | null = null,
  ): Promise<KotPrint> {
    if (
      printerName !== null &&
      (typeof printerName !== 'string' || !printerName.trim())
    ) {
      throw new BadRequestException('printerName must be a non-empty string');
    }
    return this.transition(
      kotId,
      KotPrintStatus.PRINTED,
      printerName?.trim() ?? null,
    );
  }

  markFailed(kotId: string): Promise<KotPrint> {
    return this.transition(kotId, KotPrintStatus.FAILED);
  }

  cancelPending(kotId: string): Promise<KotPrint> {
    return this.transition(kotId, KotPrintStatus.CANCELLED);
  }

  private transition(
    kotId: string,
    target:
      KotPrintStatus.PRINTED | KotPrintStatus.FAILED | KotPrintStatus.CANCELLED,
    printerName: string | null = null,
  ): Promise<KotPrint> {
    assertUuid(kotId, 'kotId');
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const repository = manager.getRepository(KotPrint);
      const job = await repository.findOne({
        where: { kotId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!job) throw new NotFoundException('KOT print job not found');
      if (job.printStatus === target) return job; // idempotent receipt
      if (job.printStatus !== KotPrintStatus.PENDING) {
        throw new ConflictException(
          `Cannot change KOT job from ${job.printStatus} to ${target}`,
        );
      }

      if (target === KotPrintStatus.PRINTED) {
        // A later successful attempt for the same order is a reprint.
        const earlierPrinted = await repository.exists({
          where: { orderId: job.orderId, printStatus: KotPrintStatus.PRINTED },
        });
        const now = new Date();
        job.printedAt = now;
        job.reprintedAt = earlierPrinted ? now : null;
        job.printerName = printerName;
      }
      job.printStatus = target;
      job.isCancelled = target === KotPrintStatus.CANCELLED;
      return repository.save(job);
    });
  }
}
