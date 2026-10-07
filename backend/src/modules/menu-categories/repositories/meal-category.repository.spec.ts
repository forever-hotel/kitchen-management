import { jest } from '@jest/globals';
import { Repository } from 'typeorm';

import { MealCategory } from '../entities/meal-category.entity.js';
import { MealCategoryRepository } from './meal-category.repository.js';

describe('MealCategoryRepository', () => {
  it('TC-KMS-MENU-012: Given persisted categories, when all categories are requested, then they are retrieved alphabetically', async () => {
    // Arrange
    const categories = [
      {
        categoryId: 'category-1',
        name: 'Breakfast',
      },
    ] as MealCategory[];

    const typeOrmRepository = {
      find: jest
        .fn<() => Promise<MealCategory[]>>()
        .mockResolvedValue(categories),
    } as unknown as Repository<MealCategory>;

    const repository = new MealCategoryRepository(typeOrmRepository);

    // Act
    const result = await repository.findAll();

    // Assert
    expect(result).toBe(categories);
    expect(typeOrmRepository.find).toHaveBeenCalledWith({
      order: {
        name: 'ASC',
      },
    });
  });

  it('TC-KMS-MENU-013: Given a category identifier, when the category is requested, then the repository queries only that identifier', async () => {
    // Arrange
    const category = {
      categoryId: 'category-1',
      name: 'Breakfast',
    } as MealCategory;

    const typeOrmRepository = {
      findOne: jest
        .fn<() => Promise<MealCategory | null>>()
        .mockResolvedValue(category),
    } as unknown as Repository<MealCategory>;

    const repository = new MealCategoryRepository(typeOrmRepository);

    // Act
    const result = await repository.findById('category-1');

    // Assert
    expect(result).toBe(category);
    expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
      where: {
        categoryId: 'category-1',
      },
    });
  });
});
