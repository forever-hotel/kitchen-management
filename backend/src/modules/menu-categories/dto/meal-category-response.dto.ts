import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MealCategoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({
    example: '06:00:00',
    description: 'Database TIME value in local hotel time.',
  })
  orderStartTime!: string;

  @ApiProperty({
    example: '10:30:00',
    description: 'Database TIME value in local hotel time.',
  })
  orderCutoffTime!: string;

  @ApiPropertyOptional({
    description: 'Saved manager-controlled availability flag',
  })
  orderingEnabled?: boolean;
}
