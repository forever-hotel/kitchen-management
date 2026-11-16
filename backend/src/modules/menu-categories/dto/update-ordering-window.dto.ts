import { ApiPropertyOptional } from '@nestjs/swagger';

/** Runtime validation and saved-boundary check are in ordering-window.validation.ts. */
export class UpdateOrderingWindowDto {
  @ApiPropertyOptional({
    example: '11:30',
    description: '24-hour hotel local time (HH:mm[:ss])',
  })
  orderStartTime?: string;

  @ApiPropertyOptional({
    example: '14:30',
    description: '24-hour hotel local time (HH:mm[:ss])',
  })
  orderCutoffTime?: string;
}
