import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MealCategory } from '../entities/meal-category.entity.js';

@Injectable()
export class MealCategoryRepository {
  constructor(
    @InjectRepository(MealCategory)
    private readonly repository: Repository<MealCategory>,
  ) {}

  findAll(): Promise<MealCategory[]> {
    return this.repository.find({
      order: {
        name: 'ASC',
      },
    });
  }

  findById(categoryId: string): Promise<MealCategory | null> {
    return this.repository.findOne({
      where: {
        categoryId,
      },
    });
  }
}
