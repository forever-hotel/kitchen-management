import { ApiProperty } from '@nestjs/swagger';

import type { AllergyWarningSnapshot } from '../allergy-safety.policy.js';

export interface AllergyAcknowledgementRecord {
  acknowledgementId: string;
  acknowledgedBy: string;
  acknowledgedAt: string;
}

export class OrderAllergySafetyResponseDto {
  @ApiProperty({ format: 'uuid' })
  orderId!: string;

  @ApiProperty()
  acknowledgementRequired!: boolean;

  @ApiProperty({
    type: 'object',
    properties: {
      allergyNote: { type: 'string', nullable: true },
      itemAllergens: { type: 'array', items: { type: 'string' } },
      dietaryLabels: { type: 'array', items: { type: 'string' } },
    },
  })
  warnings!: AllergyWarningSnapshot;

  @ApiProperty()
  acknowledged!: boolean;

  @ApiProperty({
    type: 'object',
    nullable: true,
    properties: {
      acknowledgementId: { type: 'string', format: 'uuid' },
      acknowledgedBy: { type: 'string' },
      acknowledgedAt: { type: 'string', format: 'date-time' },
    },
  })
  acknowledgement!: AllergyAcknowledgementRecord | null;
}
