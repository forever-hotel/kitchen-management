import { EventEmitter } from 'node:events';
import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import type { DataSource } from 'typeorm';

import { KitchenEventsService } from './kitchen-events.service.js';

interface EventRow {
  event_id: string;
  name: string;
  payload: Record<string, unknown> | null;
}
const row: EventRow = {
  event_id: 'event-123',
  name: 'menu.changed',
  payload: { categoryId: 'lunch' },
};
type Delivery = 'confirmed' | 'unroutable' | 'nack';

function harness(delivery: Delivery = 'confirmed', rows: EventRow[] = [row]) {
  const query = jest.fn(async (sql: string): Promise<(typeof row)[]> =>
    sql.includes('SELECT event_id') ? rows : [],
  );
  const manager = { query };
  const transaction = jest.fn(
    async (work: (db: typeof manager) => Promise<void>) => work(manager),
  );
  const database = { transaction } as unknown as DataSource;
  const config = {
    get: (key: string) =>
      key === 'KMS_REALTIME_ENABLED' ? 'false' : undefined,
  } as unknown as ConfigService;
  const service = new KitchenEventsService(database, config);
  const channel = Object.assign(new EventEmitter(), {
    publish: jest.fn(
      (
        ...[, , , , confirm]: [
          string,
          string,
          Buffer,
          unknown,
          (error: Error | null) => void,
        ]
      ) => {
        if (delivery === 'unroutable') channel.emit('return');
        confirm(
          delivery === 'nack' ? new Error('Broker declined message') : null,
        );
        return true;
      },
    ),
  });
  const connection = { close: jest.fn(async () => undefined) };
  Object.assign(service, { ensureChannel: async () => channel, connection });
  return { service, channel, query, transaction, connection };
}

describe('Kitchen realtime outbox recovery paths', () => {
  it('publishes a stock event to analytics and a realtime event to the kitchen stream', async () => {
    const f = harness();
    await f.service.flush();
    expect(f.channel.publish).toHaveBeenCalledTimes(2);
    expect(f.channel.publish).toHaveBeenNthCalledWith(
      1,
      'hotel.events',
      'kitchen.stock.changed',
      expect.any(Buffer),
      expect.objectContaining({ persistent: true, mandatory: true }),
      expect.any(Function),
    );
    expect(f.channel.publish).toHaveBeenNthCalledWith(
      2,
      'hotel.realtime',
      'kms.menu.changed',
      expect.any(Buffer),
      expect.objectContaining({ persistent: true, mandatory: true }),
      expect.any(Function),
    );
    expect(f.query).toHaveBeenCalledWith(
      expect.stringContaining('SET published_at = now()'),
      ['event-123'],
    );
    expect(f.channel.listenerCount('return')).toBe(0);
  });

  it('does not publish the stock alert when payload is null', async () => {
    const f = harness('confirmed', [{ ...row, payload: null }]);
    await f.service.flush();
    expect(f.channel.publish).toHaveBeenCalledTimes(1);
    expect(f.channel.publish).toHaveBeenCalledWith(
      'hotel.realtime',
      'kms.menu.changed',
      expect.any(Buffer),
      expect.any(Object),
      expect.any(Function),
    );
  });

  it('does not publish the stock alert for non-menu change events', async () => {
    const f = harness('confirmed', [{ ...row, name: 'order.changed' }]);
    await f.service.flush();
    expect(f.channel.publish).toHaveBeenCalledTimes(1);
    expect(f.channel.publish).toHaveBeenCalledWith(
      'hotel.realtime',
      'kms.order.changed',
      expect.any(Buffer),
      expect.any(Object),
      expect.any(Function),
    );
  });

  it.each(['unroutable', 'nack'] as const)(
    'retains the outbox row and schedules retry after %s',
    async (delivery) => {
      const f = harness(delivery);
      await f.service.flush();
      expect(f.query).toHaveBeenCalledWith(
        expect.stringContaining('attempts = attempts + 1'),
        ['event-123'],
      );
      expect(
        f.query.mock.calls.some(([sql]) => sql.includes('SET published_at')),
      ).toBe(false);
      expect(f.connection.close).toHaveBeenCalledTimes(1);
      expect(f.channel.listenerCount('return')).toBe(0);
    },
  );

  it('processes zero pending events without publishing', async () => {
    const f = harness('confirmed', []);
    await f.service.flush();
    expect(f.channel.publish).not.toHaveBeenCalled();
    expect(f.query).toHaveBeenCalledTimes(1);
  });

  it('reports a database outage without leaving the busy flag locked', async () => {
    const f = harness();
    f.transaction.mockRejectedValueOnce(new Error('DB disconnected'));
    await expect(f.service.flush()).resolves.toBeUndefined();
    await f.service.flush();
    expect(f.transaction).toHaveBeenCalledTimes(2);
  });

  it('does not overlap the transaction while another flush is running', async () => {
    const f = harness();
    Object.assign(f.service, { busy: true });
    await f.service.flush();
    expect(f.transaction).not.toHaveBeenCalled();
    Object.assign(f.service, { busy: false });
    await f.service.flush();
    expect(f.transaction).toHaveBeenCalledTimes(1);
  });

  it('does not retry after the service has stopped and closes broker on destruction', async () => {
    const f = harness();
    await f.service.onModuleDestroy();
    await f.service.flush();
    expect(f.transaction).not.toHaveBeenCalled();
    expect(f.connection.close).toHaveBeenCalledTimes(1);
  });

  it('starts realtime polling only in enabled deployments and cleans up on shutdown', async () => {
    const config = {
      get: (key: string) =>
        key === 'KMS_REALTIME_ENABLED' ? 'true' : undefined,
    } as unknown as ConfigService;
    const service = new KitchenEventsService({} as DataSource, config);
    const flush = jest.spyOn(service, 'flush').mockResolvedValue(undefined);
    try {
      service.onModuleInit();
      expect(flush).toHaveBeenCalledTimes(1);
    } finally {
      await service.onModuleDestroy();
      flush.mockRestore();
    }
  });

  it('does not schedule an interval when realtime delivery is disabled', () => {
    const f = harness();
    const interval = jest.spyOn(globalThis, 'setInterval');
    try {
      f.service.onModuleInit();
      expect(interval).not.toHaveBeenCalled();
    } finally {
      interval.mockRestore();
    }
  });
});
