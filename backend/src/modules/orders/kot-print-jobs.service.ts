import { Injectable, NotFoundException } from '@nestjs/common';

import { FoodOrderRepository } from './repositories/food-order.repository.js';
import { KotPrintRepository } from './repositories/kot-print.repository.js';
import type { KotPrint } from './entities/kot-print.entity.js';
import type { KotPrintStatus } from './enums/kot-print-status.enum.js';

export interface KitchenPrintJobView {
  kotId: string;
  orderId: string;
  printStatus: KotPrintStatus;
  printedAt: string | null;
  isCancelled: boolean;
  printerName: string | null;
  reprintedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function toView(job: KotPrint): KitchenPrintJobView {
  return {
    kotId: job.kotId,
    orderId: job.orderId,
    printStatus: job.printStatus,
    printedAt: job.printedAt?.toISOString() ?? null,
    isCancelled: job.isCancelled,
    printerName: job.printerName,
    reprintedAt: job.reprintedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

/** Staff-facing persistence only. Never marks a job PRINTED or sends it to hardware. */
@Injectable()
export class KotPrintJobsService {
  constructor(
    private readonly prints: KotPrintRepository,
    private readonly orders: FoodOrderRepository,
  ) {}

  private async ensureOrder(orderId: string): Promise<void> {
    if (!(await this.orders.findById(orderId))) {
      throw new NotFoundException('Food order not found');
    }
  }

  async list(orderId: string): Promise<KitchenPrintJobView[]> {
    await this.ensureOrder(orderId);
    const jobs = await this.prints.findByOrderId(orderId);
    return jobs.map(toView);
  }

  async get(orderId: string, kotId: string): Promise<KitchenPrintJobView> {
    await this.ensureOrder(orderId);
    const job = await this.prints.findById(kotId);
    if (!job || job.orderId !== orderId) {
      throw new NotFoundException('KOT print job not found');
    }
    return toView(job);
  }

  async request(
    orderId: string,
  ): Promise<{ created: boolean; job: KitchenPrintJobView }> {
    // requestPrint locks the parent order, rejects cancelled orders, and returns
    // the same pending job on repeated requests (DDP-108).
    const result = await this.prints.requestPrint(orderId);
    return { created: result.created, job: toView(result.job) };
  }

  async cancel(orderId: string, kotId: string): Promise<KitchenPrintJobView> {
    // Check ownership before requesting a transaction-protected state change.
    await this.get(orderId, kotId);
    const job = await this.prints.cancelPending(kotId);
    return toView(job);
  }
}
