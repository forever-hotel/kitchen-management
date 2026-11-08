import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { KmsKitchenReadGuard } from '../src/common/guards/kms-kitchen-read.guard.js';
import { FoodOrderStatus } from '../src/modules/orders/enums/food-order-status.enum.js';
import { OrdersTransitionController } from '../src/modules/orders/orders-transition.controller.js';
import { OrdersTransitionService } from '../src/modules/orders/orders-transition.service.js';

const orderId = '11111111-1111-4111-8111-111111111111';
const root = `/api/v1/orders/${orderId}`;
const kitchenToken = 'Bearer staff.valid.signature';
const otherToken = 'Bearer desk.valid.signature';

describe('DDP-261 protected order status transition HTTP contracts', () => {
  let app: INestApplication;
  const startPreparation = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const markReady = jest.fn<(...args: unknown[]) => Promise<unknown>>();

  beforeAll(async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (_input, options) => {
      const bearer = new Headers(options?.headers).get('Authorization');
      return new Response(
        JSON.stringify({
          sub: 'staff-123',
          role: bearer === kitchenToken ? 'KITCHEN_STAFF' : 'RECEPTIONIST',
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
          passwordChangeRequired: false,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [OrdersTransitionController],
      providers: [
        KmsKitchenReadGuard,
        {
          provide: OrdersTransitionService,
          useValue: { startPreparation, markReady },
        },
        {
          provide: ConfigService,
          useValue: { get: () => 'http://gateway/auth/session' },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    startPreparation.mockReset().mockResolvedValue({
      orderId,
      previousStatus: FoodOrderStatus.PLACED,
      status: FoodOrderStatus.IN_PREPARATION,
      changed: true,
    });
    markReady.mockReset().mockResolvedValue({
      orderId,
      previousStatus: FoodOrderStatus.IN_PREPARATION,
      status: FoodOrderStatus.READY,
      changed: true,
    });
  });

  it('starts preparation for authorized kitchen staff', async () => {
    await request(app.getHttpServer())
      .post(`${root}/start-preparation`)
      .set('Authorization', kitchenToken)
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe('IN_PREPARATION');
      });
    expect(startPreparation).toHaveBeenCalledWith(orderId);
  });

  it('marks an in-preparation order READY', async () => {
    await request(app.getHttpServer())
      .post(`${root}/mark-ready`)
      .set('Authorization', kitchenToken)
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe('READY');
      });
  });

  it('rejects anonymous and non-kitchen employees', async () => {
    await request(app.getHttpServer())
      .post(`${root}/start-preparation`)
      .expect(401);
    await request(app.getHttpServer())
      .post(`${root}/mark-ready`)
      .set('Authorization', otherToken)
      .expect(403);
    expect(startPreparation).not.toHaveBeenCalled();
    expect(markReady).not.toHaveBeenCalled();
  });

  it('rejects invalid order UUID', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/orders/not-a-uuid/start-preparation')
      .set('Authorization', kitchenToken)
      .expect(400);
    expect(startPreparation).not.toHaveBeenCalled();
  });
});
