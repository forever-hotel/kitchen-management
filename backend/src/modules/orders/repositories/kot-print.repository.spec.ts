import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import { DataSource } from 'typeorm';

import { FoodOrder } from '../entities/food-order.entity.js';
import { KotPrint } from '../entities/kot-print.entity.js';
import { FoodOrderStatus } from '../enums/food-order-status.enum.js';
import { KotPrintStatus } from '../enums/kot-print-status.enum.js';
import { KotPrintRepository } from './kot-print.repository.js';

const orderId = 'ff111111-2222-4333-8444-555555555555';
const kotId = 'cc111111-2222-4333-8444-555555555555';
const sample = (status = KotPrintStatus.PENDING): KotPrint =>
  ({
    kotId,
    orderId,
    printStatus: status,
    isCancelled: status === KotPrintStatus.CANCELLED,
    printedAt: status === KotPrintStatus.PRINTED ? new Date() : null,
    printerName: null,
    reprintedAt: null,
  }) as KotPrint;

const setup = (
  order: FoodOrder | null,
  pending: KotPrint | null = null,
  job: KotPrint | null = sample(),
) => {
  const foodRepo = { findOne: jest.fn(async () => order) };
  const kotRepo = {
    findOne: jest.fn(async () => pending),
    find: jest.fn(async () => [sample()]),
    create: jest.fn((props: Partial<KotPrint>) => ({ ...props }) as KotPrint),
    save: jest.fn(async (value: KotPrint) => value),
    exists: jest.fn(async () => false),
  };
  const entityManager = {
    getRepository: jest.fn((entity: unknown) =>
      entity === FoodOrder ? foodRepo : kotRepo,
    ),
  };
  const source = {
    getRepository: jest.fn(() => kotRepo),
    transaction: jest.fn(
      async (callback: (manager: typeof entityManager) => Promise<unknown>) =>
        callback(entityManager),
    ),
  };
  const repository = new KotPrintRepository(source as unknown as DataSource);
  const setLockedJob = (value: KotPrint | null) =>
    kotRepo.findOne.mockImplementation(async () => value);
  return {
    repository,
    source,
    entityManager,
    foodRepo,
    kotRepo,
    setLockedJob,
    job,
  };
};

describe('DDP-108 KOT print-job persistence', () => {
  it('rejects invalid identifiers without querying PostgreSQL', async () => {
    const { repository, source } = setup(null);
    expect(() => repository.requestPrint('not-a-uuid')).toThrow(
      BadRequestException,
    );
    expect(() => repository.findById('bad')).toThrow(BadRequestException);
    expect(() => repository.findByOrderId('bad')).toThrow(BadRequestException);
    expect(() => repository.markFailed('bad')).toThrow(BadRequestException);
    expect(source.transaction).not.toHaveBeenCalled();
  });

  it('rejects a missing order without creating an orphan record', async () => {
    const { repository, kotRepo } = setup(null);
    await expect(repository.requestPrint(orderId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(kotRepo.save).not.toHaveBeenCalled();
  });

  it('rejects cancelled food orders', async () => {
    const { repository, kotRepo } = setup({
      status: FoodOrderStatus.CANCELLED,
    } as FoodOrder);
    await expect(repository.requestPrint(orderId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(kotRepo.save).not.toHaveBeenCalled();
  });

  it('serializes requests on the parent order and reuses a pending record', async () => {
    const existing = sample();
    const { repository, foodRepo, kotRepo } = setup(
      { status: FoodOrderStatus.PLACED } as FoodOrder,
      existing,
    );
    expect(await repository.requestPrint(orderId)).toEqual({
      job: existing,
      created: false,
    });
    expect(foodRepo.findOne).toHaveBeenCalledWith({
      where: { orderId },
      lock: { mode: 'pessimistic_write' },
    });
    expect(kotRepo.save).not.toHaveBeenCalled();
  });

  it('creates a pending job when none exists, preserving retries and reprints as separate records', async () => {
    const { repository, kotRepo } = setup({
      status: FoodOrderStatus.READY,
    } as FoodOrder);
    const result = await repository.requestPrint(orderId);
    expect(result.created).toBe(true);
    expect(result.job).toMatchObject({
      orderId,
      printStatus: KotPrintStatus.PENDING,
      isCancelled: false,
    });
    expect(kotRepo.save).toHaveBeenCalledTimes(1);
  });

  it('finds a job and lists history by food-order ID', async () => {
    const { repository, kotRepo } = setup({
      status: FoodOrderStatus.PLACED,
    } as FoodOrder);
    await repository.findByOrderId(orderId);
    expect(kotRepo.find).toHaveBeenCalledWith({
      where: { orderId },
      order: { createdAt: 'DESC', kotId: 'DESC' },
    });
  });

  it('requires a pending job for transitions and rejects missing jobs', async () => {
    const { repository, setLockedJob, kotRepo } = setup({
      status: FoodOrderStatus.PLACED,
    } as FoodOrder);
    setLockedJob(null);
    await expect(repository.markFailed(kotId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    setLockedJob(sample(KotPrintStatus.PRINTED));
    await expect(repository.cancelPending(kotId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(kotRepo.save).not.toHaveBeenCalled();
  });

  it('marks a pending job as printed only with a timestamp and optional verified printer name', async () => {
    const { repository, setLockedJob, kotRepo } = setup({
      status: FoodOrderStatus.PLACED,
    } as FoodOrder);
    setLockedJob(sample());
    const result = await repository.markPrinted(kotId, ' Kitchen A ');
    expect(result.printStatus).toBe(KotPrintStatus.PRINTED);
    expect(result.printedAt).toBeInstanceOf(Date);
    expect(result.printerName).toBe('Kitchen A');
    expect(result.isCancelled).toBe(false);
    expect(kotRepo.save).toHaveBeenCalledTimes(1);
  });

  it('sets reprinted_at only if an earlier successful print exists', async () => {
    const { repository, setLockedJob, kotRepo } = setup({
      status: FoodOrderStatus.PLACED,
    } as FoodOrder);
    setLockedJob(sample());
    kotRepo.exists.mockResolvedValue(true);
    const result = await repository.markPrinted(kotId);
    expect(result.reprintedAt).toEqual(result.printedAt);
  });

  it('marks pending jobs as failed or cancelled consistently with database checks', async () => {
    const a = setup({ status: FoodOrderStatus.PLACED } as FoodOrder);
    a.setLockedJob(sample());
    expect((await a.repository.markFailed(kotId)).printStatus).toBe(
      KotPrintStatus.FAILED,
    );
    const b = setup({ status: FoodOrderStatus.PLACED } as FoodOrder);
    b.setLockedJob(sample());
    const cancelled = await b.repository.cancelPending(kotId);
    expect(cancelled.printStatus).toBe(KotPrintStatus.CANCELLED);
    expect(cancelled.isCancelled).toBe(true);
  });

  it('keeps completed receipts idempotent and rejects empty printer names', async () => {
    const { repository, setLockedJob, kotRepo } = setup({
      status: FoodOrderStatus.PLACED,
    } as FoodOrder);
    setLockedJob(sample(KotPrintStatus.PRINTED));
    expect((await repository.markPrinted(kotId)).printStatus).toBe(
      KotPrintStatus.PRINTED,
    );
    expect(kotRepo.save).not.toHaveBeenCalled();
    expect(() => repository.markPrinted(kotId, ' ')).toThrow(
      BadRequestException,
    );
  });

  it('propagates persistence failures, leaving transaction rollback to TypeORM', async () => {
    const { repository, kotRepo } = setup({
      status: FoodOrderStatus.PLACED,
    } as FoodOrder);
    kotRepo.save.mockRejectedValueOnce(new Error('database rejected insert'));
    await expect(repository.requestPrint(orderId)).rejects.toThrow(
      'database rejected insert',
    );
  });
});
