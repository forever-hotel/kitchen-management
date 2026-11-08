import { BadRequestException } from '@nestjs/common';

/** A separate PATCH endpoint preserves the existing time-only update contract. */
export function validateOrderingEnabledChange(value: unknown): {
  orderingEnabled: boolean;
} {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadRequestException(
      'Expected an ordering availability JSON object',
    );
  }
  const body = value as Record<string, unknown>;
  if (
    Object.keys(body).length !== 1 ||
    typeof body.orderingEnabled !== 'boolean'
  ) {
    throw new BadRequestException(
      'Expected exactly one boolean orderingEnabled field',
    );
  }
  return { orderingEnabled: body.orderingEnabled };
}
