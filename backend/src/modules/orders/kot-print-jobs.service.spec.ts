import { ConflictException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';

import { KotPrintStatus } from './enums/kot-print-status.enum.js';
import type { KotPrint } from './entities/kot-print.entity.js';
import { KotPrintJobsService } from './kot-print-jobs.service.js';
import type { FoodOrderRepository } from './repositories/food-order.repository.js';
import type { KotPrintRepository } from './repositories/kot-print.repository.js';

const orderId = '11111111-1111-4111-8111-111111111111';
const kotId = '22222222-2222-4222-8222-222222222222';

const job: KotPrint = {
  kotId,
  orderId,
  printStatus: KotPrintStatus.PENDING,
  isCancelled: false,
  printedAt: null,
  reprintedAt: null,
  printerName: null,
  createdAt: new Date('2026-11-08T05:00:00Z'),
  updatedAt: new Date('2026-11-08T05:00:00Z'),
} as KotPrint;

function setup() {
  const prints = {
    findByOrderId: jest.fn(async () => [job]),
    findById: jest.fn(async () => job as KotPrint | null),
    requestPrint: jest.fn(async () => ({ job, created: true })),
    cancelPending: jest.fn(async () => ({
      ...job,
      printStatus: KotPrintStatus.CANCELLED,
      isCancelled: true,
    })),
  };
  const orders = {
    findById: jest.fn(async () => ({ orderId }) as { orderId: string } | null),
  };
  return {
    prints,
    orders,
    service: new KotPrintJobsService(
      prints as unknown as KotPrintRepository,
      orders as unknown as FoodOrderRepository,
    ),
  };
}

describe('DDP-265 authorized KOT print-job service', () => {
  it('lists the real persisted status, not a printer-success claim', async () => {
    const { service } = setup();
    expect(await service.list(orderId)).toMatchObject([
      { kotId, orderId, printStatus: 'PENDING', printedAt: null },
    ]);
  });

  it('returns created=false when DDP-108 deduplicates an existing pending request', async () => {
    const { service, prints } = setup();
    prints.requestPrint.mockResolvedValueOnce({ job, created: false });
    expect(await service.request(orderId)).toMatchObject({
      created: false,
      job: { printStatus: KotPrintStatus.PENDING },
    });
  });

  it('does not allow reading a KOT job under another order', async () => {
    const { service } = setup();
    await expect(
      service.get('33333333-3333-4333-8333-333333333333', kotId),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects unknown orders', async () => {
    const { service, orders, prints } = setup();
    orders.findById.mockResolvedValueOnce(null);
    await expect(service.list(orderId)).rejects.toThrow(NotFoundException);
    expect(prints.findByOrderId).not.toHaveBeenCalled();
  });

  it('permits cancellation only through the repository state transition', async () => {
    const { service, prints } = setup();
    expect((await service.cancel(orderId, kotId)).printStatus).toBe(
      KotPrintStatus.CANCELLED,
    );
    expect(prints.cancelPending).toHaveBeenCalledWith(kotId);
  });

  it('propagates a conflict for non-pending cancellation', async () => {
    const { service, prints } = setup();
    prints.cancelPending.mockRejectedValueOnce(
      new ConflictException('Not pending'),
    );
    await expect(service.cancel(orderId, kotId)).rejects.toThrow(
      ConflictException,
    );
  });
});
