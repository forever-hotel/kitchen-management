import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { KmsManagerReadGuard } from '../src/common/guards/kms-manager-read.guard.js';
import { MealCategory } from '../src/modules/menu-categories/entities/meal-category.entity.js';
import { MenuCategoriesModule } from '../src/modules/menu-categories/menu-categories.module.js';
import { Allergen } from '../src/modules/menu/entities/allergen.entity.js';
import { DietaryLabel } from '../src/modules/menu/entities/dietary-label.entity.js';
import { MenuItem } from '../src/modules/menu/entities/menu-item.entity.js';
import { MenuModule } from '../src/modules/menu/menu.module.js';

/**
 * Optional real PostgreSQL integration test. Runs ONLY when explicitly supplied
 * a local TEST database URL. The test schema must already have been installed.
 * Never point this test at Neon, shared development or production databases.
 */
const testDatabaseUrl = process.env.KMS_R02_TEST_DATABASE_URL;
const postgresSuite = testDatabaseUrl ? describe : describe.skip;

postgresSuite('KMS read APIs with isolated PostgreSQL (R-02)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const categoryId = randomUUID();
  const menuItemId = randomUUID();
  const allergenId = randomUUID();
  const labelId = randomUUID();
  const uniqueSuffix = menuItemId.slice(0, 8);

  beforeAll(async () => {
    const parsed = new URL(testDatabaseUrl as string);
    const hostname = parsed.hostname.toLowerCase();
    const dbName = parsed.pathname.toLowerCase();
    if (
      !['localhost', '127.0.0.1', 'postgres', 'db'].includes(hostname) ||
      !/(test|ci)/.test(dbName)
    ) {
      throw new Error('KMS_R02_TEST_DATABASE_URL must target a dedicated LOCAL test database');
    }

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: testDatabaseUrl,
          entities: [MealCategory, MenuItem, Allergen, DietaryLabel],
          synchronize: false,
          ssl: false,
        }),
        MenuModule,
        MenuCategoriesModule,
      ],
    })
      .overrideGuard(KmsManagerReadGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    await dataSource.query(
      `INSERT INTO public.kms_meal_categories
       (category_id,name,order_start_time,order_cutoff_time)
       VALUES ($1,$2,$3,$4)`,
      [categoryId, `R02 Test Lunch ${uniqueSuffix}`, '11:00:00', '15:00:00'],
    );
    await dataSource.query(
      `INSERT INTO public.kms_menu_items
       (menu_item_id,category_id,name,price,preparation_time,portion_limit,stock_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [menuItemId, categoryId, `R02 Test Rice ${uniqueSuffix}`, 850, 20, 5, 'LOW_STOCK'],
    );
    await dataSource.query('INSERT INTO public.kms_allergens (allergen_id,name) VALUES ($1,$2)', [
      allergenId,
      `R02 Test Soy ${uniqueSuffix}`,
    ]);
    await dataSource.query('INSERT INTO public.kms_dietary_labels (dietary_label_id,name) VALUES ($1,$2)', [
      labelId,
      `R02 Test Dietary ${uniqueSuffix}`,
    ]);
    await dataSource.query(
      'INSERT INTO public.kms_menu_item_allergens (menu_item_id,allergen_id) VALUES ($1,$2)',
      [menuItemId, allergenId],
    );
    await dataSource.query(
      'INSERT INTO public.kms_menu_item_dietary_labels (menu_item_id,dietary_label_id) VALUES ($1,$2)',
      [menuItemId, labelId],
    );
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      // Only IDs created by this suite are removed.
      await dataSource.query('DELETE FROM public.kms_menu_item_allergens WHERE menu_item_id=$1', [menuItemId]);
      await dataSource.query('DELETE FROM public.kms_menu_item_dietary_labels WHERE menu_item_id=$1', [menuItemId]);
      await dataSource.query('DELETE FROM public.kms_menu_items WHERE menu_item_id=$1', [menuItemId]);
      await dataSource.query('DELETE FROM public.kms_allergens WHERE allergen_id=$1', [allergenId]);
      await dataSource.query('DELETE FROM public.kms_dietary_labels WHERE dietary_label_id=$1', [labelId]);
      await dataSource.query('DELETE FROM public.kms_meal_categories WHERE category_id=$1', [categoryId]);
    }
    if (app) {
      await app.close();
    }
  });

  it('TC-KMS-R02-022: reads the inserted meal category from PostgreSQL', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/menu/categories').expect(200);
    expect(response.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ categoryId, orderStartTime: '11:00:00' }),
    ]));
  });

  it('TC-KMS-R02-023: reads item detail with allergens and dietary labels from PostgreSQL', async () => {
    const response = await request(app.getHttpServer()).get(`/api/v1/menu/items/${menuItemId}`).expect(200);
    expect(response.body).toEqual(expect.objectContaining({
      menuItemId, categoryId, price: 850, preparationTime: 20, portionLimit: 5,
      stockStatus: 'LOW_STOCK',
      category: expect.objectContaining({ categoryId }),
      allergens: [expect.objectContaining({ allergenId })],
      dietaryLabels: [expect.objectContaining({ dietaryLabelId: labelId })],
    }));
  });

  it('TC-KMS-R02-024: returns 404 for a nonexistent UUID', async () => {
    await request(app.getHttpServer()).get(`/api/v1/menu/items/${randomUUID()}`).expect(404);
  });
});
