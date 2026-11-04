import { Injectable, NotFoundException } from '@nestjs/common';
import { MenuItem } from './entities/menu-item.entity.js';
import { MenuItemResponseDto } from './dto/menu-item-response.dto.js';
import { MenuItemRepository } from './repositories/menu-item.repository.js';

@Injectable()
export class MenuService {
  constructor(private readonly menuItems: MenuItemRepository) {}

  async listItems(): Promise<MenuItemResponseDto[]> {
    const items = await this.menuItems.findAll();
    return items.map((item) => this.toResponse(item));
  }

  async getItem(menuItemId: string): Promise<MenuItemResponseDto> {
    const item = await this.menuItems.findById(menuItemId);
    if (!item) {
      throw new NotFoundException('Menu item not found');
    }
    return this.toResponse(item);
  }

  private toResponse(item: MenuItem): MenuItemResponseDto {
    // The category is NOT NULL in the canonical KMS schema. The repository
    // must load this relation; a missing one is a data/query integrity error.
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
