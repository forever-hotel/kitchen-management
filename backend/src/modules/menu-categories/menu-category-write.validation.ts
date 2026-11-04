import { BadRequestException } from '@nestjs/common';

export interface CategoryWriteFields {
  name: string;
  orderStartTime: string;
  orderCutoffTime: string;
}

const allowedKeys: readonly (keyof CategoryWriteFields)[] = [
  'name',
  'orderStartTime',
  'orderCutoffTime',
];

function objectBody(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadRequestException('Expected a JSON object');
  }
  return value as Record<string, unknown>;
}

function checkKeys(body: Record<string, unknown>): void {
  const unknownKeys = Object.keys(body).filter(
    (key) => !allowedKeys.some((allowed) => allowed === key),
  );
  if (unknownKeys.length > 0) {
    throw new BadRequestException(
      `Unexpected category field: ${unknownKeys[0]}`,
    );
  }
}

function readName(value: unknown): string {
  if (typeof value !== 'string') {
    throw new BadRequestException('Category name must be a string');
  }
  const name = value.trim();
  if (name.length === 0 || [...name].length > 100) {
    throw new BadRequestException(
      'Category name must contain 1 to 100 characters',
    );
  }
  return name;
}

function readTime(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} must be a local hotel time`);
  }
  // Explicit 24-hour time; no time zones or implicit date conversions.
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(value);
  if (!match) {
    throw new BadRequestException(
      `${field} must use HH:mm or HH:mm:ss (00:00–23:59)`,
    );
  }
  return `${match[1]}:${match[2]}:${match[3] ?? '00'}`;
}

export function assertSameDayWindow(start: string, cutoff: string): void {
  if (start >= cutoff) {
    throw new BadRequestException(
      'Order cutoff time must be later than start time on the same day',
    );
  }
}

/** No class-validator dependency: validate untrusted request payloads explicitly. */
export function validateCategoryCreate(value: unknown): CategoryWriteFields {
  const body = objectBody(value);
  checkKeys(body);
  const fields: CategoryWriteFields = {
    name: readName(body.name),
    orderStartTime: readTime(body.orderStartTime, 'orderStartTime'),
    orderCutoffTime: readTime(body.orderCutoffTime, 'orderCutoffTime'),
  };
  assertSameDayWindow(fields.orderStartTime, fields.orderCutoffTime);
  return fields;
}

export function validateCategoryUpdate(
  value: unknown,
  current: CategoryWriteFields,
): Partial<CategoryWriteFields> {
  const body = objectBody(value);
  checkKeys(body);
  const keys = Object.keys(body);
  if (keys.length === 0) {
    throw new BadRequestException('At least one category field is required');
  }
  const patch: Partial<CategoryWriteFields> = {};
  if (Object.prototype.hasOwnProperty.call(body, 'name')) {
    patch.name = readName(body.name);
  }
  if (Object.prototype.hasOwnProperty.call(body, 'orderStartTime')) {
    patch.orderStartTime = readTime(body.orderStartTime, 'orderStartTime');
  }
  if (Object.prototype.hasOwnProperty.call(body, 'orderCutoffTime')) {
    patch.orderCutoffTime = readTime(body.orderCutoffTime, 'orderCutoffTime');
  }
  assertSameDayWindow(
    patch.orderStartTime ?? current.orderStartTime,
    patch.orderCutoffTime ?? current.orderCutoffTime,
  );
  return patch;
}
