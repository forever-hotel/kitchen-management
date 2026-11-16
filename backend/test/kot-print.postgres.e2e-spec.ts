import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  DataSource,
  type EntityManager,
  type EntityTarget,
  type ObjectLiteral,
  type QueryRunner,
} from 'typeorm';

import { AppModule } from '../src/app.module.js';
import { FoodOrder } from '../src/modules/orders/entities/food-order.entity.js';
import { KotPrintStatus } from '../src/modules/orders/enums/kot-print-status.enum.js';
import { KotPrintRepository } from '../src/modules/orders/repositories/kot-print.repository.js';

/**
 * DDP-108 opt-in PostgreSQL integration verification.
 * All writes are confined to an explicit QueryRunner transaction and rolled back.
 * It tests the real repository logic against real TypeORM/PostgreSQL mappings.
 *
 * NEVER enable this suite against the shared KMS-Test or production branch.
 * The DATABASE_URL must be the separate Neon integration-branch connection URL.
 */
const enabled = process.env.KMS_KOT_INTEGRATION === '1';
const integrationDescribe = enabled ? describe : describe.skip;

integrationDescribe(
  'DDP-108 KOT PostgreSQL integration (rollback only)',
  () => {
    let moduleRef: TestingModule | undefined;
    let runner: QueryRunner | undefined;
    let repository: KotPrintRepository;
    let orderId: string;

    beforeAll(async () => {
      if (process.env.KMS_KOT_DB_CONFIRM !== 'kms-ddp108-integration') {
        throw new Error(
          'Refusing database integration run: KMS_KOT_DB_CONFIRM must be kms-ddp108-integration',
        );
      }

      const databaseUrl = process.env.DATABASE_URL;
      if (
        !databaseUrl ||
        !new URL(databaseUrl).hostname.endsWith('.neon.tech')
      ) {
        throw new Error(
          'Refusing integration run without an explicit Neon DATABASE_URL',
        );
      }

      // Importing AppModule creates the existing TypeORM connection. We do not
      // change synchronize=false and do not execute database migrations.
      moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      const dataSource = moduleRef.get(DataSource);
      if (!dataSource.isInitialized) {
        throw new Error('TypeORM did not connect to PostgreSQL');
      }

      runner = dataSource.createQueryRunner();
      await runner.connect();
      await runner.startTransaction();

      const tableCheck = (await runner.query(
        "SELECT to_regclass('public.kms_kot_prints') AS kot_table, to_regclass('public.kms_food_orders') AS orders_table",
      )) as { kot_table: string | null; orders_table: string | null }[];
      if (!tableCheck[0]?.kot_table || !tableCheck[0]?.orders_table) {
        throw new Error(
          'The isolated Neon branch must contain both KMS tables',
        );
      }

      // Existing sample order, with no KOT history, so this test cannot
      // accidentally reuse a PENDING job copied from the parent branch.
      const candidates = (await runner.query(
        `SELECT o.order_id
       FROM public.kms_food_orders AS o
       WHERE o.status <> 'CANCELLED'
         AND NOT EXISTS (
           SELECT 1 FROM public.kms_kot_prints AS k WHERE k.order_id = o.order_id
         )
       ORDER BY o.placed_at DESC
       LIMIT 1`,
      )) as { order_id: string }[];
      if (!candidates.length) {
        throw new Error(
          'No non-cancelled food order without existing print history. Add a test food order in the isolated Neon branch first.',
        );
      }
      orderId = candidates[0].order_id;

      // DataSource adapter pins repository operations to the existing rollback-
      // only transaction. It delegates to genuine QueryRunner/TypeORM repositories.
      // The production repository implementation itself is not mocked.
      const transactionScopedDataSource = {
        transaction: <T>(callback: (manager: EntityManager) => Promise<T>) =>
          callback(runner!.manager),
        getRepository: <T extends ObjectLiteral>(entity: EntityTarget<T>) =>
          runner!.manager.getRepository(entity),
      } as unknown as DataSource;

      repository = new KotPrintRepository(transactionScopedDataSource);
    });

    afterAll(async () => {
      try {
        if (runner?.isTransactionActive) await runner.rollbackTransaction();
      } finally {
        try {
          if (runner && !runner.isReleased) await runner.release();
        } finally {
          if (moduleRef) await moduleRef.close();
        }
      }
    });

    it('uses real database persistence for pending, successful, failed and cancelled attempts', async () => {
      const first = await repository.requestPrint(orderId);
      expect(first.created).toBe(true);
      expect(first.job.printStatus).toBe(KotPrintStatus.PENDING);
      expect(first.job.printedAt).toBeNull();

      const repeated = await repository.requestPrint(orderId);
      expect(repeated.created).toBe(false);
      expect(repeated.job.kotId).toBe(first.job.kotId);

      const byId = await repository.findById(first.job.kotId);
      expect(byId?.orderId).toBe(orderId);
      const byOrder = await repository.findByOrderId(orderId);
      expect(byOrder.some((job) => job.kotId === first.job.kotId)).toBe(true);

      const printed = await repository.markPrinted(
        first.job.kotId,
        'Integration Printer',
      );
      expect(printed.printStatus).toBe(KotPrintStatus.PRINTED);
      expect(printed.printedAt).toBeInstanceOf(Date);
      expect(printed.reprintedAt).toBeNull();
      expect(printed.printerName).toBe('Integration Printer');
      expect(printed.isCancelled).toBe(false);

      const firstReceiptRepeated = await repository.markPrinted(
        first.job.kotId,
      );
      expect(firstReceiptRepeated.kotId).toBe(first.job.kotId);

      const second = await repository.requestPrint(orderId);
      expect(second.created).toBe(true);
      expect(second.job.kotId).not.toBe(first.job.kotId);
      const reprint = await repository.markPrinted(second.job.kotId);
      expect(reprint.printStatus).toBe(KotPrintStatus.PRINTED);
      expect(reprint.printedAt).toBeInstanceOf(Date);
      expect(reprint.reprintedAt).toBeInstanceOf(Date);

      const third = await repository.requestPrint(orderId);
      const failed = await repository.markFailed(third.job.kotId);
      expect(failed.printStatus).toBe(KotPrintStatus.FAILED);
      expect(failed.isCancelled).toBe(false);

      const fourth = await repository.requestPrint(orderId);
      const cancelled = await repository.cancelPending(fourth.job.kotId);
      expect(cancelled.printStatus).toBe(KotPrintStatus.CANCELLED);
      expect(cancelled.isCancelled).toBe(true);

      const fifth = await repository.requestPrint(orderId);
      expect(fifth.created).toBe(true);
      const pending = await repository.findById(fifth.job.kotId);
      expect(pending?.printStatus).toBe(KotPrintStatus.PENDING);
    });

    it('rejects an unknown order without persisting an orphan KOT job', async () => {
      const unknownId = '00000000-0000-4000-8000-000000000000';
      const existingOrder = await runner!.manager
        .getRepository(FoodOrder)
        .findOne({
          where: { orderId: unknownId },
        });
      expect(existingOrder).toBeNull();
      await expect(repository.requestPrint(unknownId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('enforces the real database PRINTED timestamp check', async () => {
      await runner!.query('SAVEPOINT kot_invalid_printed');
      try {
        let errorCode: string | undefined;
        try {
          await runner!.query(
            "INSERT INTO public.kms_kot_prints (order_id, print_status) VALUES ($1, 'PRINTED')",
            [orderId],
          );
        } catch (error) {
          errorCode = (
            error as { driverError?: { code?: string }; code?: string }
          ).driverError?.code;
          if (!errorCode) {
            errorCode = (error as { code?: string }).code;
          }
        }
        expect(errorCode).toBe('23514');
      } finally {
        await runner!.query('ROLLBACK TO SAVEPOINT kot_invalid_printed');
        await runner!.query('RELEASE SAVEPOINT kot_invalid_printed');
      }
    });
  },
);
