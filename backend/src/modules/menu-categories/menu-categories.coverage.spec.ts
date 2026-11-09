import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import { QueryFailedError } from 'typeorm';

import type { MealCategory } from './entities/meal-category.entity.js';
import { MenuCategoriesService } from './menu-categories.service.js';
import type { MealCategoryRepository } from './repositories/meal-category.repository.js';

const id = '22222222-2222-4222-8222-222222222222';
const saved = {
  categoryId: id,
  name: 'Evening Tea Time',
  orderStartTime: '15:00:00',
  orderCutoffTime: '17:00:00',
  orderingEnabled: true,
} as MealCategory;
const newCategory = {
  name: saved.name,
  orderStartTime: saved.orderStartTime,
  orderCutoffTime: saved.orderCutoffTime,
};

function harness() {
  const createCategory = jest.fn(async (): Promise<MealCategory> => saved);
  const findAll = jest.fn(async (): Promise<MealCategory[]> => [saved]);
  const findById = jest.fn(async (): Promise<MealCategory | null> => saved);
  const updateCategory = jest.fn(
    async (
      ...[, changesFor]: [
        string,
        (original: MealCategory) => Partial<MealCategory>,
      ]
    ): Promise<MealCategory | null> => ({ ...saved, ...changesFor(saved) }),
  );
  const repository = { createCategory, findAll, findById, updateCategory };
  const service = new MenuCategoriesService(
    repository as unknown as MealCategoryRepository,
  );
  return { service, createCategory, findAll, findById, updateCategory };
}

function dbError(code: string, constraint: string) {
  return new QueryFailedError('UPDATE kms_meal_categories', [], {
    code,
    constraint,
  });
}

describe('Meal category business-service coverage: persisted windows and conflicts', () => {
  it('maps the availability flag and saved times when listing categories', async () => {
    const f = harness();
    expect(await f.service.listCategories()).toEqual([
      {
        categoryId: id,
        name: saved.name,
        orderStartTime: '15:00:00',
        orderCutoffTime: '17:00:00',
        orderingEnabled: true,
      },
    ]);
  });

  it('returns authoritative ordering-window timezone and availability', async () => {
    const f = harness();
    await expect(f.service.getOrderingWindow(id)).resolves.toMatchObject({
      categoryId: id,
      timeZone: 'Asia/Colombo',
      orderingEnabled: true,
      orderStartTime: '15:00:00',
      orderCutoffTime: '17:00:00',
    });
    expect(f.findById).toHaveBeenCalledWith(id);
  });

  it('persists only a valid changed start time inside the existing locked update', async () => {
    const f = harness();
    const result = await f.service.updateOrderingWindow(id, {
      orderStartTime: '15:30',
    });
    expect(result.orderStartTime).toBe('15:30:00');
    expect(result.orderCutoffTime).toBe('17:00:00');
    expect(f.updateCategory).toHaveBeenCalledTimes(1);
  });

  it('rejects an ordering window whose cutoff precedes the start', async () => {
    const f = harness();
    await expect(
      f.service.updateOrderingWindow(id, { orderCutoffTime: '14:59' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('persists disabling a meal category independently from its saved times', async () => {
    const f = harness();
    const result = await f.service.updateOrderingEnabled(id, {
      orderingEnabled: false,
    });
    expect(result).toMatchObject({
      orderingEnabled: false,
      orderStartTime: '15:00:00',
    });
  });

  it('returns a guarded 404 when updating missing ordering-window or availability records', async () => {
    const f = harness();
    f.updateCategory.mockResolvedValue(null);
    await expect(
      f.service.updateOrderingWindow(id, { orderCutoffTime: '18:00' }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      f.service.updateOrderingEnabled(id, { orderingEnabled: false }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects invalid availability updates before writing the database', async () => {
    const f = harness();
    await expect(
      f.service.updateOrderingEnabled(id, { orderingEnabled: 'no' }),
    ).rejects.toThrow(BadRequestException);
    expect(f.updateCategory).not.toHaveBeenCalled();
  });

  it('does not accept orders when ordering is disabled despite being within the saved time range', async () => {
    const f = harness();
    f.findById.mockResolvedValue({ ...saved, orderingEnabled: false });
    await expect(
      f.service.isOrderingWindowOpen(id, new Date('2026-11-09T10:00:00Z')),
    ).resolves.toBe(false);
  });

  it('accepts orders only inside the hotel-local ordering window', async () => {
    const f = harness();
    await expect(
      f.service.isOrderingWindowOpen(id, new Date('2026-11-09T10:00:00Z')),
    ).resolves.toBe(true); // 15:30 in Colombo
    await expect(
      f.service.isOrderingWindowOpen(id, new Date('2026-11-09T12:00:00Z')),
    ).resolves.toBe(false); // 17:30 in Colombo
  });

  it('normalizes and returns a successfully created category', async () => {
    const f = harness();
    const result = await f.service.createCategory(newCategory);
    expect(f.createCategory).toHaveBeenCalledWith(newCategory);
    expect(result.name).toBe('Evening Tea Time');
    expect(result.orderingEnabled).toBe(true);
  });

  it('translates only the meal-category unique-name constraint into HTTP 409', async () => {
    const f = harness();
    f.createCategory.mockRejectedValue(
      dbError('23505', 'kms_meal_categories_name_key'),
    );
    await expect(f.service.createCategory(newCategory)).rejects.toThrow(
      ConflictException,
    );
  });

  it('does not disguise unknown database failures as duplicate category errors', async () => {
    const f = harness();
    const error = dbError('23503', 'other_foreign_key');
    f.createCategory.mockRejectedValue(error);
    await expect(f.service.createCategory(newCategory)).rejects.toBe(error);
  });

  it('updates allowed category fields without losing the existing saved values', async () => {
    const f = harness();
    const result = await f.service.updateCategory(id, { name: 'Evening Tea' });
    expect(result).toMatchObject({
      name: 'Evening Tea',
      orderStartTime: '15:00:00',
      orderCutoffTime: '17:00:00',
    });
    expect(f.updateCategory).toHaveBeenCalledWith(id, expect.any(Function));
  });

  it('rejects edits to a missing category and propagates unexpected repository errors', async () => {
    const f = harness();
    f.updateCategory.mockResolvedValueOnce(null);
    await expect(f.service.updateCategory(id, { name: 'Tea' })).rejects.toThrow(
      NotFoundException,
    );
    const failure = new Error('connection unavailable');
    f.updateCategory.mockRejectedValueOnce(failure);
    await expect(f.service.updateCategory(id, { name: 'Tea' })).rejects.toBe(
      failure,
    );
  });

  it('translates a duplicate category name during PATCH into HTTP 409', async () => {
    const f = harness();
    f.updateCategory.mockRejectedValue(
      dbError('23505', 'kms_meal_categories_name_key'),
    );
    await expect(
      f.service.updateCategory(id, { name: 'Dinner' }),
    ).rejects.toThrow(ConflictException);
  });

  it('does not report optional orderingEnabled when the old database record lacks it', async () => {
    const f = harness();
    f.findAll.mockResolvedValue([{ ...saved, orderingEnabled: undefined }]);
    const [result] = await f.service.listCategories();
    expect(result).not.toHaveProperty('orderingEnabled');
  });
});
