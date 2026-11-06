import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';

import { MealCategory } from './entities/meal-category.entity.js';
import { MenuCategoriesService } from './menu-categories.service.js';
import { MealCategoryRepository } from './repositories/meal-category.repository.js';

const categoryId = '22222222-2222-4222-8222-222222222222';
const saved = {
  categoryId,
  name: 'Lunch',
  orderStartTime: '11:30:00',
  orderCutoffTime: '14:30:00',
} as MealCategory;

describe('R-11 service: authoritative ordering-window lookup and request-time check', () => {
  it('TC-KMS-R11-016: checks current saved times at the submitted request instant', async () => {
    const findById = jest
      .fn<() => Promise<MealCategory | null>>()
      .mockResolvedValue(saved);
    const service = new MenuCategoriesService({
      findById,
    } as unknown as MealCategoryRepository);
    await expect(
      service.isOrderingWindowOpen(
        categoryId,
        new Date('2026-11-06T06:00:00Z'),
      ),
    ).resolves.toBe(true);
    await expect(
      service.isOrderingWindowOpen(
        categoryId,
        new Date('2026-11-06T09:00:00Z'),
      ),
    ).resolves.toBe(false);
    expect(findById).toHaveBeenCalledTimes(2);
  });

  it('TC-KMS-R11-017: unknown category fails closed for lookup and order-time check', async () => {
    const findById = jest
      .fn<() => Promise<MealCategory | null>>()
      .mockResolvedValue(null);
    const service = new MenuCategoriesService({
      findById,
    } as unknown as MealCategoryRepository);
    await expect(service.getOrderingWindow(categoryId)).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.isOrderingWindowOpen(categoryId)).rejects.toThrow(
      NotFoundException,
    );
  });
});
