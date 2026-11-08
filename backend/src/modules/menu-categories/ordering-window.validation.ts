import { BadRequestException } from '@nestjs/common';

import {
  type CategoryWriteFields,
  validateCategoryUpdate,
} from './menu-category-write.validation.js';

/**
 * This endpoint edits only the two approved TIME columns. Reuse R-05's
 * canonical HH:mm[:ss], same-day boundary and partial-update validation.
 * Other category fields belong to the existing category PATCH endpoint.
 */
export function validateOrderingWindowPatch(
  value: unknown,
  current: CategoryWriteFields,
): Partial<Pick<CategoryWriteFields, 'orderStartTime' | 'orderCutoffTime'>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadRequestException('Expected a JSON object');
  }
  const body = value as Record<string, unknown>;
  const unknown = Object.keys(body).find(
    (key) => key !== 'orderStartTime' && key !== 'orderCutoffTime',
  );
  if (unknown) {
    throw new BadRequestException(
      `Unexpected ordering-window field: ${unknown}`,
    );
  }
  return validateCategoryUpdate(body, current);
}
