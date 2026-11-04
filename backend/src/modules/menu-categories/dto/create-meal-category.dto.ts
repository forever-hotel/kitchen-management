import { ApiProperty } from '@nestjs/swagger';

/** Request shape for creating a meal category; runtime validation is in the service. */
export class CreateMealCategoryDto {
  @ApiProperty({ maxLength: 100, example: 'Lunch' })
  name!: string;

  @ApiProperty({
    example: '11:30:00',
    description: 'Local hotel time (HH:mm or HH:mm:ss)',
  })
  orderStartTime!: string;

  @ApiProperty({
    example: '14:30:00',
    description: 'Local hotel time (HH:mm or HH:mm:ss)',
  })
  orderCutoffTime!: string;
}
