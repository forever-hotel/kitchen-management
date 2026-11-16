import { ApiProperty } from '@nestjs/swagger';

export class MenuItemAllergenResponseDto {
  @ApiProperty({ format: 'uuid' })
  allergenId!: string;

  @ApiProperty()
  name!: string;
}
