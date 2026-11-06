import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { MenuItemStockStatus } from '../enums/menu-item-stock-status.enum.js';

/** Documentation shape. Runtime validation is performed by menu-item-write.validation.ts. */
export class CreateMenuItemDto {
  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty({ maxLength: 255, example: 'Vegetable Fried Rice' })
  name!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 2000 })
  description?: string | null;

  @ApiProperty({
    type: Number,
    minimum: 1,
    description: 'Raw integer; FOSS currency unit decision pending.',
  })
  price!: number;

  @ApiProperty({
    type: Number,
    minimum: 1,
    description: 'Preparation time in minutes.',
  })
  preparationTime!: number;

  @ApiPropertyOptional({ type: Number, minimum: 1, default: 5 })
  portionLimit?: number;

  @ApiPropertyOptional({
    enum: MenuItemStockStatus,
    default: MenuItemStockStatus.AVAILABLE,
  })
  stockStatus?: MenuItemStockStatus;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 500,
    description: 'Existing image URL only; no upload endpoint.',
  })
  imageUrl?: string | null;

  @ApiPropertyOptional({
    type: [String],
    description: 'Existing allergen UUIDs. [] for none.',
  })
  allergenIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Existing dietary label UUIDs. [] for none.',
  })
  dietaryLabelIds?: string[];
}
