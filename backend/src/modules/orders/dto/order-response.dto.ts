import { ApiProperty } from '@nestjs/swagger';

import { FoodOrderMealPeriod } from '../enums/food-order-meal-period.enum.js';
import { FoodOrderStatus } from '../enums/food-order-status.enum.js';
import { FoodOrderItemResponseDto } from './food-order-item-response.dto.js';

export class FoodOrderResponseDto {
  @ApiProperty({ format: 'uuid' })
  orderId!: string;

  @ApiProperty({ format: 'uuid' })
  bookingId!: string;

  @ApiProperty()
  roomNumber!: string;

  @ApiProperty({ enum: FoodOrderMealPeriod })
  mealPeriod!: FoodOrderMealPeriod;

  @ApiProperty({ enum: FoodOrderStatus })
  status!: FoodOrderStatus;

  @ApiProperty({ format: 'date-time' })
  placedAt!: string;

  @ApiProperty({ format: 'date-time', nullable: true, type: String })
  estimatedDeliveryTime!: string | null;

  @ApiProperty({ type: String, nullable: true })
  allergyNote!: string | null;

  @ApiProperty({ description: 'Raw integer total stored in KMS.' })
  totalAmount!: number;

  @ApiProperty({ type: () => FoodOrderItemResponseDto, isArray: true })
  items!: FoodOrderItemResponseDto[];
}
