import { ApiProperty } from '@nestjs/swagger';

export class MenuItemCategoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty()
  name!: string;
}
