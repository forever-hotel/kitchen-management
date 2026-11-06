import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';

import { KmsManagerReadGuard } from '../src/common/guards/kms-manager-read.guard.js';
import { MenuCategoriesController } from '../src/modules/menu-categories/menu-categories.controller.js';
import { MealCategory } from '../src/modules/menu-categories/entities/meal-category.entity.js';
import { MenuCategoriesService } from '../src/modules/menu-categories/menu-categories.service.js';
import type { CategoryWriteFields } from '../src/modules/menu-categories/menu-category-write.validation.js';
import { MealCategoryRepository } from '../src/modules/menu-categories/repositories/meal-category.repository.js';

const managerToken = 'Bearer manager.valid.signature';
const staffToken = 'Bearer staff.valid.signature';
const endpoint = '/api/v1/menu/categories';
const lunch = {
  name: 'Lunch',
  orderStartTime: '11:30:00',
  orderCutoffTime: '14:30:00',
};

describe('R-11 ordering-window HTTP integration (in-memory persistence double)', () => {
  let app: INestApplication;
  const state = new Map<string, MealCategory>();
  const categoryId = '22222222-2222-4222-8222-222222222222';
  const repo = {
    findAll: async (): Promise<MealCategory[]> => [...state.values()],
    findById: async (id: string): Promise<MealCategory | null> =>
      state.get(id) ?? null,
    updateCategory: async (
      id: string,
      changesFor: (current: MealCategory) => Partial<CategoryWriteFields>,
    ): Promise<MealCategory | null> => {
      const current = state.get(id);
      if (!current) return null;
      const updated = { ...current, ...changesFor(current) } as MealCategory;
      state.set(id, updated);
      return updated;
    },
  };

  beforeAll(async () => {
    // Use the real KmsManagerReadGuard: only the trusted Gateway session endpoint is mocked.
    jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      if (!String(input).endsWith('/auth/session')) {
        throw new Error('Unexpected auth URL');
      }
      const authorization = new Headers(init?.headers).get('Authorization');
      return new Response(
        JSON.stringify({
          sub: 'test-staff',
          role:
            authorization === staffToken ? 'KITCHEN_STAFF' : 'KITCHEN_MANAGER',
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
          passwordChangeRequired: false,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [MenuCategoriesController],
      providers: [
        MenuCategoriesService,
        KmsManagerReadGuard,
        {
          provide: ConfigService,
          useValue: { get: () => 'http://test-gateway/auth/session' },
        },
        { provide: MealCategoryRepository, useValue: repo },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    state.clear();
    state.set(categoryId, { categoryId, ...lunch } as MealCategory);
  });

  afterAll(async () => {
    if (app) await app.close();
    jest.restoreAllMocks();
  });

  it('TC-KMS-R11-009: manager reads saved ordering window with explicit hotel timezone', async () => {
    const result = await request(app.getHttpServer())
      .get(`${endpoint}/${categoryId}/window`)
      .set('Authorization', managerToken)
      .expect(200);
    expect(result.body).toEqual({
      categoryId,
      ...lunch,
      timeZone: 'Asia/Colombo',
    });
  });

  it('TC-KMS-R11-010: manager PATCH persists canonical window and subsequent GET returns change', async () => {
    await request(app.getHttpServer())
      .patch(`${endpoint}/${categoryId}/window`)
      .set('Authorization', managerToken)
      .send({ orderStartTime: '12:00', orderCutoffTime: '16:30' })
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({
          categoryId,
          name: 'Lunch',
          orderStartTime: '12:00:00',
          orderCutoffTime: '16:30:00',
          timeZone: 'Asia/Colombo',
        });
      });
    await request(app.getHttpServer())
      .get(`${endpoint}/${categoryId}/window`)
      .set('Authorization', managerToken)
      .expect(200)
      .expect((res) => {
        expect(res.body.orderCutoffTime).toBe('16:30:00');
      });
  });

  it('TC-KMS-R11-011: rejects invalid clock and reverse window without saving anything', async () => {
    await Promise.all(
      [
        { orderStartTime: '25:00' },
        { orderCutoffTime: '11:30' },
        { orderStartTime: '20:00' },
        { orderStartTime: '23:00', orderCutoffTime: '02:00' },
      ].map((payload) =>
        request(app.getHttpServer())
          .patch(`${endpoint}/${categoryId}/window`)
          .set('Authorization', managerToken)
          .send(payload)
          .expect(400),
      ),
    );
    expect(state.get(categoryId)?.orderCutoffTime).toBe('14:30:00');
    expect(state.get(categoryId)?.orderStartTime).toBe('11:30:00');
  });

  it('TC-KMS-R11-012: staff 403 and anonymous 401 cannot read or update', async () => {
    await request(app.getHttpServer())
      .get(`${endpoint}/${categoryId}/window`)
      .set('Authorization', staffToken)
      .expect(403);
    await request(app.getHttpServer())
      .patch(`${endpoint}/${categoryId}/window`)
      .set('Authorization', staffToken)
      .send({ orderCutoffTime: '16:00' })
      .expect(403);
    await request(app.getHttpServer())
      .get(`${endpoint}/${categoryId}/window`)
      .expect(401);
    await request(app.getHttpServer())
      .patch(`${endpoint}/${categoryId}/window`)
      .send({ orderCutoffTime: '16:00' })
      .expect(401);
    expect(state.get(categoryId)?.orderCutoffTime).toBe('14:30:00');
  });

  it('TC-KMS-R11-013: unknown category 404 and invalid UUID 400', async () => {
    await request(app.getHttpServer())
      .get(`${endpoint}/${randomUUID()}/window`)
      .set('Authorization', managerToken)
      .expect(404);
    await request(app.getHttpServer())
      .patch(`${endpoint}/${randomUUID()}/window`)
      .set('Authorization', managerToken)
      .send({ orderCutoffTime: '15:00' })
      .expect(404);
    await request(app.getHttpServer())
      .patch(`${endpoint}/bad-id/window`)
      .set('Authorization', managerToken)
      .send({ orderCutoffTime: '15:00' })
      .expect(400);
  });

  it('TC-KMS-R11-014: invented flags and unrelated category fields are rejected', async () => {
    await Promise.all(
      [{ allDay: true }, { enabled: false }, { name: 'Dinner' }].map(
        (payload) =>
          request(app.getHttpServer())
            .patch(`${endpoint}/${categoryId}/window`)
            .set('Authorization', managerToken)
            .send(payload)
            .expect(400),
      ),
    );
    expect(state.get(categoryId)?.name).toBe('Lunch');
  });

  it('TC-KMS-R11-015: window GET and existing category list share the same saved fields', async () => {
    await request(app.getHttpServer())
      .patch(`${endpoint}/${categoryId}/window`)
      .set('Authorization', managerToken)
      .send({ orderCutoffTime: '15:00:15' })
      .expect(200);
    const result = await request(app.getHttpServer())
      .get(endpoint)
      .set('Authorization', managerToken)
      .expect(200);
    expect(result.body).toEqual([
      {
        categoryId,
        name: 'Lunch',
        orderStartTime: '11:30:00',
        orderCutoffTime: '15:00:15',
      },
    ]);
  });
});
