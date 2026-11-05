import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

import { MenuItemResponseDto } from './dto/menu-item-response.dto.js';
import { MenuItem } from './entities/menu-item.entity.js';
import {
  validateMenuItemCreate,
  validateMenuItemUpdate,
} from './menu-item-write.validation.js';
import { MenuItemRepository } from './repositories/menu-item.repository.js';

function translateKnownConstraint(error: unknown): void {
  if (!(error instanceof QueryFailedError)) return;
  const driverError = error.driverError as {
    code?: string;
    constraint?: string;
  };
  if (
    driverError.code === '23505' &&
    driverError.constraint === 'uq_menu_item_category_name'
  ) {
    throw new ConflictException(
      'A menu item with this name already exists in the category',
    );
  }
  if (
    driverError.code === '23503' &&
    [
      'kms_menu_items_category_id_fkey',
      'kms_menu_item_allergens_allergen_id_fkey',
      'kms_menu_item_dietary_labels_dietary_label_id_fkey',
    ].includes(driverError.constraint ?? '')
  ) {
    throw new NotFoundException(
      'One or more referenced categories or tags no longer exist',
    );
  }
  if (
    driverError.code === '23514' &&
    [
      'kms_menu_items_price_check',
      'kms_menu_items_preparation_time_check',
      'kms_menu_items_portion_limit_check',
    ].includes(driverError.constraint ?? '')
  ) {
    throw new BadRequestException('Menu numeric values must be positive');
  }
}

@Injectable()
export class MenuService {
  constructor(private readonly menuItems: MenuItemRepository) {}

  async listItems(): Promise<MenuItemResponseDto[]> {
    const items = await this.menuItems.findAll();
    return items.map((item) => this.toResponse(item));
  }

  async getItem(menuItemId: string): Promise<MenuItemResponseDto> {
    const item = await this.menuItems.findById(menuItemId);
    if (!item) throw new NotFoundException('Menu item not found');
    return this.toResponse(item);
  }

  async createItem(body: unknown): Promise<MenuItemResponseDto> {
    const fields = validateMenuItemCreate(body);
    try {
      return this.toResponse(await this.menuItems.createItem(fields));
    } catch (error) {
      translateKnownConstraint(error);
      throw error;
    }
  }

  async updateItem(
    menuItemId: string,
    body: unknown,
  ): Promise<MenuItemResponseDto> {
    const fields = validateMenuItemUpdate(body);
    try {
      const item = await this.menuItems.updateItem(menuItemId, fields);
      if (!item) throw new NotFoundException('Menu item not found');
      return this.toResponse(item);
    } catch (error) {
      translateKnownConstraint(error);
      throw error;
    }
  }

  private toResponse(item: MenuItem): MenuItemResponseDto {
    if (!item.category) {
      throw new Error('Menu item category relation was not loaded');
    }
    return {
      menuItemId: item.menuItemId,
      categoryId: item.categoryId,
      category: {
        categoryId: item.category.categoryId,
        name: item.category.name,
      },
      name: item.name,
      description: item.description,
      price: item.price,
      preparationTime: item.preparationTime,
      portionLimit: item.portionLimit,
      stockStatus: item.stockStatus,
      imageUrl: item.imageUrl,
      allergens: (item.allergens ?? []).map((allergen) => ({
        allergenId: allergen.allergenId,
        name: allergen.name,
      })),
      dietaryLabels: (item.dietaryLabels ?? []).map((label) => ({
        dietaryLabelId: label.dietaryLabelId,
        name: label.name,
      })),
    };
  }
}
