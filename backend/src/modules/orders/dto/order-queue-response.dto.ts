import { ApiProperty } from '@nestjs/swagger';

import { FoodOrderResponseDto } from './order-response.dto.js';

export class OrderQueueResponseDto {
  @ApiProperty({ type: () => FoodOrderResponseDto, isArray: true })
  items!: FoodOrderResponseDto[];

  @ApiProperty({ minimum: 0 })
  total!: number;

  @ApiProperty({ minimum: 0 })
  offset!: number;

  @ApiProperty({ minimum: 1, maximum: 100 })
  limit!: number;
}
