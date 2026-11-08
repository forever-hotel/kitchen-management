import { BadRequestException } from '@nestjs/common';

import { FoodOrderStatus } from './enums/food-order-status.enum.js';

const activeStatuses = [
  FoodOrderStatus.PLACED,
  FoodOrderStatus.IN_PREPARATION,
  FoodOrderStatus.READY,
];

export interface ParsedOrderQueueQuery {
  statuses: FoodOrderStatus[];
  limit: number;
  offset: number;
}

function parseInteger(
  value: unknown,
  name: string,
  fallback: number,
  max: number,
): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value)) {
    throw new BadRequestException(`${name} must be a non-negative integer`);
  }
  const parsed = Number(value);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed > max ||
    (name === 'limit' && parsed < 1)
  ) {
    throw new BadRequestException(`${name} is outside the supported range`);
  }
  return parsed;
}

export function parseOrderQueueQuery(
  query: Record<string, unknown>,
): ParsedOrderQueueQuery {
  const allowed = ['status', 'limit', 'offset'];
  if (Object.keys(query).some((key) => !allowed.includes(key))) {
    throw new BadRequestException('Unsupported Order Queue query parameter');
  }

  const { status } = query;
  if (
    status !== undefined &&
    (typeof status !== 'string' ||
      !activeStatuses.some((supported) => supported === status))
  ) {
    throw new BadRequestException(
      'Only active kitchen order statuses can be filtered',
    );
  }

  return {
    statuses:
      status === undefined ? [...activeStatuses] : [status as FoodOrderStatus],
    limit: parseInteger(query.limit, 'limit', 20, 100),
    offset: parseInteger(query.offset, 'offset', 0, 1_000_000),
  };
}
