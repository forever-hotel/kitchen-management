import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { KmsOrderIntakeGuard } from '../src/common/guards/kms-order-intake.guard.js';
import { OrdersCreateController } from '../src/modules/orders/orders-create.controller.js';
import { OrdersCreateService } from '../src/modules/orders/orders-create.service.js';

const token = '01234567890123456789012345678901';
const payload = {
  idempotencyKey: '6d8e0fd2-168e-4d76-a1be-819eb45f8fc2',
  bookingId: 'c5a5bd87-fad8-482c-998f-e1d7e8777a4a',
  roomNumber: '204',
  mealPeriod: 'LUNCH',
  items: [{ menuItemId: 'a40a5396-cce2-4050-b46b-7ff83f37c70e', quantity: 2 }],
};

describe('DDP-263 intake HTTP authentication (isolated service double)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [OrdersCreateController],
      providers: [
        KmsOrderIntakeGuard,
        { provide: ConfigService, useValue: { get: () => token } },
        {
          provide: OrdersCreateService,
          useValue: {
            createOrder: async () => ({
              orderId: 'bb2a2e52-a89a-5340-a75f-52e63930a1d6',
              status: 'PLACED',
              totalAmount: 2400,
              replayed: false,
            }),
          },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('accepts an authenticated order intake request', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 'PLACED',
          totalAmount: 2400,
        });
      });
  });

  it('rejects missing or incorrect intake credentials', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .send(payload)
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', 'Bearer wrong')
      .send(payload)
      .expect(401);
  });
});
