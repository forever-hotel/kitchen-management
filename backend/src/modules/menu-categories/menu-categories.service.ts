import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

import { MealCategoryResponseDto } from './dto/meal-category-response.dto.js';
import { OrderingWindowResponseDto } from './dto/ordering-window-response.dto.js';
import { MealCategory } from './entities/meal-category.entity.js';
import {
  isWithinOrderingWindow,
  HOTEL_TIME_ZONE,
} from './ordering-window-time.js';
import { validateOrderingWindowPatch } from './ordering-window.validation.js';
import { validateOrderingEnabledChange } from './ordering-enabled.validation.js';
import {
  validateCategoryCreate,
  validateCategoryUpdate,
} from './menu-category-write.validation.js';
import { MealCategoryRepository } from './repositories/meal-category.repository.js';

function toResponse(category: MealCategory): MealCategoryResponseDto {
  return {
    categoryId: category.categoryId,
    name: category.name,
    orderStartTime: category.orderStartTime,
    orderCutoffTime: category.orderCutoffTime,
    ...(typeof category.orderingEnabled === 'boolean'
      ? { orderingEnabled: category.orderingEnabled }
      : {}),
  };
}

function toWindowResponse(category: MealCategory): OrderingWindowResponseDto {
  return {
    categoryId: category.categoryId,
    name: category.name,
    orderStartTime: category.orderStartTime,
    orderCutoffTime: category.orderCutoffTime,
    ...(typeof category.orderingEnabled === 'boolean'
      ? { orderingEnabled: category.orderingEnabled }
      : {}),
    timeZone: HOTEL_TIME_ZONE,
  };
}

function throwIfDuplicateName(error: unknown): void {
  if (error instanceof QueryFailedError) {
    const driverError = error.driverError as {
      code?: string;
      constraint?: string;
    };
    if (
      driverError.code === '23505' &&
      driverError.constraint === 'kms_meal_categories_name_key'
    ) {
      throw new ConflictException(
        'A meal category with this name already exists',
      );
    }
  }
}

@Injectable()
export class MenuCategoriesService {
  constructor(private readonly categories: MealCategoryRepository) {}

  async listCategories(): Promise<MealCategoryResponseDto[]> {
    const categories = await this.categories.findAll();
    return categories.map(toResponse);
  }

  /** Read the authoritative persisted TIME columns, never a UI sample. */
  async getOrderingWindow(
    categoryId: string,
  ): Promise<OrderingWindowResponseDto> {
    const category = await this.categories.findById(categoryId);
    if (!category) throw new NotFoundException('Meal category not found');
    return toWindowResponse(category);
  }

  /** Reuses the R-05 locked transaction: partial edits cannot lose a simultaneous change. */
  async updateOrderingWindow(
    categoryId: string,
    payload: unknown,
  ): Promise<OrderingWindowResponseDto> {
    const updated = await this.categories.updateCategory(
      categoryId,
      (current) => validateOrderingWindowPatch(payload, current),
    );
    if (!updated) throw new NotFoundException('Meal category not found');
    return toWindowResponse(updated);
  }

  /** Persist the manager availability flag with the existing row lock. */
  async updateOrderingEnabled(
    categoryId: string,
    payload: unknown,
  ): Promise<OrderingWindowResponseDto> {
    const { orderingEnabled } = validateOrderingEnabledChange(payload);
    const updated = await this.categories.updateCategory(categoryId, () => ({
      orderingEnabled,
    }));
    if (!updated) throw new NotFoundException('Meal category not found');
    return toWindowResponse(updated);
  }

  /** Server-side request-time check for future approved FOSS/order integration. */
  async isOrderingWindowOpen(
    categoryId: string,
    at: Date = new Date(),
  ): Promise<boolean> {
    const category = await this.categories.findById(categoryId);
    if (!category) throw new NotFoundException('Meal category not found');
    return (
      category.orderingEnabled !== false && isWithinOrderingWindow(category, at)
    );
  }

  /** Relies on the existing PostgreSQL UNIQUE(name) constraint for race-safe conflicts. */
  async createCategory(payload: unknown): Promise<MealCategoryResponseDto> {
    const fields = validateCategoryCreate(payload);
    try {
      return toResponse(await this.categories.createCategory(fields));
    } catch (error) {
      throwIfDuplicateName(error);
      throw error;
    }
  }

  /** Changes only the supplied allowed fields; never deletes or reassigns related menu items. */
  async updateCategory(
    categoryId: string,
    payload: unknown,
  ): Promise<MealCategoryResponseDto> {
    try {
      const updated = await this.categories.updateCategory(
        categoryId,
        (current) => validateCategoryUpdate(payload, current),
      );
      if (!updated) {
        throw new NotFoundException('Meal category not found');
      }
      return toResponse(updated);
    } catch (error) {
      throwIfDuplicateName(error);
      throw error;
    }
  }
}
