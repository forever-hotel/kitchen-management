import { ApiProperty } from '@nestjs/swagger';

import { FoodOrderMealPeriod } from '../enums/food-order-meal-period.enum.js';
import { FoodOrderStatus } from '../enums/food-order-status.enum.js';
import { KotPreviewItemDto } from './kot-preview-item.dto.js';

/** This is order content only; no persisted KOT print job exists yet. */
export class KotPreviewDto {
  @ApiProperty({ enum: ['PREVIEW_ONLY'] })
  mode!: 'PREVIEW_ONLY';

  @ApiProperty({
    format: 'uuid',
    description: 'Food-order reference, not a print-job ID',
  })
  orderId!: string;

  @ApiProperty()
  roomNumber!: string;

  @ApiProperty({ enum: FoodOrderMealPeriod })
  mealPeriod!: FoodOrderMealPeriod;

  @ApiProperty({ enum: FoodOrderStatus })
  status!: FoodOrderStatus;

  @ApiProperty({ format: 'date-time' })
  placedAt!: string;

  @ApiProperty({ nullable: true, type: String })
  allergyNote!: string | null;

  @ApiProperty({ type: () => KotPreviewItemDto, isArray: true })
  items!: KotPreviewItemDto[];
}
