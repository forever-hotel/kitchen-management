import { jest } from '@jest/globals';
import { MealCategory } from './entities/meal-category.entity.js';
import { MenuCategoriesService } from './menu-categories.service.js';
import { MealCategoryRepository } from './repositories/meal-category.repository.js';

const categoryId = '22222222-2222-4222-8222-222222222222';
const saved = {
  categoryId,
  name: 'Dinner',
  orderStartTime: '16:30:00',
  orderCutoffTime: '19:30:00',
  orderingEnabled: false,
} as MealCategory;

describe('DDP-268 persisted ordering availability', () => {
  it('exposes disabled state and fails the KMS request-time availability check closed', async () => {
    const findById = jest
      .fn<() => Promise<MealCategory | null>>()
      .mockResolvedValue(saved);
    const service = new MenuCategoriesService({
      findById,
    } as unknown as MealCategoryRepository);
    expect((await service.getOrderingWindow(categoryId)).orderingEnabled).toBe(
      false,
    );
    await expect(
      service.isOrderingWindowOpen(
        categoryId,
        new Date('2026-11-08T12:00:00Z'),
      ),
    ).resolves.toBe(false);
  });
  it('updates only availability using the existing transactional repository', async () => {
    const updateCategory = jest
      .fn<MealCategoryRepository['updateCategory']>()
      .mockImplementation(async (_id, changesFor) => ({
        ...saved,
        ...changesFor(saved),
      }));
    const service = new MenuCategoriesService({
      updateCategory,
    } as unknown as MealCategoryRepository);
    const result = await service.updateOrderingEnabled(categoryId, {
      orderingEnabled: true,
    });
    expect(result.orderingEnabled).toBe(true);
    expect(updateCategory).toHaveBeenCalledTimes(1);
  });
});
