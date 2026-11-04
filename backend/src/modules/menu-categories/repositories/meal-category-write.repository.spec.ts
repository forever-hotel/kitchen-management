import { jest } from '@jest/globals';
import { Repository } from 'typeorm';

import { MealCategory } from '../entities/meal-category.entity.js';
import { MealCategoryRepository } from './meal-category.repository.js';

const current = {
  categoryId: '11111111-1111-4111-8111-111111111111',
  name: 'Lunch',
  orderStartTime: '11:30:00',
  orderCutoffTime: '14:30:00',
} as MealCategory;

describe('R-05 MealCategoryRepository writes', () => {
  it('TC-KMS-R05-006: creates an entity from only permitted fields', async () => {
    const create = jest.fn((fields: object) => fields as MealCategory);
    const save = jest.fn(async (entity: MealCategory) => entity);
    const repo = new MealCategoryRepository({
      create,
      save,
    } as unknown as Repository<MealCategory>);
    const fields = {
      name: 'Breakfast',
      orderStartTime: '06:30:00',
      orderCutoffTime: '10:00:00',
    };
    await expect(repo.createCategory(fields)).resolves.toEqual(fields);
    expect(create).toHaveBeenCalledWith(fields);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('TC-KMS-R05-007: updates the existing PK and preserves unrelated fields', async () => {
    const save = jest.fn(async (entity: MealCategory) => entity);
    const findOne = jest.fn(async () => current);
    const manager = {
      getRepository: () => ({ findOne, save }),
      transaction: async (
        callback: (value: object) => Promise<MealCategory | null>,
      ) => callback(manager),
    };
    const repo = new MealCategoryRepository({
      manager,
    } as unknown as Repository<MealCategory>);
    const result = await repo.updateCategory(current.categoryId, () => ({
      orderCutoffTime: '15:00:00',
    }));
    expect(result).not.toBeNull();
    if (!result) {
      throw new Error('Expected category update result');
    }
    expect(findOne).toHaveBeenCalledWith({
      where: { categoryId: current.categoryId },
      lock: { mode: 'pessimistic_write' },
    });
    expect(result.categoryId).toBe(current.categoryId);
    expect(result.name).toBe('Lunch');
    expect(result.orderStartTime).toBe('11:30:00');
    expect(result.orderCutoffTime).toBe('15:00:00');
    expect(save).toHaveBeenCalledTimes(1);
  });
});
