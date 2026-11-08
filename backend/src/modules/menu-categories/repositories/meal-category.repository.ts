import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { CategoryWriteFields } from '../menu-category-write.validation.js';
import { MealCategory } from '../entities/meal-category.entity.js';

@Injectable()
export class MealCategoryRepository {
  constructor(
    @InjectRepository(MealCategory)
    private readonly repository: Repository<MealCategory>,
  ) {}

  findAll(): Promise<MealCategory[]> {
    return this.repository.find({ order: { name: 'ASC' } });
  }

  findById(categoryId: string): Promise<MealCategory | null> {
    return this.repository.findOne({ where: { categoryId } });
  }

  createCategory(fields: CategoryWriteFields): Promise<MealCategory> {
    return this.repository.save(this.repository.create(fields));
  }

  /**
   * Lock the current row so concurrent partial updates cannot invalidate each
   * other's ordering windows. Never insert a missing category or cascade delete.
   */
  updateCategory(
    categoryId: string,
    changesFor: (
      current: MealCategory,
    ) => Partial<CategoryWriteFields & Pick<MealCategory, 'orderingEnabled'>>,
  ): Promise<MealCategory | null> {
    return this.repository.manager.transaction(async (manager) => {
      const categories = manager.getRepository(MealCategory);
      const existing = await categories.findOne({
        where: { categoryId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!existing) {
        return null;
      }
      const changes = changesFor(existing);
      return categories.save({ ...existing, ...changes });
    });
  }
}
