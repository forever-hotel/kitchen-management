import { ApiProperty } from '@nestjs/swagger';

import { MenuItemStockStatus } from '../enums/menu-item-stock-status.enum.js';
import { MenuItemAllergenResponseDto } from './menu-item-allergen-response.dto.js';
import { MenuItemCategoryResponseDto } from './menu-item-category-response.dto.js';
import { MenuItemDietaryLabelResponseDto } from './menu-item-dietary-label-response.dto.js';

export class MenuItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  menuItemId!: string;

  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty({ type: () => MenuItemCategoryResponseDto })
  category!: MenuItemCategoryResponseDto;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty({
    type: Number,
    description:
      'Raw integer from KMS database; currency unit not yet agreed with FOSS.',
  })
  price!: number;

  @ApiProperty({
    type: Number,
    description: 'Estimated preparation duration in minutes.',
  })
  preparationTime!: number;

  @ApiProperty({ type: Number })
  portionLimit!: number;

  @ApiProperty({ enum: MenuItemStockStatus })
  stockStatus!: MenuItemStockStatus;

  @ApiProperty({ nullable: true, type: String })
  imageUrl!: string | null;

  @ApiProperty({ type: () => MenuItemAllergenResponseDto, isArray: true })
  allergens!: MenuItemAllergenResponseDto[];

  @ApiProperty({ type: () => MenuItemDietaryLabelResponseDto, isArray: true })
  dietaryLabels!: MenuItemDietaryLabelResponseDto[];
}
