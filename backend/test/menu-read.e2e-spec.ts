import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { KmsManagerReadGuard } from '../src/common/guards/kms-manager-read.guard.js';
import { MealCategory } from '../src/modules/menu-categories/entities/meal-category.entity.js';
import { MenuCategoriesController } from '../src/modules/menu-categories/menu-categories.controller.js';
import { MenuCategoriesService } from '../src/modules/menu-categories/menu-categories.service.js';
import { MealCategoryRepository } from '../src/modules/menu-categories/repositories/meal-category.repository.js';
import { MenuItemStockStatus } from '../src/modules/menu/enums/menu-item-stock-status.enum.js';
import { MenuItem } from '../src/modules/menu/entities/menu-item.entity.js';
import { MenuController } from '../src/modules/menu/menu.controller.js';
import { MenuService } from '../src/modules/menu/menu.service.js';
import { MenuItemRepository } from '../src/modules/menu/repositories/menu-item.repository.js';

const id = '11111111-1111-4111-8111-111111111111';
const categoryId = '22222222-2222-4222-8222-222222222222';
const unknown = '33333333-3333-4333-8333-333333333333';
const category = {
  categoryId,
  name: 'Lunch',
  orderStartTime: '11:00:00',
  orderCutoffTime: '15:00:00',
} as MealCategory;
const menuItem = {
  menuItemId: id,
  categoryId,
  category,
  name: 'Chicken Rice',
  description: null,
  price: 850,
  preparationTime: 20,
  portionLimit: 5,
  stockStatus: MenuItemStockStatus.AVAILABLE,
  imageUrl: null,
  allergens: [],
  dietaryLabels: [],
} as MenuItem;

describe('KMS manager menu HTTP integration (R-02)', () => {
  let app: INestApplication;
  let items: MenuItem[];
  let categories: MealCategory[];

  beforeAll(async () => {
    items = [menuItem];
    categories = [category];

    // Deliberately isolated: HTTP routing, DTO, 400/404 integration tests;
    // no credentials, real Neon DB, or external Gateway required here.
    const moduleRef = await Test.createTestingModule({
      controllers: [MenuController, MenuCategoriesController],
      providers: [
        MenuService,
        MenuCategoriesService,
        {
          provide: MenuItemRepository,
          useValue: {
            findAll: async () => items,
            findById: async (menuItemId: string) =>
              items.find((x) => x.menuItemId === menuItemId) ?? null,
          },
        },
        {
          provide: MealCategoryRepository,
          useValue: { findAll: async () => categories },
        },
      ],
    })
      // Replace the controller guard in this isolated HTTP test only.
      // Production still uses the real Gateway-backed authorization guard.
      .overrideGuard(KmsManagerReadGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('TC-KMS-R02-016: GET category list returns 200 and matching times', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/menu/categories')
      .expect(200)
      .expect([
        {
          categoryId,
          name: 'Lunch',
          orderStartTime: '11:00:00',
          orderCutoffTime: '15:00:00',
        },
      ]);
  });

  it('TC-KMS-R02-017: GET menu list returns complete summary', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/menu/items')
      .expect(200);
    expect(response.body).toEqual([
      expect.objectContaining({
        menuItemId: id,
        categoryId,
        name: 'Chicken Rice',
        price: 850,
        category: { categoryId, name: 'Lunch' },
        allergens: [],
        dietaryLabels: [],
      }),
    ]);
  });

  it('TC-KMS-R02-018: GET item detail returns 200', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/menu/items/${id}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.menuItemId).toBe(id);
      });
  });

  it('TC-KMS-R02-019: Empty lists return 200 with []', async () => {
    items = [];
    categories = [];
    await request(app.getHttpServer())
      .get('/api/v1/menu/categories')
      .expect(200)
      .expect([]);
    await request(app.getHttpServer())
      .get('/api/v1/menu/items')
      .expect(200)
      .expect([]);
  });

  it('TC-KMS-R02-020: Unknown UUID yields 404', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/menu/items/${unknown}`)
      .expect(404);
  });

  it('TC-KMS-R02-021: Malformed UUID yields 400', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/menu/items/not-a-uuid')
      .expect(400);
  });
});
