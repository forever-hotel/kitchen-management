import { ApiProperty } from '@nestjs/swagger';

export class KotPreviewItemDto {
  @ApiProperty({ format: 'uuid' })
  orderItemId!: string;

  @ApiProperty({ description: 'Saved item name snapshot' })
  name!: string;

  @ApiProperty({ minimum: 1 })
  quantity!: number;

  @ApiProperty({ nullable: true, type: String })
  specialNote!: string | null;
}
