import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { KmsKitchenReadGuard } from '../src/common/guards/kms-kitchen-read.guard.js';
import { FoodOrder } from '../src/modules/orders/entities/food-order.entity.js';
import { FoodOrderMealPeriod } from '../src/modules/orders/enums/food-order-meal-period.enum.js';
import { FoodOrderStatus } from '../src/modules/orders/enums/food-order-status.enum.js';
import { OrdersController } from '../src/modules/orders/orders.controller.js';
import { OrdersService } from '../src/modules/orders/orders.service.js';
import { FoodOrderRepository } from '../src/modules/orders/repositories/food-order.repository.js';

const orderId = '11111111-1111-4111-8111-111111111111';
const validStaff = 'Bearer staff.valid.signature';
const validManager = 'Bearer manager.valid.signature';
const receptionist = 'Bearer frontdesk.valid.signature';
const endpoint = '/api/v1/orders';
const order = {
  orderId,
  bookingId: '22222222-2222-4222-8222-222222222222',
  roomNumber: '204',
  mealPeriod: FoodOrderMealPeriod.LUNCH,
  status: FoodOrderStatus.PLACED,
  placedAt: new Date('2026-11-08T08:00:00.000Z'),
  estimatedDeliveryTime: null,
  allergyNote: null,
  totalAmount: 1500,
  items: [],
} as FoodOrder;

describe('DDP-258 authenticated order read HTTP contracts', () => {
  let app: INestApplication;
  const repository = {
    findQueue: async (): Promise<[FoodOrder[], number]> => [[order], 1],
    findByIdWithItems: async (id: string): Promise<FoodOrder | null> =>
      id === orderId ? order : null,
  };

  beforeAll(async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (_input, init) => {
      const authorization = new Headers(init?.headers).get('Authorization');
      const kitchenRoles: Record<string, string> = {
        [validStaff]: 'KITCHEN_STAFF',
        [validManager]: 'KITCHEN_MANAGER',
      };
      const role = kitchenRoles[authorization ?? ''] ?? 'RECEPTIONIST';
      return new Response(
        JSON.stringify({
          sub: 'verified-staff',
          role,
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
          passwordChangeRequired: false,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        OrdersService,
        KmsKitchenReadGuard,
        { provide: FoodOrderRepository, useValue: repository },
        {
          provide: ConfigService,
          useValue: { get: () => 'http://test-gateway/auth/session' },
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

  it('allows Kitchen Staff to view queue data', async () => {
    await request(app.getHttpServer())
      .get(endpoint)
      .set('Authorization', validStaff)
      .expect(200)
      .expect((res) => {
        expect(res.body.total).toBe(1);
        expect(res.body.items[0].orderId).toBe(orderId);
      });
  });

  it('allows Kitchen Manager to view order details', async () => {
    await request(app.getHttpServer())
      .get(`${endpoint}/${orderId}`)
      .set('Authorization', validManager)
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('PLACED');
      });
  });

  it('rejects anonymous requests', async () => {
    await request(app.getHttpServer()).get(endpoint).expect(401);
  });

  it('rejects users outside kitchen roles', async () => {
    await request(app.getHttpServer())
      .get(endpoint)
      .set('Authorization', receptionist)
      .expect(403);
  });

  it('rejects unsupported status values', async () => {
    await request(app.getHttpServer())
      .get(`${endpoint}?status=CANCELLED`)
      .set('Authorization', validStaff)
      .expect(400);
  });

  it('rejects malformed UUID and returns 404 for unknown valid UUID', async () => {
    await request(app.getHttpServer())
      .get(`${endpoint}/bad-id`)
      .set('Authorization', validStaff)
      .expect(400);
    await request(app.getHttpServer())
      .get(`${endpoint}/33333333-3333-4333-8333-333333333333`)
      .set('Authorization', validStaff)
      .expect(404);
  });
});
