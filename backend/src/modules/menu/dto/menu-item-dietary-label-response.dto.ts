import { ApiProperty } from '@nestjs/swagger';

export class MenuItemDietaryLabelResponseDto {
  @ApiProperty({ format: 'uuid' })
  dietaryLabelId!: string;

  @ApiProperty()
  name!: string;
}
