import { BadRequestException } from '@nestjs/common';

import { FoodOrderStatus } from './enums/food-order-status.enum.js';
import { parseOrderQueueQuery } from './order-queue-query.js';

describe('Order Queue query validation (DDP-258)', () => {
  it('defaults to three active statuses and a bounded first page', () => {
    expect(parseOrderQueueQuery({})).toEqual({
      statuses: [
        FoodOrderStatus.PLACED,
        FoodOrderStatus.IN_PREPARATION,
        FoodOrderStatus.READY,
      ],
      limit: 20,
      offset: 0,
    });
  });

  it('accepts a specific active status and valid pagination', () => {
    expect(
      parseOrderQueueQuery({ status: 'READY', limit: '50', offset: '5' }),
    ).toEqual({
      statuses: [FoodOrderStatus.READY],
      limit: 50,
      offset: 5,
    });
  });

  it.each([
    { status: 'DELIVERED' },
    { status: 'CANCELLED' },
    { status: 'READY,PLACED' },
    { status: ['PLACED', 'READY'] },
    { limit: '0' },
    { limit: '101' },
    { limit: '-1' },
    { limit: '1.5' },
    { offset: '-1' },
    { offset: '1000001' },
    { offset: 'NaN' },
    { unknown: 'true' },
  ])('rejects invalid query: %j', (query) => {
    expect(() => parseOrderQueueQuery(query)).toThrow(BadRequestException);
  });
});
