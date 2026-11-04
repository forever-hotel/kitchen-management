import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { QueryFailedError } from 'typeorm';

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
  orderStartTime: '11:30',
  orderCutoffTime: '14:30',
};

function nameConflict(): QueryFailedError {
  return new QueryFailedError('INSERT INTO kms_meal_categories', [], {
    code: '23505',
    constraint: 'kms_meal_categories_name_key',
  });
}

describe('R-05 category write HTTP integration', () => {
  let app: INestApplication;
  const state = new Map<string, MealCategory>();
  const repo = {
    findAll: async (): Promise<MealCategory[]> => [...state.values()],
    findById: async (id: string): Promise<MealCategory | null> =>
      state.get(id) ?? null,
    createCategory: async (
      fields: CategoryWriteFields,
    ): Promise<MealCategory> => {
      if (
        [...state.values()].some((category) => category.name === fields.name)
      ) {
        throw nameConflict();
      }
      const category = { categoryId: randomUUID(), ...fields } as MealCategory;
      state.set(category.categoryId, category);
      return category;
    },
    updateCategory: async (
      categoryId: string,
      changesFor: (existing: MealCategory) => Partial<CategoryWriteFields>,
    ): Promise<MealCategory | null> => {
      const existing = state.get(categoryId);
      if (!existing) {
        return null;
      }
      const fields = changesFor(existing);
      if (
        fields.name &&
        [...state.values()].some(
          (category) =>
            category.categoryId !== existing.categoryId &&
            category.name === fields.name,
        )
      ) {
        throw nameConflict();
      }
      const updated = { ...existing, ...fields } as MealCategory;
      state.set(updated.categoryId, updated);
      return updated;
    },
  };

  beforeAll(async () => {
    // Only the external session endpoint is stubbed. Nest's real manager guard executes.
    jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      if (!String(input).endsWith('/auth/session')) {
        throw new Error('Unexpected authorization service URL');
      }
      const auth = new Headers(init?.headers).get('Authorization') ?? '';
      return new Response(
        JSON.stringify({
          sub: 'test-staff',
          role: auth === staffToken ? 'KITCHEN_STAFF' : 'KITCHEN_MANAGER',
          passwordChangeRequired: false,
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
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

  beforeEach(() => state.clear());

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    jest.restoreAllMocks();
  });

  it('TC-KMS-R05-008: a manager creates a category and receives HTTP 201', async () => {
    const response = await request(app.getHttpServer())
      .post(endpoint)
      .set('Authorization', managerToken)
      .send(lunch)
      .expect(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        categoryId: expect.any(String),
        name: 'Lunch',
        orderStartTime: '11:30:00',
        orderCutoffTime: '14:30:00',
      }),
    );
  });

  it('TC-KMS-R05-009: duplicate name receives 409 without a second insert', async () => {
    await request(app.getHttpServer())
      .post(endpoint)
      .set('Authorization', managerToken)
      .send(lunch)
      .expect(201);
    await request(app.getHttpServer())
      .post(endpoint)
      .set('Authorization', managerToken)
      .send(lunch)
      .expect(409);
    expect(state.size).toBe(1);
  });

  it('TC-KMS-R05-010: invalid or reversed order times receive HTTP 400', async () => {
    await request(app.getHttpServer())
      .post(endpoint)
      .set('Authorization', managerToken)
      .send({ ...lunch, orderStartTime: '25:00' })
      .expect(400);
    await request(app.getHttpServer())
      .post(endpoint)
      .set('Authorization', managerToken)
      .send({ ...lunch, orderCutoffTime: '10:00' })
      .expect(400);
    expect(state.size).toBe(0);
  });

  it('TC-KMS-R05-011: Kitchen Staff receives HTTP 403 with the real guard', async () => {
    await request(app.getHttpServer())
      .post(endpoint)
      .set('Authorization', staffToken)
      .send(lunch)
      .expect(403);
    expect(state.size).toBe(0);
  });

  it('TC-KMS-R05-012: unauthenticated mutations receive HTTP 401', async () => {
    await request(app.getHttpServer()).post(endpoint).send(lunch).expect(401);
  });

  it('TC-KMS-R05-013: invalid UUID receives 400 and unknown UUID receives 404', async () => {
    await request(app.getHttpServer())
      .patch(`${endpoint}/not-a-uuid`)
      .set('Authorization', managerToken)
      .send({ name: 'Dinner' })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`${endpoint}/${randomUUID()}`)
      .set('Authorization', managerToken)
      .send({ name: 'Dinner' })
      .expect(404);
  });

  it('TC-KMS-R05-014: manager updates a time without changing the category ID', async () => {
    const created = await request(app.getHttpServer())
      .post(endpoint)
      .set('Authorization', managerToken)
      .send(lunch)
      .expect(201);
    await request(app.getHttpServer())
      .patch(`${endpoint}/${created.body.categoryId as string}`)
      .set('Authorization', managerToken)
      .send({ orderCutoffTime: '15:30' })
      .expect(200)
      .expect((response) => {
        expect(response.body.categoryId).toBe(created.body.categoryId);
        expect(response.body.orderStartTime).toBe('11:30:00');
        expect(response.body.orderCutoffTime).toBe('15:30:00');
      });
  });

  it('TC-KMS-R05-015: an unsafe partial window or immutable field receives 400', async () => {
    const created = await request(app.getHttpServer())
      .post(endpoint)
      .set('Authorization', managerToken)
      .send(lunch)
      .expect(201);
    await request(app.getHttpServer())
      .patch(`${endpoint}/${created.body.categoryId as string}`)
      .set('Authorization', managerToken)
      .send({ orderStartTime: '16:00' })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`${endpoint}/${created.body.categoryId as string}`)
      .set('Authorization', managerToken)
      .send({ categoryId: randomUUID() })
      .expect(400);
  });

  it('TC-KMS-R05-017: renaming to an existing category returns HTTP 409', async () => {
    const first = await request(app.getHttpServer())
      .post(endpoint)
      .set('Authorization', managerToken)
      .send(lunch)
      .expect(201);
    const second = await request(app.getHttpServer())
      .post(endpoint)
      .set('Authorization', managerToken)
      .send({ ...lunch, name: 'Dinner' })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`${endpoint}/${second.body.categoryId as string}`)
      .set('Authorization', managerToken)
      .send({ name: 'Lunch' })
      .expect(409);
    expect(state.get(first.body.categoryId as string)?.name).toBe('Lunch');
    expect(state.get(second.body.categoryId as string)?.name).toBe('Dinner');
  });

  it('TC-KMS-R05-018: Kitchen Staff cannot update an existing category', async () => {
    const created = await request(app.getHttpServer())
      .post(endpoint)
      .set('Authorization', managerToken)
      .send(lunch)
      .expect(201);
    await request(app.getHttpServer())
      .patch(`${endpoint}/${created.body.categoryId as string}`)
      .set('Authorization', staffToken)
      .send({ name: 'Unauthorised rename' })
      .expect(403);
    expect(state.get(created.body.categoryId as string)?.name).toBe('Lunch');
  });

  it('TC-KMS-R05-016: no category-delete route is exposed', async () => {
    await request(app.getHttpServer())
      .delete(`${endpoint}/${randomUUID()}`)
      .set('Authorization', managerToken)
      .expect(404);
  });
});
