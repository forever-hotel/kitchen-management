import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KmsManagerReadGuard } from '../../common/guards/kms-manager-read.guard.js';
import { MealCategory } from './entities/meal-category.entity.js';
import { MenuCategoriesController } from './menu-categories.controller.js';
import { MenuCategoriesService } from './menu-categories.service.js';
import { MealCategoryRepository } from './repositories/meal-category.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([MealCategory])],
  controllers: [MenuCategoriesController],
  providers: [MenuCategoriesService, MealCategoryRepository, KmsManagerReadGuard],
  exports: [MealCategoryRepository],
})
export class MenuCategoriesModule {}
