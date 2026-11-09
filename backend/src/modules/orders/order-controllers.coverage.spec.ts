import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { jest } from '@jest/globals';

import { AllergySafetyController } from './allergy-safety.controller.js';
import type { AllergySafetyService } from './allergy-safety.service.js';
import { KotPreviewController } from './kot-preview.controller.js';
import type { KotPreviewService } from './kot-preview.service.js';
import { KotPrintJobsController } from './kot-print-jobs.controller.js';
import type { KotPrintJobsService } from './kot-print-jobs.service.js';
import { OrdersCreateController } from './orders-create.controller.js';
import type { OrdersCreateService } from './orders-create.service.js';
import { OrdersTransitionController } from './orders-transition.controller.js';
import type { OrdersTransitionService } from './orders-transition.service.js';
import { OrdersController } from './orders.controller.js';
import type { OrdersService } from './orders.service.js';

const orderId = '33333333-3333-4333-8333-333333333333';
const kotId = '44444444-4444-4444-8444-444444444444';
const result = { orderId, status: 'PLACED' };

describe('Kitchen order controllers: explicit service delegation', () => {
  it('forwards order-queue filters unchanged for validation in OrdersService', async () => {
    const listQueue = jest.fn(async () => ({ items: [result], total: 1 }));
    const getDetails = jest.fn(async () => result);
    const controller = new OrdersController({
      listQueue,
      getDetails,
    } as unknown as OrdersService);
    const query = { status: 'PLACED', limit: '10', offset: '0' };
    await expect(controller.listQueue(query)).resolves.toMatchObject({
      total: 1,
    });
    expect(listQueue).toHaveBeenCalledWith(query);
    await expect(controller.getDetails(orderId)).resolves.toEqual(result);
    expect(getDetails).toHaveBeenCalledWith(orderId);
  });

  it('forwards idempotent order-creation payloads to the transactional service', async () => {
    const createOrder = jest.fn(async () => ({ ...result, replayed: false }));
    const controller = new OrdersCreateController({
      createOrder,
    } as unknown as OrdersCreateService);
    const body = {
      idempotencyKey: 'random-id',
      items: [{ menuItemId: 'item-id', quantity: 1 }],
    };
    await expect(controller.create(body)).resolves.toMatchObject({
      replayed: false,
    });
    expect(createOrder).toHaveBeenCalledWith(body);
  });

  it('rejects an intake idempotency conflict rather than responding with success', async () => {
    const createOrder = jest.fn(async (): Promise<never> => {
      throw new ConflictException('Idempotency conflict');
    });
    const controller = new OrdersCreateController({
      createOrder,
    } as unknown as OrdersCreateService);
    await expect(controller.create({})).rejects.toThrow(ConflictException);
  });

  it('calls separate guarded transitions for start preparation and ready', async () => {
    const startPreparation = jest.fn(async () => ({
      ...result,
      status: 'IN_PREPARATION',
    }));
    const markReady = jest.fn(async () => ({ ...result, status: 'READY' }));
    const controller = new OrdersTransitionController({
      startPreparation,
      markReady,
    } as unknown as OrdersTransitionService);
    await expect(controller.startPreparation(orderId)).resolves.toMatchObject({
      status: 'IN_PREPARATION',
    });
    await expect(controller.markReady(orderId)).resolves.toMatchObject({
      status: 'READY',
    });
    expect(startPreparation).toHaveBeenCalledWith(orderId);
    expect(markReady).toHaveBeenCalledWith(orderId);
  });

  it('returns the read-only KOT preview without persisting a print request', async () => {
    const preview = jest.fn(async () => ({ orderId, items: [] }));
    const controller = new KotPreviewController({
      preview,
    } as unknown as KotPreviewService);
    await expect(controller.preview(orderId)).resolves.toMatchObject({
      orderId,
    });
    expect(preview).toHaveBeenCalledWith(orderId);
  });

  it('exposes all print-job operations while maintaining order/job identity', async () => {
    const list = jest.fn(async () => [{ kotId }]);
    const get = jest.fn(async () => ({ kotId }));
    const request = jest.fn(async () => ({ kotId, status: 'PENDING' }));
    const cancel = jest.fn(async () => ({ kotId, status: 'CANCELLED' }));
    const controller = new KotPrintJobsController({
      list,
      get,
      request,
      cancel,
    } as unknown as KotPrintJobsService);
    await expect(controller.list(orderId)).resolves.toEqual([{ kotId }]);
    await expect(controller.get(orderId, kotId)).resolves.toEqual({ kotId });
    await expect(controller.request(orderId)).resolves.toMatchObject({
      status: 'PENDING',
    });
    await expect(controller.cancel(orderId, kotId)).resolves.toMatchObject({
      status: 'CANCELLED',
    });
    expect(list).toHaveBeenCalledWith(orderId);
    expect(get).toHaveBeenCalledWith(orderId, kotId);
    expect(request).toHaveBeenCalledWith(orderId);
    expect(cancel).toHaveBeenCalledWith(orderId, kotId);
  });

  it('does not invent a print job when its service says the order is missing', async () => {
    const request = jest.fn(async (): Promise<never> => {
      throw new NotFoundException('Food order not found');
    });
    const controller = new KotPrintJobsController({
      request,
    } as unknown as KotPrintJobsService);
    await expect(controller.request(orderId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('reads allergy-safety warnings and saves acknowledged kitchen identity only', async () => {
    const getSafety = jest.fn(async () => ({ orderId, acknowledged: false }));
    const acknowledge = jest.fn(async () => ({ orderId, acknowledged: true }));
    const controller = new AllergySafetyController({
      getSafety,
      acknowledge,
    } as unknown as AllergySafetyService);
    await expect(controller.getSafety(orderId)).resolves.toMatchObject({
      acknowledged: false,
    });
    await expect(
      controller.acknowledge(orderId, {
        kmsStaff: { sub: 'worker-123', role: 'KITCHEN_STAFF' },
      }),
    ).resolves.toMatchObject({ acknowledged: true });
    expect(getSafety).toHaveBeenCalledWith(orderId);
    expect(acknowledge).toHaveBeenCalledWith(orderId, 'worker-123');
  });

  it('rejects acknowledgements lacking a verified staff identity before reaching the service', async () => {
    const acknowledge = jest.fn();
    const controller = new AllergySafetyController({
      acknowledge,
    } as unknown as AllergySafetyService);
    expect(() => controller.acknowledge(orderId, {})).toThrow(
      UnauthorizedException,
    );
    expect(acknowledge).not.toHaveBeenCalled();
  });
});
