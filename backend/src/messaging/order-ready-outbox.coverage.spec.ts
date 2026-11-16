import { EventEmitter } from 'node:events';
import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import type { DataSource, EntityManager } from 'typeorm';

import { OrderReadyOutboxService } from './order-ready-outbox.service.js';

const foodOrderId = 'c4cb0f05-0021-51a4-8a5f-5715b04044fe';
const row = {
  foodOrderId,
  roomNumber: '204',
  occurredAt: '2026-11-08T12:00:00.000Z',
};

type Mode = 'confirmed' | 'returned' | 'rejected' | 'connection-error';

function setup({
  enabled = true,
  mode = 'confirmed',
  rows = [row],
}: {
  enabled?: boolean;
  mode?: Mode;
  rows?: (typeof row)[];
} = {}) {
  const queries: { sql: string; params?: unknown[] }[] = [];
  const query = jest.fn(
    async (sql: string, params?: unknown[]): Promise<(typeof row)[]> => {
      queries.push({ sql, params });
      return sql.includes('SELECT food_order_id') ? rows : [];
    },
  );
  const manager = { query } as unknown as EntityManager;
  const transaction = jest.fn(
    async (operation: (m: EntityManager) => Promise<void>) =>
      operation(manager),
  );
  const source = { transaction } as unknown as DataSource;
  const config = {
    get: (name: string) => {
      if (name === 'KMS_ORDER_READY_ENABLED') return enabled ? 'true' : 'false';
      if (name === 'KMS_RABBITMQ_URL') return 'amqp://localhost:5672';
      return undefined;
    },
  } as unknown as ConfigService;
  const service = new OrderReadyOutboxService(source, config);
  const channel = Object.assign(new EventEmitter(), {
    waitForConfirms: jest.fn(async () => {
      if (mode === 'rejected') throw new Error('Broker nack');
    }),
    publish: jest.fn(
      (
        ...[, , body, props]: [string, string, Buffer, { messageId: string }]
      ) => {
        expect(JSON.parse(body.toString('utf8'))).toMatchObject({
          eventType: 'order.ready',
          data: { foodOrderId, roomNumber: '204' },
        });
        if (mode === 'returned') {
          channel.emit('return', {
            properties: { messageId: props.messageId },
          });
        }
        return true;
      },
    ),
    close: jest.fn(async () => undefined),
  });
  if (mode === 'connection-error') {
    Object.assign(service, {
      ensureChannel: async () => {
        throw new Error('Disconnected');
      },
    });
  } else {
    Object.assign(service, { ensureChannel: async () => channel });
  }
  return { service, channel, query, queries, transaction };
}

describe('KMS order-ready transactional outbox: delivery and recovery', () => {
  it('does not access the database when publication is disabled', async () => {
    const f = setup({ enabled: false });
    await f.service.flush();
    expect(f.transaction).not.toHaveBeenCalled();
    f.service.onModuleInit();
    await f.service.onModuleDestroy();
  });

  it('processes an empty pending batch without connecting to RabbitMQ', async () => {
    const f = setup({ rows: [] });
    await f.service.flush();
    expect(f.channel.publish).not.toHaveBeenCalled();
    expect(f.queries).toHaveLength(1);
  });

  it('publishes durable, mandatory event and marks the exact order delivered', async () => {
    const f = setup();
    await f.service.flush();
    expect(f.channel.publish).toHaveBeenCalledWith(
      'forever.events',
      'kms.order.ready.v1',
      expect.any(Buffer),
      expect.objectContaining({
        persistent: true,
        mandatory: true,
        contentType: 'application/json',
        messageId: `order-ready:${foodOrderId}`,
      }),
    );
    expect(f.query).toHaveBeenCalledWith(
      expect.stringContaining('SET published_at = NOW()'),
      [foodOrderId],
    );
    expect(f.channel.listenerCount('return')).toBe(0);
    expect(f.channel.waitForConfirms).toHaveBeenCalledTimes(1);
  });

  it.each(['returned', 'rejected', 'connection-error'] as const)(
    'retains the message for retry after %s',
    async (mode) => {
      const f = setup({ mode });
      await f.service.flush();
      expect(f.query).toHaveBeenCalledWith(
        expect.stringContaining('next_attempt_at = NOW()'),
        [foodOrderId],
      );
      expect(
        f.queries.some((entry) =>
          entry.sql.includes('SET published_at = NOW()'),
        ),
      ).toBe(false);
      expect(f.channel.listenerCount('return')).toBe(0);
    },
  );

  it('stops the batch after the first failed event, rather than skipping it', async () => {
    const second = {
      ...row,
      foodOrderId: '10e394a6-a4e2-4d77-bbc6-3a2c8df27a29',
    };
    const f = setup({ mode: 'rejected', rows: [row, second] });
    await f.service.flush();
    expect(
      f.query.mock.calls.filter(([sql]) =>
        sql.includes('SET attempts = attempts + 1'),
      ),
    ).toHaveLength(1);
    expect(f.channel.publish).toHaveBeenCalledTimes(1);
  });

  it('does not start a second overlapping flush while one is in progress', async () => {
    const f = setup();
    Object.assign(f.service, { processing: true });
    await f.service.flush();
    expect(f.transaction).not.toHaveBeenCalled();
    Object.assign(f.service, { processing: false });
    await f.service.flush();
    expect(f.transaction).toHaveBeenCalledTimes(1);
  });

  it('releases the processing guard even if the transaction rejects', async () => {
    const f = setup();
    f.transaction.mockRejectedValueOnce(new Error('Database unavailable'));
    await expect(f.service.flush()).rejects.toThrow('Database unavailable');
    await f.service.flush();
    expect(f.transaction).toHaveBeenCalledTimes(2);
  });

  it('refuses enabled mode without a configured RabbitMQ address', () => {
    const config = {
      get: (key: string) =>
        key === 'KMS_ORDER_READY_ENABLED' ? 'true' : undefined,
    } as unknown as ConfigService;
    const svc = new OrderReadyOutboxService({} as DataSource, config);
    expect(() => svc.onModuleInit()).toThrow('KMS_RABBITMQ_URL');
  });

  it('starts the enabled publisher on a timer and stops it cleanly at shutdown', async () => {
    const f = setup({ rows: [] });
    const flush = jest.spyOn(f.service, 'flush').mockResolvedValue(undefined);
    try {
      expect(() => f.service.onModuleInit()).not.toThrow();
      expect(flush).toHaveBeenCalledTimes(1);
    } finally {
      await f.service.onModuleDestroy();
      flush.mockRestore();
    }
  });

  it('stops publication permanently after module destruction', async () => {
    const f = setup();
    await f.service.onModuleDestroy();
    await f.service.flush();
    expect(f.transaction).not.toHaveBeenCalled();
  });
});
