import { ApiPropertyOptional } from '@nestjs/swagger';

/** Partial update: at least one supported property must be present. */
export class UpdateMealCategoryDto {
  @ApiPropertyOptional({ maxLength: 100, example: 'Dinner' })
  name?: string;

  @ApiPropertyOptional({
    example: '18:00:00',
    description: 'Local hotel time (HH:mm or HH:mm:ss)',
  })
  orderStartTime?: string;

  @ApiPropertyOptional({
    example: '22:00:00',
    description: 'Local hotel time (HH:mm or HH:mm:ss)',
  })
  orderCutoffTime?: string;
}
