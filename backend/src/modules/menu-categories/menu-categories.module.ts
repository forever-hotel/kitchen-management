import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MealCategory } from './entities/meal-category.entity.js';
import { MealCategoryRepository } from './repositories/meal-category.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([MealCategory])],
  providers: [MealCategoryRepository],
  exports: [MealCategoryRepository],
})
export class MenuCategoriesModule {}
