import { Injectable } from '@nestjs/common';
import { MealCategoryResponseDto } from './dto/meal-category-response.dto.js';
import { MealCategoryRepository } from './repositories/meal-category.repository.js';

@Injectable()
export class MenuCategoriesService {
  constructor(private readonly categories: MealCategoryRepository) {}

  async listCategories(): Promise<MealCategoryResponseDto[]> {
    const categories = await this.categories.findAll();
    return categories.map((category) => ({
      categoryId: category.categoryId,
      name: category.name,
      orderStartTime: category.orderStartTime,
      orderCutoffTime: category.orderCutoffTime,
    }));
  }
}
