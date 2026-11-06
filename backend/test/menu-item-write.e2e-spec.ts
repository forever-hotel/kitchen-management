import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';

import { KmsManagerReadGuard } from '../src/common/guards/kms-manager-read.guard.js';
import { MenuController } from '../src/modules/menu/menu.controller.js';
import { MenuService } from '../src/modules/menu/menu.service.js';
import { MenuItemStockStatus } from '../src/modules/menu/enums/menu-item-stock-status.enum.js';
import { MenuItem } from '../src/modules/menu/entities/menu-item.entity.js';
import { MenuItemRepository } from '../src/modules/menu/repositories/menu-item.repository.js';
import type {
  MenuItemWriteFields,
  MenuItemPatchFields,
} from '../src/modules/menu/menu-item-write.validation.js';

const manager = 'Bearer manager.valid.signature';
const staff = 'Bearer staff.valid.signature';
const endpoint = '/api/v1/menu/items';
const categoryId = '11111111-1111-4111-8111-111111111111';
const dinnerId = '22222222-2222-4222-8222-222222222222';
const allergenId = '33333333-3333-4333-8333-333333333333';
const dietaryLabelId = '44444444-4444-4444-8444-444444444444';
const missingId = '55555555-5555-4555-8555-555555555555';
const categories = new Map([
  [categoryId, { categoryId, name: 'Lunch' }],
  [dinnerId, { categoryId: dinnerId, name: 'Dinner' }],
]);
const allergens = new Map([[allergenId, { allergenId, name: 'Soy' }]]);
const dietaryLabels = new Map([
  [dietaryLabelId, { dietaryLabelId, name: 'Vegetarian' }],
]);
const payload = {
  categoryId,
  name: 'Chicken rice',
  price: 850,
  preparationTime: 20,
  portionLimit: 5,
  allergenIds: [allergenId],
  dietaryLabelIds: [dietaryLabelId],
};

function checkReferences(fields: MenuItemPatchFields): void {
  if (fields.categoryId && !categories.has(fields.categoryId)) {
    throw new NotFoundException('Meal category not found');
  }
  if (fields.allergenIds?.some((id) => !allergens.has(id))) {
    throw new NotFoundException('Allergen not found');
  }
  if (fields.dietaryLabelIds?.some((id) => !dietaryLabels.has(id))) {
    throw new NotFoundException('Dietary label not found');
  }
}

describe('R-07 menu item create/update HTTP integration', () => {
  let app: INestApplication;
  const state = new Map<string, MenuItem>();
  const repository = {
    findAll: async (): Promise<MenuItem[]> => [...state.values()],
    findById: async (id: string): Promise<MenuItem | null> =>
      state.get(id) ?? null,
    createItem: async (fields: MenuItemWriteFields): Promise<MenuItem> => {
      checkReferences(fields);
      if (
        [...state.values()].some(
          (row) =>
            row.categoryId === fields.categoryId && row.name === fields.name,
        )
      ) {
        throw new ConflictException('Duplicate menu name in category');
      }
      const item = {
        menuItemId: randomUUID(),
        ...fields,
        category: categories.get(fields.categoryId),
        allergens: fields.allergenIds.map((id) => allergens.get(id)),
        dietaryLabels: fields.dietaryLabelIds.map((id) =>
          dietaryLabels.get(id),
        ),
      } as MenuItem;
      state.set(item.menuItemId, item);
      return item;
    },
    updateItem: async (
      id: string,
      patch: MenuItemPatchFields,
    ): Promise<MenuItem | null> => {
      const current = state.get(id);
      if (!current) return null;
      checkReferences(patch);
      const category = patch.categoryId ?? current.categoryId;
      const name = patch.name ?? current.name;
      if (
        [...state.values()].some(
          (row) =>
            row.menuItemId !== id &&
            row.categoryId === category &&
            row.name === name,
        )
      ) {
        throw new ConflictException('Duplicate menu name in category');
      }
      const item = {
        ...current,
        ...patch,
        categoryId: category,
        name,
        category: categories.get(category),
        allergens:
          patch.allergenIds === undefined
            ? current.allergens
            : patch.allergenIds.map((tagId) => allergens.get(tagId)),
        dietaryLabels:
          patch.dietaryLabelIds === undefined
            ? current.dietaryLabels
            : patch.dietaryLabelIds.map((tagId) => dietaryLabels.get(tagId)),
      } as MenuItem;
      state.set(id, item);
      return item;
    },
  };

  beforeAll(async () => {
    // The real Nest guard runs; only the external Gateway session endpoint is stubbed.
    jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
      if (!String(input).endsWith('/auth/session'))
        throw new Error('Unexpected URL');
      const authorization = new Headers(init?.headers).get('Authorization');
      return new Response(
        JSON.stringify({
          sub: 'kms-test-user',
          role: authorization === staff ? 'KITCHEN_STAFF' : 'KITCHEN_MANAGER',
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
          passwordChangeRequired: false,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [MenuController],
      providers: [
        MenuService,
        KmsManagerReadGuard,
        {
          provide: ConfigService,
          useValue: { get: () => 'http://test-gateway/auth/session' },
        },
        { provide: MenuItemRepository, useValue: repository },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => state.clear());
  afterAll(async () => {
    if (app) await app.close();
    jest.restoreAllMocks();
  });

  function create(body: Record<string, unknown> = payload) {
    return request(app.getHttpServer())
      .post(endpoint)
      .set('Authorization', manager)
      .send(body);
  }

  it('TC-KMS-R07-001: manager creates an item and sees linked tags (201)', async () => {
    const response = await create().expect(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        categoryId,
        name: 'Chicken rice',
        price: 850,
        allergens: [{ allergenId, name: 'Soy' }],
        dietaryLabels: [{ dietaryLabelId, name: 'Vegetarian' }],
        stockStatus: MenuItemStockStatus.AVAILABLE,
      }),
    );
    expect(state.size).toBe(1);
  });

  it('TC-KMS-R07-002: manager changes partial fields and clears tags using [] (200)', async () => {
    const original = await create().expect(201);
    await request(app.getHttpServer())
      .patch(`${endpoint}/${original.body.menuItemId as string}`)
      .set('Authorization', manager)
      .send({ price: 900, allergenIds: [], dietaryLabelIds: [] })
      .expect(200)
      .expect(({ body }) => {
        expect(body.price).toBe(900);
        expect(body.allergens).toEqual([]);
        expect(body.dietaryLabels).toEqual([]);
        expect(body.preparationTime).toBe(20);
      });
  });

  it('TC-KMS-R07-003: rejects invalid integer amounts (400)', async () => {
    await Promise.all(
      [
        { ...payload, price: -1 },
        { ...payload, price: 1.5 },
        { ...payload, price: '850' },
        { ...payload, preparationTime: 0 },
        { ...payload, portionLimit: 0 },
      ].map(async (body) => create(body).expect(400)),
    );
    expect(state.size).toBe(0);
  });

  it('TC-KMS-R07-004: duplicate name in same category rejects (409)', async () => {
    await create().expect(201);
    await create().expect(409);
    expect(state.size).toBe(1);
  });

  it('TC-KMS-R07-005: same name in another category is allowed (201)', async () => {
    await create().expect(201);
    await create({ ...payload, categoryId: dinnerId }).expect(201);
    expect(state.size).toBe(2);
  });

  it('TC-KMS-R07-006: missing category, allergen, or dietary label yields 404', async () => {
    await create({ ...payload, categoryId: missingId }).expect(404);
    await create({ ...payload, allergenIds: [missingId] }).expect(404);
    await create({ ...payload, dietaryLabelIds: [missingId] }).expect(404);
    expect(state.size).toBe(0);
  });

  it('TC-KMS-R07-007: malformed UUID and duplicate tag IDs return 400', async () => {
    await create({ ...payload, allergenIds: ['oops'] }).expect(400);
    await create({ ...payload, allergenIds: [allergenId, allergenId] }).expect(
      400,
    );
    await create({ ...payload, imageUrl: 'file:///etc/passwd' }).expect(400);
    await request(app.getHttpServer())
      .patch(`${endpoint}/invalid`)
      .set('Authorization', manager)
      .send({ name: 'Rice' })
      .expect(400);
  });

  it('TC-KMS-R07-008: Kitchen Staff cannot create or edit items (403)', async () => {
    await request(app.getHttpServer())
      .post(endpoint)
      .set('Authorization', staff)
      .send(payload)
      .expect(403);
    await request(app.getHttpServer())
      .patch(`${endpoint}/${randomUUID()}`)
      .set('Authorization', staff)
      .send({ name: 'Changed' })
      .expect(403);
  });

  it('TC-KMS-R07-009: missing session cannot create or edit items (401)', async () => {
    await request(app.getHttpServer()).post(endpoint).send(payload).expect(401);
    await request(app.getHttpServer())
      .patch(`${endpoint}/${randomUUID()}`)
      .send({ name: 'Changed' })
      .expect(401);
  });

  it('TC-KMS-R07-010: unknown item update returns 404', async () => {
    await request(app.getHttpServer())
      .patch(`${endpoint}/${missingId}`)
      .set('Authorization', manager)
      .send({ name: 'Rice' })
      .expect(404);
  });

  it('TC-KMS-R07-011: update rejects unknown tags without modifying stored links', async () => {
    const original = await create().expect(201);
    const id = original.body.menuItemId as string;
    await request(app.getHttpServer())
      .patch(`${endpoint}/${id}`)
      .set('Authorization', manager)
      .send({ allergenIds: [missingId] })
      .expect(404);
    expect(state.get(id)?.allergens).toHaveLength(1);
  });

  it('TC-KMS-R07-012: duplicate name conflict when moving category yields 409', async () => {
    await create().expect(201);
    const second = await create({ ...payload, categoryId: dinnerId }).expect(
      201,
    );
    await request(app.getHttpServer())
      .patch(`${endpoint}/${second.body.menuItemId as string}`)
      .set('Authorization', manager)
      .send({ categoryId })
      .expect(409);
  });

  it('TC-KMS-R07-013: GET read shape remains compatible after POST', async () => {
    const created = await create().expect(201);
    await request(app.getHttpServer())
      .get(`${endpoint}/${created.body.menuItemId as string}`)
      .set('Authorization', manager)
      .expect(200)
      .expect(({ body }) => expect(body.name).toBe('Chicken rice'));
  });
});
