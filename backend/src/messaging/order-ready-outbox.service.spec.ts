import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import type { DataSource, EntityManager } from 'typeorm';

import {
  buildOrderReadyEvent,
  OrderReadyOutboxService,
} from './order-ready-outbox.service.js';

const foodOrderId = 'c4cb0f05-0021-51a4-8a5f-5715b04044fe';

function service(enabled: string) {
  const config = {
    get: (key: string) =>
      key === 'KMS_ORDER_READY_ENABLED' ? enabled : undefined,
  } as unknown as ConfigService;
  return new OrderReadyOutboxService({} as DataSource, config);
}

describe('KMS -> WKMS order-ready integration', () => {
  it('creates exactly the fields accepted by the WKMS v1 event contract', () => {
    expect(
      buildOrderReadyEvent({
        foodOrderId,
        roomNumber: '204',
        occurredAt: '2026-11-08T12:00:00.000Z',
      }),
    ).toEqual({
      eventId: `order-ready:${foodOrderId}`,
      eventType: 'order.ready',
      eventVersion: 1,
      occurredAt: '2026-11-08T12:00:00.000Z',
      source: 'kitchen-management',
      data: { foodOrderId, roomNumber: '204' },
    });
  });

  it('records the event in the same transaction as READY when enabled', async () => {
    const statements: { query: string; params: unknown[] | undefined }[] = [];
    const manager = {
      query: async (query: string, params?: unknown[]) => {
        statements.push({ query, params });
        return [];
      },
    } as unknown as EntityManager;
    await service('true').record(manager, foodOrderId, '204');
    expect(statements).toHaveLength(1);
    expect(statements[0]?.query).toContain(
      'ON CONFLICT (food_order_id) DO NOTHING',
    );
    expect(statements[0]?.params).toEqual([foodOrderId, '204']);
  });

  it('does not require an outbox table until messaging is deliberately enabled', async () => {
    const manager = { query: jest.fn() } as unknown as EntityManager;
    await service('false').record(manager, foodOrderId, '204');
    expect(manager.query).not.toHaveBeenCalled();
  });
});
