import { ApiProperty } from '@nestjs/swagger';

/** OpenAPI metadata; strict runtime validation is in ordering-enabled.validation.ts. */
export class UpdateOrderingEnabledDto {
  @ApiProperty({ type: Boolean, example: false })
  orderingEnabled!: boolean;
}
