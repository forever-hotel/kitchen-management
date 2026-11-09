import { EventEmitter } from 'node:events';
import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { KitchenEventsService } from './kitchen-events.service.js';

function fixture(mode: 'confirmed' | 'unroutable' | 'nack') {
  const row = {
    event_id: 'event',
    name: 'kitchen.order.changed',
    payload: null,
  };
  const query = jest
    .fn<(sql: string, params?: unknown[]) => Promise<unknown[]>>()
    .mockImplementation(async (sql) => (sql.startsWith('SELECT') ? [row] : []));
  const database = {
    transaction: async (
      work: (manager: { query: typeof query }) => Promise<unknown>,
    ) => work({ query }),
  } as unknown as DataSource;
  const service = new KitchenEventsService(database, {} as ConfigService);
  const channel = Object.assign(new EventEmitter(), {
    publish: jest.fn(
      (
        _exchange: string,
        _key: string,
        _body: Buffer,
        _options: unknown,
        confirm: (error: Error | null) => void,
      ) => {
        if (mode === 'unroutable') channel.emit('return');
        confirm(mode === 'nack' ? new Error('Broker refused message') : null);
        return true;
      },
    ),
  });
  // Inject a confirmed transport without opening a real broker in unit tests.
  Object.assign(service, { ensureChannel: async () => channel });
  return { service, channel, query };
}

describe('transactional kitchen realtime delivery', () => {
  it('marks published only after a persistent mandatory broker confirmation', async () => {
    const f = fixture('confirmed');
    await f.service.flush();
    expect(f.channel.publish).toHaveBeenCalledWith(
      'hotel.realtime',
      'kms.kitchen.order.changed',
      expect.any(Buffer),
      expect.objectContaining({ persistent: true, mandatory: true }),
      expect.any(Function),
    );
    expect(f.query).toHaveBeenCalledWith(
      expect.stringContaining('SET published_at'),
      ['event'],
    );
    expect(f.channel.listenerCount('return')).toBe(0);
  });

  it.each(['unroutable', 'nack'] as const)(
    'retains intent and schedules retry for %s messages',
    async (mode) => {
      const f = fixture(mode);
      await f.service.flush();
      expect(f.query).toHaveBeenCalledWith(
        expect.stringContaining('attempts = attempts + 1'),
        ['event'],
      );
      expect(
        f.query.mock.calls.some(([sql]) => sql.includes('SET published_at')),
      ).toBe(false);
      expect(f.channel.listenerCount('return')).toBe(0);
    },
  );
});
