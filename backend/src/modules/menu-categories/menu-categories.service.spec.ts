import { jest } from '@jest/globals';
import { MealCategory } from './entities/meal-category.entity.js';
import { MenuCategoriesService } from './menu-categories.service.js';
import { MealCategoryRepository } from './repositories/meal-category.repository.js';

describe('MenuCategoriesService (R-02)', () => {
  it('TC-KMS-R02-006: Given an empty category table, when listed, then it returns an empty array', async () => {
    const repo = {
      findAll: jest.fn<() => Promise<MealCategory[]>>().mockResolvedValue([]),
    } as unknown as MealCategoryRepository;

    await expect(
      new MenuCategoriesService(repo).listCategories(),
    ).resolves.toEqual([]);
  });

  it('TC-KMS-R02-007: Given a category, when read, then its saved start and cutoff times are returned', async () => {
    const repo = {
      findAll: jest.fn<() => Promise<MealCategory[]>>().mockResolvedValue([
        {
          categoryId: '22222222-2222-4222-8222-222222222222',
          name: 'Lunch',
          orderStartTime: '11:00:00',
          orderCutoffTime: '15:00:00',
        } as MealCategory,
      ]),
    } as unknown as MealCategoryRepository;

    await expect(
      new MenuCategoriesService(repo).listCategories(),
    ).resolves.toEqual([
      {
        categoryId: '22222222-2222-4222-8222-222222222222',
        name: 'Lunch',
        orderStartTime: '11:00:00',
        orderCutoffTime: '15:00:00',
      },
    ]);
  });
});
