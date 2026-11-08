import { ApiProperty } from '@nestjs/swagger';

export class FoodOrderItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  orderItemId!: string;

  @ApiProperty({ format: 'uuid' })
  menuItemId!: string;

  @ApiProperty({ description: 'Item name snapshot recorded at order time.' })
  name!: string;

  @ApiProperty({ minimum: 1 })
  quantity!: number;

  @ApiProperty({
    description: 'Raw integer unit-price snapshot from the database.',
  })
  unitPrice!: number;

  @ApiProperty({ type: String, nullable: true })
  specialNote!: string | null;
}
