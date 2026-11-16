import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { KmsKitchenReadGuard } from '../src/common/guards/kms-kitchen-read.guard.js';
import { AllergySafetyController } from '../src/modules/orders/allergy-safety.controller.js';
import { AllergySafetyService } from '../src/modules/orders/allergy-safety.service.js';

const orderId = '11111111-1111-4111-8111-111111111111';
const base = `/api/v1/orders/${orderId}/allergy-safety`;

const safety = {
  orderId,
  acknowledgementRequired: true,
  warnings: { allergyNote: 'No peanuts', itemAllergens: [], dietaryLabels: [] },
  acknowledged: false,
  acknowledgement: null,
};

describe('DDP-260 authenticated allergy safety HTTP contract', () => {
  let app: INestApplication;
  const acknowledge =
    jest.fn<(id: string, actor: string) => Promise<unknown>>();
  const getSafety = jest.fn<(id: string) => Promise<unknown>>();

  beforeAll(async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (_input, options) => {
      const bearer = new Headers(options?.headers).get('Authorization');
      if (bearer === 'Bearer guest.valid.signature') {
        return new Response(
          JSON.stringify({
            sub: 'guest',
            role: 'RECEPTIONIST',
            expiresAt: Math.floor(Date.now() / 1000) + 3600,
            passwordChangeRequired: false,
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          sub: 'kitchen-verified-sub',
          role: 'KITCHEN_STAFF',
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
          passwordChangeRequired: false,
        }),
        { status: 200 },
      );
    });
    acknowledge.mockResolvedValue({ ...safety, acknowledged: true });
    getSafety.mockResolvedValue(safety);
    const moduleRef = await Test.createTestingModule({
      controllers: [AllergySafetyController],
      providers: [
        KmsKitchenReadGuard,
        { provide: AllergySafetyService, useValue: { acknowledge, getSafety } },
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

  it('rejects missing and other-role credentials', async () => {
    await request(app.getHttpServer())
      .post(`${base}/acknowledgements`)
      .expect(401);
    await request(app.getHttpServer())
      .post(`${base}/acknowledgements`)
      .set('Authorization', 'Bearer guest.valid.signature')
      .expect(403);
  });

  it('passes only a verified employee identity to the service', async () => {
    await request(app.getHttpServer())
      .post(`${base}/acknowledgements`)
      .set('Authorization', 'Bearer kitchen.valid.signature')
      .send({ acknowledgedBy: 'forged-user', acknowledgedAt: '2020-01-01' })
      .expect(200);
    expect(acknowledge).toHaveBeenCalledWith(orderId, 'kitchen-verified-sub');
  });

  it('reads the current persisted acknowledgement state', async () => {
    await request(app.getHttpServer())
      .get(base)
      .set('Authorization', 'Bearer kitchen.valid.signature')
      .expect(200);
    expect(getSafety).toHaveBeenCalledWith(orderId);
  });

  it('rejects malformed UUIDs before invoking the service', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/orders/bad-uuid/allergy-safety')
      .set('Authorization', 'Bearer kitchen.valid.signature')
      .expect(400);
  });
});
