import { ApiProperty } from '@nestjs/swagger';

/** The category is the single source of truth; no separate window table. */
export class OrderingWindowResponseDto {
  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({
    example: '11:30:00',
    description: 'Hotel local time, Asia/Colombo',
  })
  orderStartTime!: string;

  @ApiProperty({
    example: '14:30:00',
    description: 'Hotel local time, Asia/Colombo',
  })
  orderCutoffTime!: string;

  @ApiProperty({ example: 'Asia/Colombo' })
  timeZone!: 'Asia/Colombo';
}
