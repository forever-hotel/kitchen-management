import { ApiProperty } from '@nestjs/swagger';

import { FoodOrderStatus } from '../enums/food-order-status.enum.js';

export class CreateOrderResponseDto {
  @ApiProperty({ format: 'uuid' })
  orderId!: string;

  @ApiProperty({ enum: FoodOrderStatus })
  status!: FoodOrderStatus;

  @ApiProperty({
    type: Number,
    description: 'Total in the approved integer money unit.',
  })
  totalAmount!: number;

  @ApiProperty({
    description:
      'True if an existing order was returned for an identical retry.',
  })
  replayed!: boolean;
}
