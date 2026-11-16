import { ApiProperty } from '@nestjs/swagger';

import { FoodOrderStatus } from '../enums/food-order-status.enum.js';

export class OrderStatusTransitionResponseDto {
  @ApiProperty({ format: 'uuid' })
  orderId!: string;

  @ApiProperty({ enum: FoodOrderStatus })
  previousStatus!: FoodOrderStatus;

  @ApiProperty({ enum: FoodOrderStatus })
  status!: FoodOrderStatus;

  @ApiProperty({
    description: 'False for an idempotent repeat of the current state.',
  })
  changed!: boolean;
}
